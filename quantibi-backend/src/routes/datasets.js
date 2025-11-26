const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Dataset = require('../models/Dataset');
const Workspace = require('../models/Workspace');
const Database = require('../models/Database');
const bigqueryService = require('../services/bigquery');
const s3Service = require('../services/s3');
const duckdbService = require('../services/duckdb');
const fs = require('fs');

/**
 * @route   GET /api/workspaces/:workspaceId/datasets
 * @desc    Get all datasets for a workspace
 * @access  Private
 */
router.get('/:workspaceId/datasets', authenticateUser, async (req, res) => {
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

    const datasets = await Dataset.find({ workspace: workspace._id }).populate('database');
    res.json(datasets);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/datasets
 * @desc    Create a new dataset
 * @access  Private
 */
router.post('/:workspaceId/datasets', authenticateUser, async (req, res) => {
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

    const { name, type, databaseId, schema, table } = req.body;

    // Validate required fields
    if (!name || !type || !databaseId || !schema || !table) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['name', 'type', 'databaseId', 'schema', 'table']
      });
    }

    // Get the database to validate BigQuery datasets/tables
    const database = await Database.findById(databaseId);
    if (!database) {
      return res.status(404).json({ message: 'Database not found' });
    }

    // For BigQuery, validate that the dataset and table exist
    if (database.type === 'Google BigQuery') {
      try {
        const validation = await bigqueryService.validateDatasetAndTable(
          database.projectId,
          database.credentials,
          schema,
          table
        );
        
        if (!validation.exists) {
          return res.status(400).json({
            message: 'BigQuery dataset or table validation failed',
            details: validation.message,
            dataset: schema,
            table: table,
            project: database.projectId
          });
        }
      } catch (error) {
        console.error('Error validating BigQuery dataset/table:', error);
        return res.status(500).json({
          message: 'Error validating BigQuery dataset/table',
          error: error.message
        });
      }
    }

    const dataset = new Dataset({
      workspace: workspace._id,
      name,
      type,
      database: databaseId,
      schema,
      table,
      owners: [req.user.uid]
    });

    await dataset.save();
    res.status(201).json(dataset);
  } catch (error) {
    console.error('Error creating dataset:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/datasets/:datasetId
 * @desc    Delete a dataset
 * @access  Private
 */
router.delete('/:workspaceId/datasets/:datasetId', authenticateUser, async (req, res) => {
  try {
    console.log('Deleting dataset:', {
      workspaceId: req.params.workspaceId,
      datasetId: req.params.datasetId
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

    // Check if dataset exists and belongs to the workspace
    const dataset = await Dataset.findOne({
      _id: req.params.datasetId,
      workspace: workspace._id
    });

    if (!dataset) {
      console.log('Dataset not found:', req.params.datasetId);
      return res.status(404).json({ message: 'Dataset not found' });
    }

    // Delete the dataset
    const result = await Dataset.deleteOne({ 
      _id: req.params.datasetId,
      workspace: workspace._id // Ensure we only delete from the correct workspace
    });
    
    if (result.deletedCount === 0) {
      console.log('No dataset was deleted');
      return res.status(404).json({ message: 'Dataset not found' });
    }

    console.log('Dataset deleted successfully');
    res.json({ message: 'Dataset deleted successfully' });
  } catch (error) {
    console.error('Error deleting dataset:', error);
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

    // Get the database to determine available schemas
    const database = await Database.findById(req.params.databaseId);
    if (!database) {
      return res.status(404).json({ message: 'Database not found' });
    }

    // For BigQuery, fetch actual datasets (schemas)
    if (database.type === 'Google BigQuery') {
      try {
        const datasets = await bigqueryService.listDatasets(database.projectId, database.credentials);
        res.json(datasets);
      } catch (error) {
        console.error('Error fetching BigQuery datasets:', error);
        res.status(500).json({ message: 'Error fetching BigQuery datasets', error: error.message });
      }
    }
    // For file-based databases, return the sheet name or default schema
    else if (database.type === 'XLS') {
      const schemas = [database.sheetName || 'Sheet1'];
      res.json(schemas);
    } else if (database.type === 'CSV') {
      const schemas = ['default'];
      res.json(schemas);
    } else {
      // For other database types, return default schemas
      const schemas = ['default', 'public'];
      res.json(schemas);
    }
  } catch (error) {
    console.error('Error fetching schemas:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases/:databaseId/tables
 * @desc    Get available tables for a database and schema
 * @access  Private
 */
router.get('/:workspaceId/databases/:databaseId/tables', authenticateUser, async (req, res) => {
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

    const { schema } = req.query;
    
    // Get the database to determine available tables
    const database = await Database.findById(req.params.databaseId);
    if (!database) {
      return res.status(404).json({ message: 'Database not found' });
    }

    // For BigQuery, fetch actual tables from the specified dataset (schema)
    if (database.type === 'Google BigQuery') {
      if (!schema) {
        return res.status(400).json({ message: 'Schema parameter is required for BigQuery' });
      }
      try {
        const tables = await bigqueryService.listTables(database.projectId, database.credentials, schema);
        res.json(tables);
      } catch (error) {
        console.error('Error fetching BigQuery tables:', error);
        res.status(500).json({ message: 'Error fetching BigQuery tables', error: error.message });
      }
    }
    // For file-based databases, return the sheet name or default table
    else if (database.type === 'XLS') {
      const tables = [database.sheetName || 'Sheet1'];
      res.json(tables);
    } else if (database.type === 'CSV') {
      const tables = ['data'];
      res.json(tables);
    } else {
      // For other database types, return default tables
      const tables = ['data', 'Sheet1', 'Sheet2', 'Sheet3'];
      res.json(tables);
    }
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases/:databaseId/schema
 * @desc    Get the schema (column information) for a file-based database using DuckDB
 * @access  Private
 */
router.get('/:workspaceId/databases/:databaseId/schema', authenticateUser, async (req, res) => {
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

    const database = await Database.findById(req.params.databaseId);
    if (!database) {
      return res.status(404).json({ message: 'Database not found' });
    }

    // Schema detection only works for file-based databases
    if (database.type !== 'XLS' && database.type !== 'CSV') {
      return res.status(400).json({ message: 'Schema detection only available for CSV and Excel files' });
    }

    let filePath = null;
    
    try {
      // Use S3 if available, otherwise fall back to local file path
      if (database.s3Url && database.s3Key) {
        console.log('Downloading file from S3 for schema detection:', database.s3Url);
        filePath = await s3Service.downloadFileToTemp(database.s3Key, database.s3Bucket);
      } else if (database.filePath) {
        console.log('Using local file path for schema detection:', database.filePath);
        filePath = database.filePath;
      } else {
        return res.status(400).json({ message: 'No file path or S3 URL found for this database' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ message: 'File not found' });
      }

      // Detect schema using DuckDB
      const schema = await duckdbService.detectSchema(filePath);
      
      // Clean up temp file if it was downloaded from S3
      if (database.s3Url && filePath) {
        try {
          await s3Service.cleanupLocalFile(filePath);
        } catch (err) {
          console.warn('Failed to clean up temp file:', err);
        }
      }

      res.json(schema);
    } catch (error) {
      console.error('Error detecting schema:', error);
      res.status(500).json({ message: 'Failed to detect schema', error: error.message });
    }
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/databases/:databaseId/preview
 * @desc    Get sample data from a file-based database using DuckDB
 * @access  Private
 */
router.get('/:workspaceId/databases/:databaseId/preview', authenticateUser, async (req, res) => {
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

    const database = await Database.findById(req.params.databaseId);
    if (!database) {
      return res.status(404).json({ message: 'Database not found' });
    }

    // Preview only works for file-based databases
    if (database.type !== 'XLS' && database.type !== 'CSV') {
      return res.status(400).json({ message: 'Preview only available for CSV and Excel files' });
    }

    const limit = parseInt(req.query.limit) || 10;

    let filePath = null;
    
    try {
      // Use S3 if available, otherwise fall back to local file path
      if (database.s3Url && database.s3Key) {
        console.log('Downloading file from S3 for preview:', database.s3Url);
        filePath = await s3Service.downloadFileToTemp(database.s3Key, database.s3Bucket);
      } else if (database.filePath) {
        console.log('Using local file path for preview:', database.filePath);
        filePath = database.filePath;
      } else {
        return res.status(400).json({ message: 'No file path or S3 URL found for this database' });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(400).json({ message: 'File not found' });
      }

      // Get sample data using DuckDB
      const sampleData = await duckdbService.getSampleData(filePath, limit);
      
      // Clean up temp file if it was downloaded from S3
      if (database.s3Url && filePath) {
        try {
          await s3Service.cleanupLocalFile(filePath);
        } catch (err) {
          console.warn('Failed to clean up temp file:', err);
        }
      }

      res.json(sampleData);
    } catch (error) {
      console.error('Error getting preview data:', error);
      res.status(500).json({ message: 'Failed to get preview data', error: error.message });
    }
  } catch (error) {
    console.error('Error fetching preview:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 