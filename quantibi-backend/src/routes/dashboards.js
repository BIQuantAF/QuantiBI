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
 * @route   DELETE /api/workspaces/:workspaceId/dashboards/:dashboardId
 * @desc    Delete a dashboard
 * @access  Private
 */
router.delete('/:workspaceId/dashboards/:dashboardId', authenticateUser, async (req, res) => {
  try {
    const { workspaceId, dashboardId } = req.params;
    console.log(`[DELETE] Dashboard: workspaceId=${workspaceId}, dashboardId=${dashboardId}, user=${req.user.uid}`);
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      console.error(`[DELETE] Workspace not found: ${workspaceId}`);
      return res.status(404).json({ message: 'Workspace not found', workspaceId });
    }

    // Check if user has access to this workspace
    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    if (!isMember) {
      console.error(`[DELETE] Access denied for user ${req.user.uid} in workspace ${workspaceId}`);
      return res.status(403).json({ message: 'Access denied', workspaceId, user: req.user.uid });
    }

    const dashboard = await Dashboard.findOneAndDelete({
      _id: dashboardId,
      workspace: workspace._id
    });

    if (!dashboard) {
      console.error(`[DELETE] Dashboard not found: dashboardId=${dashboardId}, workspaceId=${workspaceId}`);
      // Try to find dashboard for more info
      const debugDash = await Dashboard.findOne({ _id: dashboardId });
      if (debugDash) {
        console.error(`[DELETE] Dashboard exists but workspace mismatch: dashboard.workspace=${debugDash.workspace}`);
      } else {
        console.error(`[DELETE] Dashboard does not exist at all: dashboardId=${dashboardId}`);
      }
      return res.status(404).json({ message: 'Dashboard not found', dashboardId, workspaceId });
    }

    console.log(`[DELETE] Dashboard deleted: dashboardId=${dashboardId}, workspaceId=${workspaceId}`);
    res.json({ message: 'Dashboard deleted successfully', dashboardId, workspaceId });
  } catch (error) {
    console.error('Error deleting dashboard:', error);
    res.status(500).json({ message: 'Server error', error: error.message, stack: error.stack });
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