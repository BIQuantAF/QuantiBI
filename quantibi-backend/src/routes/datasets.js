const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Dataset = require('../models/Dataset');
const Workspace = require('../models/Workspace');
const Database = require('../models/Database');

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

    // For file-based databases, return the sheet name or default schema
    if (database.type === 'XLS') {
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

    // For file-based databases, return the sheet name or default table
    if (database.type === 'XLS') {
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

module.exports = router; 