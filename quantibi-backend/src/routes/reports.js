const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Report = require('../models/Report');
const Workspace = require('../models/Workspace');
const Chart = require('../models/Chart');
const usageService = require('../services/usage');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @route   GET /api/workspaces/:workspaceId/reports
 * @desc    Get all reports for a workspace
 * @access  Private
 */
router.get('/:workspaceId/reports', authenticateUser, async (req, res) => {
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

    const reports = await Report.find({ workspace: workspace._id })
                                 .populate('chartIds')
                                 .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:workspaceId/reports/:reportId
 * @desc    Get a specific report
 * @access  Private
 */
router.get('/:workspaceId/reports/:reportId', authenticateUser, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const report = await Report.findOne({
      _id: req.params.reportId,
      workspace: workspace._id
    }).populate('chartIds');

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/reports
 * @desc    Create a new report (AI-generated from charts)
 * @access  Private
 */
router.post('/:workspaceId/reports', authenticateUser, async (req, res) => {
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

    // Enforce report generation limits
    try {
      const consume = await usageService.tryConsume(req.user.uid, 'reports');
      if (!consume.success) {
        return res.status(403).json({ code: 'PAYWALL', message: consume.message, upgradeUrl: process.env.UPGRADE_URL || null });
      }
    } catch (err) {
      console.error('Error checking report usage limits:', err);
      return res.status(500).json({ message: 'Error checking usage limits' });
    }

    const { title, description, chartIds } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Report title is required' });
    }

    if (!chartIds || chartIds.length === 0) {
      return res.status(400).json({ message: 'At least one chart is required' });
    }

    // Verify all charts exist and belong to this workspace
    const charts = await Chart.find({
      _id: { $in: chartIds },
      workspace: workspace._id
    });

    if (charts.length !== chartIds.length) {
      return res.status(400).json({ message: 'One or more charts not found or do not belong to this workspace' });
    }

    // Create the report document
    const report = new Report({
      workspace: workspace._id,
      createdBy: req.user.uid,
      title,
      description,
      chartIds,
      status: 'draft',
    });

    await report.save();

    // Generate AI summary asynchronously (don't block the response)
    generateReportSummary(report._id, charts).catch(err => {
      console.error('Error generating report summary:', err);
    });

    res.status(201).json(report);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/reports/:reportId
 * @desc    Delete a report
 * @access  Private
 */
router.delete('/:workspaceId/reports/:reportId', authenticateUser, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    const isMember = workspace.owner === req.user.uid || 
                    workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const report = await Report.findOneAndDelete({
      _id: req.params.reportId,
      workspace: workspace._id
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Helper function to generate AI summary for a report asynchronously
 */
async function generateReportSummary(reportId, charts) {
  try {
    // Prepare chart data for the AI prompt
    const chartSummaries = charts.map(chart => ({
      title: chart.title,
      type: chart.chartType,
      query: chart.dataQuery,
      explanation: chart.explanation,
    }));

    const chartContext = chartSummaries.map((c, i) => 
      `Chart ${i + 1}: ${c.title} (${c.type})\nExplanation: ${c.explanation}`
    ).join('\n\n');

    // Call OpenAI to generate summary and insights
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a business analyst. Generate a concise executive summary and 3-5 key insights from the provided charts.'
        },
        {
          role: 'user',
          content: `Generate a report summary and insights from these charts:\n\n${chartContext}\n\nProvide the response in JSON format with keys "summary" (string) and "insights" (array of strings).`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content;
    const reportData = JSON.parse(responseText);

    // Update the report with the generated summary
    await Report.findByIdAndUpdate(
      reportId,
      {
        summary: reportData.summary || '',
        insights: reportData.insights || [],
        status: 'completed',
      },
      { new: true }
    );

    console.log('Report summary generated successfully:', reportId);
  } catch (error) {
    console.error('Error generating report summary:', error);
    // Update the report with the error status
    await Report.findByIdAndUpdate(
      reportId,
      {
        status: 'failed',
        error: error.message,
      },
      { new: true }
    );
  }
}

module.exports = router;
