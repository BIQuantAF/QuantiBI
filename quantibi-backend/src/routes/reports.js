const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Report = require('../models/Report');
const Workspace = require('../models/Workspace');
const Chart = require('../models/Chart');
const Dataset = require('../models/Dataset');
const Database = require('../models/Database');
const usageService = require('../services/usage');
const s3Service = require('../services/s3');
const duckdbService = require('../services/duckdb');
const OpenAI = require('openai');
const fs = require('fs');
const crypto = require('crypto');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @route   GET /api/reports/public/:shareToken
 * @desc    Get a public report by share token (no auth required)
 * @access  Public
 */
router.get('/public/:shareToken', async (req, res) => {
  try {
    const report = await Report.findOne({
      shareToken: req.params.shareToken,
      isPublic: true,
    }).populate('datasetId');

    if (!report) {
      return res.status(404).json({ message: 'Report not found or is not public' });
    }

    res.json(report);
  } catch (error) {
    console.error('Error fetching public report:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/reports/:reportId/share
 * @desc    Generate public share link for a report
 * @access  Private
 */
router.post('/:workspaceId/reports/:reportId/share', authenticateUser, async (req, res) => {
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

    const report = await Report.findOneAndUpdate(
      {
        _id: req.params.reportId,
        workspace: workspace._id,
      },
      {
        isPublic: true,
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json({ 
      shareUrl: `${process.env.FRONTEND_URL}/report/${report.shareToken}`,
      shareToken: report.shareToken,
    });
  } catch (error) {
    console.error('Error sharing report:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
 * @desc    Create a new report (AI-generated from dataset)
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

    const { title, description, datasetId } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Report title is required' });
    }

    if (!datasetId) {
      return res.status(400).json({ message: 'Dataset is required' });
    }

    // Verify dataset exists and belongs to this workspace
    const dataset = await Dataset.findOne({
      _id: datasetId,
      workspace: workspace._id
    }).populate('database');

    if (!dataset) {
      return res.status(400).json({ message: 'Dataset not found or does not belong to this workspace' });
    }

    // Create the report document
    const report = new Report({
      workspace: workspace._id,
      createdBy: req.user.uid,
      title,
      description,
      datasetId: dataset._id,
      shareToken: crypto.randomBytes(16).toString('hex'),
      status: 'draft',
    });

    await report.save();

    // Generate AI summary and charts asynchronously (don't block the response)
    generateReportFromDataset(report._id, dataset).catch(err => {
      console.error('Error generating report:', err);
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
 * Helper function to generate AI report from dataset
 * Analyzes dataset and creates a comprehensive 1-page report with charts
 */
async function generateReportFromDataset(reportId, dataset) {
  let tempFile = null;
  try {
    // Get the database connection info
    const database = await Database.findById(dataset.database);
    if (!database) {
      throw new Error('Database not found');
    }

    // Get dataset preview data
    let dataPreview = null;
    let schema = null;

    try {
      // Check if database has S3 location
      if (database.s3Key && database.s3Bucket) {
        // Download file from S3
        const downloadPath = await s3Service.downloadFile(
          database.s3Bucket,
          database.s3Key,
          `/tmp/${Date.now()}_${dataset._id}`
        );
        tempFile = downloadPath;

        // Get schema from DuckDB
        schema = await duckdbService.detectSchema(tempFile);

        // Get sample data
        dataPreview = await duckdbService.getSampleData(tempFile, 100);
      } else {
        // For other database types, use DuckDB if schema/table info available
        if (dataset.schema && dataset.table) {
          // Query the database directly
          dataPreview = await duckdbService.queryData(
            `SELECT * FROM ${dataset.schema}.${dataset.table} LIMIT 100`,
            database
          );
          schema = await duckdbService.detectSchema(dataset.table);
        }
      }
    } catch (err) {
      console.warn('Could not fetch dataset preview:', err.message);
    }

    // Prepare analysis data for AI
    let analysisContext = `Dataset: ${dataset.name}\nSchema: ${dataset.schema || 'unknown'}.${dataset.table || 'unknown'}`;
    
    if (schema && schema.columns) {
      analysisContext += `\n\nColumns (${schema.columns.length}):\n`;
      schema.columns.forEach(col => {
        analysisContext += `- ${col.name}: ${col.type}\n`;
      });
    }

    if (dataPreview && Array.isArray(dataPreview) && dataPreview.length > 0) {
      analysisContext += `\n\nData Summary:\n`;
      analysisContext += `- Total rows in preview: ${dataPreview.length}\n`;
      
      // Extract numeric columns for statistics
      const firstRow = dataPreview[0];
      const numericColumns = Object.keys(firstRow).filter(key => {
        return typeof firstRow[key] === 'number';
      });

      if (numericColumns.length > 0) {
        numericColumns.forEach(col => {
          const values = dataPreview.map(row => row[col]).filter(v => typeof v === 'number');
          if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            const max = Math.max(...values);
            const min = Math.min(...values);
            analysisContext += `- ${col}: Avg=${avg.toFixed(2)}, Max=${max}, Min=${min}\n`;
          }
        });
      }

      // Sample a few rows
      analysisContext += `\nSample rows:\n`;
      dataPreview.slice(0, 5).forEach((row, i) => {
        analysisContext += `Row ${i + 1}: ${JSON.stringify(row)}\n`;
      });
    }

    console.log('Generating report with dataset analysis:', { reportId, datasetId: dataset._id });

    // Call OpenAI to generate comprehensive report
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a data analyst. Analyze the provided dataset and generate a comprehensive one-page report with:
1. Executive Summary (2-3 sentences highlighting key findings)
2. Key Metrics (3-5 important statistics or trends)
3. Data Insights (3-5 actionable insights about the data)
4. Chart Recommendations (suggest 2-3 charts that would best visualize this data, specify chart type and what columns to use)

Format your response as valid JSON with keys: "summary", "metrics", "insights", "chartSuggestions".
Each metric should have: label, value, format (percentage/number/currency).
Each insight should be a clear, actionable statement.
Each chartSuggestion should have: title, type (bar/line/pie/scatter), columns (array).`
        },
        {
          role: 'user',
          content: `Analyze this dataset and generate a report:\n\n${analysisContext}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content;
    const reportData = JSON.parse(responseText);

    console.log('AI analysis complete, creating report sections');

    // Build report sections
    const sections = [
      {
        type: 'title',
        title: 'Report',
      },
      {
        type: 'summary',
        title: 'Executive Summary',
        content: reportData.summary || '',
      },
    ];

    // Add metrics as individual sections
    if (reportData.metrics && Array.isArray(reportData.metrics)) {
      reportData.metrics.forEach(metric => {
        sections.push({
          type: 'metric',
          title: metric.label,
          content: metric.value,
          metrics: {
            label: metric.label,
            value: metric.value,
            format: metric.format || 'text',
          },
        });
      });
    }

    // Add insights
    if (reportData.insights && Array.isArray(reportData.insights)) {
      sections.push({
        type: 'insight',
        title: 'Key Insights',
        content: reportData.insights.join('\n'),
      });
    }

    // Add chart recommendations as section info (actual charts created separately)
    if (reportData.chartSuggestions && Array.isArray(reportData.chartSuggestions)) {
      sections.push({
        type: 'chart',
        title: 'Data Visualizations',
        content: reportData.chartSuggestions.map(s => `${s.title} (${s.type} chart)`).join(', '),
      });
    }

    sections.push({
      type: 'conclusion',
      title: 'Conclusion',
      content: 'This report provides a comprehensive analysis of the dataset with key metrics and actionable insights.',
    });

    // Update the report with generated content
    await Report.findByIdAndUpdate(
      reportId,
      {
        summary: reportData.summary || '',
        insights: reportData.insights || [],
        sections: sections,
        status: 'completed',
      },
      { new: true }
    );

    console.log('Report generated successfully:', reportId);
  } catch (error) {
    console.error('Error generating report:', error);
    // Update the report with the error status
    await Report.findByIdAndUpdate(
      reportId,
      {
        status: 'failed',
        error: error.message,
      },
      { new: true }
    );
  } finally {
    // Clean up temp file if it exists
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn('Failed to clean up temp file:', err.message);
      }
    }
  }
}

module.exports = router;
