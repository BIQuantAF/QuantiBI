const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { authenticateUser } = require('../middleware/auth');
const Database = require('../models/Database');
const Workspace = require('../models/Workspace');
const Dataset = require('../models/Dataset');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

/**
 * @route   POST /api/workspaces/:workspaceId/databases
 * @desc    Connect a new database to a workspace
 * @access  Private
 */
router.post('/:workspaceId/databases', authenticateUser, upload.single('file'), async (req, res) => {
  try {
    console.log('Received database connection request:', {
      workspaceId: req.params.workspaceId,
      body: req.body,
      file: req.file,
      files: req.files,
      headers: req.headers['content-type']
    });

    const workspace = await Workspace.findById(req.params.workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const {
      type,
      name,
      displayName,
      host,
      port,
      databaseName,
      username,
      password,
      projectId,
      datasetId,
      credentials,
      spreadsheetUrl,
      sheetName
    } = req.body;

    // Validate required fields based on type
    if (!type || !name || !displayName) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['type', 'name', 'displayName']
      });
    }

    // Handle file uploads
    let filePath = null;
    let fileType = null;
    console.log('File upload debug:', {
      hasFile: !!req.file,
      file: req.file,
      hasFiles: !!req.files,
      files: req.files
    });
    
    if (req.file) {
      filePath = req.file.path;
      fileType = req.file.mimetype;
      console.log('File uploaded:', { filePath, fileType });
    } else {
      console.log('No file uploaded - req.file is null');
    }

    const database = new Database({
      workspace: workspace._id,
      type,
      name,
      displayName,
      host,
      port: port ? parseInt(port) : undefined,
      databaseName,
      username,
      password,
      projectId,
      datasetId,
      credentials,
      spreadsheetUrl,
      sheetName,
      filePath,
      fileType
    });

    console.log('Creating database:', database);
    await database.save();
    console.log('Database created successfully');

    // Automatically create a dataset for file-based databases
    if (type === 'XLS' || type === 'CSV') {
      try {
        const dataset = new Dataset({
          workspace: workspace._id,
          name: displayName,
          type: 'Physical',
          database: database._id,
          schema: type === 'XLS' ? (sheetName || 'Sheet1') : 'default',
          table: type === 'XLS' ? (sheetName || 'Sheet1') : 'data',
          owners: [req.user.uid]
        });
        
        await dataset.save();
        console.log('Auto-created dataset for file database:', dataset.name);
      } catch (datasetError) {
        console.error('Error creating auto-dataset:', datasetError);
        // Don't fail the database creation if dataset creation fails
      }
    }

    res.status(201).json(database);
  } catch (error) {
    console.error('Error connecting database:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases
 * @desc    Get all databases for a workspace
 * @access  Private
 */
router.get('/:workspaceId/databases', authenticateUser, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const databases = await Database.find({ workspace: workspace._id });
    res.json(databases);
  } catch (error) {
    console.error('Error fetching databases:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/databases/:databaseId
 * @desc    Delete a database connection
 * @access  Private
 */
router.delete('/:workspaceId/databases/:databaseId', authenticateUser, async (req, res) => {
  try {
    console.log('Deleting database:', {
      workspaceId: req.params.workspaceId,
      databaseId: req.params.databaseId
    });

    const workspace = await Workspace.findById(req.params.workspaceId);
    
    if (!workspace) {
      console.log('Workspace not found:', req.params.workspaceId);
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const database = await Database.findOne({
      _id: req.params.databaseId,
      workspace: workspace._id
    });

    if (!database) {
      console.log('Database not found:', req.params.databaseId);
      return res.status(404).json({ message: 'Database not found' });
    }

    // Delete associated datasets first
    const deleteDatasetsResult = await Dataset.deleteMany({
      workspace: workspace._id,
      database: database._id
    });
    console.log('Deleted associated datasets:', deleteDatasetsResult.deletedCount);

    // Delete associated file if it exists
    if (database.filePath && fs.existsSync(database.filePath)) {
      try {
        fs.unlinkSync(database.filePath);
        console.log('Deleted associated file:', database.filePath);
      } catch (fileError) {
        console.error('Error deleting file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Delete the database
    const result = await Database.deleteOne({ _id: req.params.databaseId });
    
    if (result.deletedCount === 0) {
      console.log('No database was deleted');
      return res.status(404).json({ message: 'Database not found' });
    }

    console.log('Database deleted successfully');
    res.json({ 
      message: 'Database deleted successfully',
      deletedDatasets: deleteDatasetsResult.deletedCount
    });
  } catch (error) {
    console.error('Error deleting database:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases/:databaseId/schemas
 * @desc    Get available schemas for a database
 * @access  Private
 */
router.get('/:workspaceId/databases/:databaseId/schemas', authenticateUser, async (req, res) => {
  try {
    console.log('Fetching schemas for database:', {
      workspaceId: req.params.workspaceId,
      databaseId: req.params.databaseId
    });

    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      console.log('Workspace not found:', req.params.workspaceId);
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const database = await Database.findOne({
      _id: req.params.databaseId,
      workspace: workspace._id
    });

    if (!database) {
      console.log('Database not found:', req.params.databaseId);
      return res.status(404).json({ message: 'Database not found' });
    }

    console.log('Found database:', {
      id: database._id,
      type: database.type,
      name: database.name
    });

    let schemas = [];
    
    switch (database.type) {
      case 'XLS':
      case 'CSV':
        // For file-based databases, we'll use the file name as the schema
        if (database.filePath && fs.existsSync(database.filePath)) {
          schemas = [path.basename(database.filePath, path.extname(database.filePath))];
          console.log('Found schemas for file:', schemas);
        } else {
          console.log('File not found:', database.filePath);
        }
        break;
      case 'Google BigQuery':
        // Use the dataset ID as the schema
        schemas = [database.datasetId];
        break;
      case 'Google Sheets':
        // Use the sheet name as the schema
        schemas = [database.sheetName];
        break;
      default:
        // For traditional databases, fetch schemas from the database
        // This would require implementing database-specific connection logic
        schemas = ['public']; // Default schema for now
    }

    console.log('Returning schemas:', schemas);
    res.json(schemas);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases/:databaseId/tables
 * @desc    Get available tables for a database schema
 * @access  Private
 */
router.get('/:workspaceId/databases/:databaseId/tables', authenticateUser, async (req, res) => {
  try {
    console.log('Fetching tables for database:', {
      workspaceId: req.params.workspaceId,
      databaseId: req.params.databaseId,
      schema: req.query.schema
    });

    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      console.log('Workspace not found:', req.params.workspaceId);
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const database = await Database.findOne({
      _id: req.params.databaseId,
      workspace: workspace._id
    });

    if (!database) {
      console.log('Database not found:', req.params.databaseId);
      return res.status(404).json({ message: 'Database not found' });
    }

    console.log('Found database:', {
      id: database._id,
      type: database.type,
      name: database.name
    });

    let tables = [];
    
    switch (database.type) {
      case 'XLS':
        if (database.filePath && fs.existsSync(database.filePath)) {
          const workbook = xlsx.readFile(database.filePath);
          tables = workbook.SheetNames;
          console.log('Found tables in Excel file:', tables);
        } else {
          console.log('Excel file not found:', database.filePath);
        }
        break;
      case 'CSV':
        if (database.filePath && fs.existsSync(database.filePath)) {
          // For CSV, we'll use the file name as the table name
          tables = [path.basename(database.filePath, '.csv')];
          console.log('Found table for CSV file:', tables);
        } else {
          console.log('CSV file not found:', database.filePath);
        }
        break;
      case 'Google BigQuery':
        // Fetch tables from BigQuery dataset
        // This would require implementing BigQuery client
        tables = ['table1', 'table2']; // Placeholder
        break;
      case 'Google Sheets':
        // Use the sheet name as the table name
        tables = [database.sheetName];
        break;
      default:
        // For traditional databases, fetch tables from the schema
        // This would require implementing database-specific connection logic
        tables = ['table1', 'table2']; // Placeholder
    }

    console.log('Returning tables:', tables);
    res.json(tables);
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router; 