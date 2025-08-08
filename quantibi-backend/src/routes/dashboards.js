const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Dashboard = require('../models/Dashboard');
const Workspace = require('../models/Workspace');
const Chart = require('../models/Chart');

/**
 * @route   GET /api/workspaces/:workspaceId/dashboards
 * @desc    Get all dashboards for the workspace
 * @access  Private
 */
router.get('/:workspaceId/dashboards', authenticateUser, async (req, res) => {
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

    const dashboards = await Dashboard.find({ workspace: workspace._id })
                                    .populate('charts')
                                    .sort({ updatedAt: -1 });
    res.json(dashboards);
  } catch (error) {
    console.error('Error fetching dashboards:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/dashboards
 * @desc    Create a new dashboard
 * @access  Private
 */
router.post('/:workspaceId/dashboards', authenticateUser, async (req, res) => {
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

    const dashboard = new Dashboard({
      name: req.body.name,
      workspace: workspace._id,
      owner: req.user.uid,
      charts: []
    });

    await dashboard.save();
    res.status(201).json(dashboard);
  } catch (error) {
    console.error('Error creating dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/dashboards/:dashboardId
 * @desc    Get a specific dashboard
 * @access  Private
 */
router.get('/:workspaceId/dashboards/:dashboardId', authenticateUser, async (req, res) => {
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

    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      workspace: workspace._id
    }).populate('charts');

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/workspaces/:workspaceId/dashboards/:dashboardId
 * @desc    Update a dashboard
 * @access  Private
 */
router.put('/:workspaceId/dashboards/:dashboardId', authenticateUser, async (req, res) => {
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

    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      workspace: workspace._id,
      owner: req.user.uid
    });

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }

    // Update dashboard fields
    if (req.body.name) dashboard.name = req.body.name;
    if (req.body.charts) dashboard.charts = req.body.charts;

    await dashboard.save();
    res.json(dashboard);
  } catch (error) {
    console.error('Error updating dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/dashboards/:dashboardId/charts
 * @desc    Add a chart to a dashboard
 * @access  Private
 */
router.post('/:workspaceId/dashboards/:dashboardId/charts', authenticateUser, async (req, res) => {
  try {
    const { chartId } = req.body;
    if (!chartId) {
      return res.status(400).json({ message: 'Chart ID is required' });
    }

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

    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      workspace: workspace._id
    });

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }

    // Check if chart exists and belongs to the workspace
    const chart = await Chart.findOne({
      _id: chartId,
      workspace: workspace._id
    });

    if (!chart) {
      return res.status(404).json({ message: 'Chart not found' });
    }

    // Add chart to dashboard if not already present
    if (!dashboard.charts.includes(chartId)) {
      dashboard.charts.push(chartId);
      await dashboard.save();
    }

    res.json(dashboard);
  } catch (error) {
    console.error('Error adding chart to dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/dashboards/:dashboardId/charts/:chartId
 * @desc    Remove a chart from a dashboard
 * @access  Private
 */
router.delete('/:workspaceId/dashboards/:dashboardId/charts/:chartId', authenticateUser, async (req, res) => {
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

    const dashboard = await Dashboard.findOne({
      _id: req.params.dashboardId,
      workspace: workspace._id,
      owner: req.user.uid
    });

    if (!dashboard) {
      return res.status(404).json({ message: 'Dashboard not found' });
    }

    // Remove chart from dashboard
    dashboard.charts = dashboard.charts.filter(
      chart => chart.toString() !== req.params.chartId
    );

    await dashboard.save();
    res.json(dashboard);
  } catch (error) {
    console.error('Error removing chart from dashboard:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 