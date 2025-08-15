const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Chart = require('../models/Chart');
const Workspace = require('../models/Workspace');
const Dataset = require('../models/Dataset');
const OpenAI = require('openai');
const xlsx = require('xlsx');
const fs = require('fs');
const Database = require('../models/Database');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load PostgreSQL client only when needed
let Pool;
try {
  const pg = require('pg');
  Pool = pg.Pool;
} catch (error) {
  console.log('PostgreSQL client not available. PostgreSQL support will be disabled.');
}

/**
 * @route   GET /api/workspaces/:workspaceId/charts
 * @desc    Get all charts for the workspace
 * @access  Private
 */
router.get('/:workspaceId/charts', authenticateUser, async (req, res) => {
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

    const charts = await Chart.find({ workspace: workspace._id });
    res.json(charts);
  } catch (error) {
    console.error('Error fetching charts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/charts
 * @desc    Create a new chart
 * @access  Private
 */
router.post('/:workspaceId/charts', authenticateUser, async (req, res) => {
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

    const chart = new Chart({
      ...req.body,
      workspace: workspace._id,
      owner: req.user.uid
    });
    await chart.save();
    res.status(201).json(chart);
  } catch (error) {
    console.error('Error creating chart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/workspaces/:workspaceId/charts/:chartId
 * @desc    Update a chart
 * @access  Private
 */
router.put('/:workspaceId/charts/:chartId', authenticateUser, async (req, res) => {
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

    const chart = await Chart.findOne({
      _id: req.params.chartId,
      workspace: workspace._id,
      owner: req.user.uid
    });

    if (!chart) {
      return res.status(404).json({ message: 'Chart not found' });
    }

    Object.assign(chart, req.body);
    await chart.save();
    res.json(chart);
  } catch (error) {
    console.error('Error updating chart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:workspaceId/charts/:chartId
 * @desc    Delete a chart
 * @access  Private
 */
router.delete('/:workspaceId/charts/:chartId', authenticateUser, async (req, res) => {
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

    const chart = await Chart.findOneAndDelete({
      _id: req.params.chartId,
      workspace: workspace._id,
      owner: req.user.uid
    });

    if (!chart) {
      return res.status(404).json({ message: 'Chart not found' });
    }
    res.json({ message: 'Chart deleted successfully' });
  } catch (error) {
    console.error('Error deleting chart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/charts/generate
 * @desc    Generate a chart using AI
 * @access  Private
 */
router.post('/:workspaceId/charts/generate', authenticateUser, async (req, res) => {
  try {
    console.log('Received chart generation request:', {
      workspaceId: req.params.workspaceId,
      query: req.body.query,
      dataset: req.body.dataset
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

    const { query, dataset } = req.body;

    if (!dataset) {
      return res.status(400).json({ message: 'No dataset provided' });
    }

    // Get dataset details with database information
    console.log('Fetching dataset:', dataset);
    const datasetObj = await Dataset.findOne({
      _id: dataset,
      workspace: workspace._id
    }).populate('database');
    
    console.log('Dataset object:', {
      id: datasetObj?._id,
      name: datasetObj?.name,
      databaseType: datasetObj?.database?.type,
      filePath: datasetObj?.database?.filePath
    });
    
    if (!datasetObj) {
      return res.status(404).json({ message: 'Dataset not found' });
    }

    const datasetDetails = [{
      id: datasetObj._id,
      name: datasetObj.name,
      schema: datasetObj.schema,
      table: datasetObj.table,
      database: {
        type: datasetObj.database.type,
        filePath: datasetObj.database.filePath,
        sheetName: datasetObj.database.sheetName,
        host: datasetObj.database.host,
        port: datasetObj.database.port,
        databaseName: datasetObj.database.databaseName,
        username: datasetObj.database.username,
        password: datasetObj.database.password
      }
    }];

    // For Excel files, read the data and column information
    if (datasetObj.database.type === 'XLS') {
      console.log('Reading Excel file:', datasetObj.database.filePath);
      
      if (!datasetObj.database.filePath) {
        return res.status(400).json({ 
          message: 'Dataset file path is missing. Please recreate the dataset from the database connection.' 
        });
      }
      
      try {
        const workbook = xlsx.readFile(datasetObj.database.filePath);
        const worksheet = workbook.Sheets[datasetObj.database.sheetName || workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Get headers from first row
      const headers = data[0];
      
      // Only include the first 5 rows of data for the prompt
      const sampleData = data.slice(1, 6).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      datasetDetails[0].database = {
        ...datasetDetails[0].database,
        columns: headers,
        sampleData: sampleData,
        totalRows: data.length - 1 // Exclude header row
      };
      console.log('Excel data loaded:', {
        rowCount: data.length - 1,
        columns: headers
      });
      } catch (error) {
        console.error('Error reading Excel file:', error);
        return res.status(500).json({ 
          message: 'Error reading the Excel file. Please check if the file exists and is accessible.' 
        });
      }
    }

    console.log('Dataset details loaded');

    // Create prompt for OpenAI with detailed data information
    const prompt = `Given the following dataset and its contents:
${JSON.stringify(datasetDetails, null, 2)}

User question: ${query}

You must respond with ONLY a JSON object (no markdown, no code blocks, no backticks).
The JSON object must have exactly these fields:
{
  "dataQuery": {
    "type": "count" | "sum" | "average" | "group",
    "measure": "column name to measure",
    "dimension": "column name to group by (if needed)",
    "filters": [
      {
        "column": "column name",
        "operator": "=" | ">=" | "<=" | ">" | "<",
        "value": "value to filter by"
      }
    ]
  },
  "chartType": "one of: bar, line, pie, scatter, radar",
  "explanation": "why this visualization is suitable"
}

Generate:
1. A data query specification that will answer the question using the available columns
2. The most appropriate chart type from the allowed options
3. A brief explanation of why this visualization is suitable

For example, if the Excel file has columns ["OrderDate", "Location", "Amount"], and the user asks about orders in Kentucky in November 2016, you would generate:
{
  "dataQuery": {
    "type": "count",
    "filters": [
      {
        "column": "Location",
        "operator": "=",
        "value": "Kentucky"
      },
      {
        "column": "OrderDate",
        "operator": ">=",
        "value": "2016-11-01"
      },
      {
        "column": "OrderDate",
        "operator": "<",
        "value": "2016-12-01"
      }
    ]
  },
  "chartType": "bar",
  "explanation": "A bar chart is suitable for showing the count of orders in a specific time period and location"
}`;

    console.log('Sending prompt to OpenAI');
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data visualization expert. You must respond with ONLY a JSON object - no markdown, no code blocks, no backticks. The response must be valid JSON that can be parsed directly. Use the exact column names from the dataset."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      response_format: { type: "json_object" }
    });

    console.log('Received OpenAI response:', completion.choices[0].message.content);

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Clean and parse the response
    let content = completion.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    content = content.trim();

    if (!content.startsWith('{') || !content.endsWith('}')) {
      throw new Error('Invalid JSON format in OpenAI response');
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
      console.log('Parsed AI response:', aiResponse);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }

    // Validate the required fields are present
    if (!aiResponse.dataQuery || !aiResponse.chartType || !aiResponse.explanation) {
      throw new Error('OpenAI response missing required fields');
    }

    // Validate chart type is one of the allowed values
    const allowedChartTypes = ['bar', 'line', 'pie', 'scatter', 'radar'];
    if (!allowedChartTypes.includes(aiResponse.chartType)) {
      throw new Error(`Invalid chart type: ${aiResponse.chartType}`);
    }

    // Process the data according to the query specification
    let chartData = null;
    for (const dataset of datasetDetails) {
      if (dataset.database.type === 'XLS') {
        // Read the Excel file again to get the full data
        console.log('Reading Excel file for processing:', dataset.database.filePath);
        
        if (!dataset.database.filePath) {
          throw new Error('Dataset file path is missing');
        }
        
        try {
          const workbook = xlsx.readFile(dataset.database.filePath);
          const worksheet = workbook.Sheets[dataset.database.sheetName || workbook.SheetNames[0]];
          const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Get headers from first row
        const headers = data[0];
        
        // Convert data to array of objects with headers as keys
        const processedData = data.slice(1).map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });

        console.log('Processing data with', processedData.length, 'rows');

        // Apply filters
        let filteredData = processedData;
        if (aiResponse.dataQuery.filters) {
          console.log('Applying filters:', aiResponse.dataQuery.filters);
          filteredData = processedData.filter(row => {
            return aiResponse.dataQuery.filters.every(filter => {
              const value = row[filter.column];
              const filterValue = filter.value;

              console.log('Filtering:', {
                column: filter.column,
                value: value,
                operator: filter.operator,
                filterValue: filterValue
              });

              // Handle date comparisons
              if (filter.column.toLowerCase().includes('date')) {
                const rowDate = parseDate(value);
                const filterDate = parseDate(filterValue);
                
                if (!rowDate || !filterDate) {
                  console.log('Invalid date:', value, filterValue);
                  return false;
                }
                
                const result = compareDates(rowDate, filterDate, filter.operator);
                console.log('Date comparison result:', result);
                return result;
              }

              // Handle string comparisons
              switch (filter.operator) {
                case '=':
                  return value?.toString().toLowerCase() === filterValue.toLowerCase();
                default:
                  return false;
              }
            });
          });
        }

        console.log('Filtered data count:', filteredData.length);

        // Apply aggregation
        let result;
        switch (aiResponse.dataQuery.type) {
          case 'count':
            if (aiResponse.dataQuery.dimension) {
              // Group by dimension and count
              const groups = {};
              filteredData.forEach(row => {
                let key = row[aiResponse.dataQuery.dimension];
                
                // If the dimension is a date field, group by month
                if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                  const date = parseDate(row[aiResponse.dataQuery.dimension]);
                  if (date) {
                    // Format as "YYYY-MM" (e.g., "2016-01" for January 2016)
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  }
                }

                if (!groups[key]) {
                  groups[key] = 0;
                }
                groups[key]++;
              });

              // Sort labels if they're dates and convert to friendly names
              const labels = Object.keys(groups);
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                labels.sort();
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                result = {
                  labels: labels.map(key => {
                    const [year, month] = key.split('-');
                    return `${monthNames[parseInt(month) - 1]} ${year}`;
                  }),
                  datasets: [{
                    label: 'Count',
                    data: labels.map(key => groups[key])
                  }]
                };
              } else {
                result = {
                  labels: labels,
                  datasets: [{
                    label: 'Count',
                    data: Object.values(groups)
                  }]
                };
              }
            } else {
              // Simple count
              result = {
                labels: ['Total'],
                datasets: [{
                  label: 'Count',
                  data: [filteredData.length]
                }]
              };
            }
            break;

          case 'sum':
            if (aiResponse.dataQuery.dimension) {
              // Group by dimension and sum
              const groups = {};
              filteredData.forEach(row => {
                let key = row[aiResponse.dataQuery.dimension];
                
                // If the dimension is a date field, group by month
                if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                  const date = parseDate(row[aiResponse.dataQuery.dimension]);
                  if (date) {
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                  }
                }
                
                const value = parseFloat(row[aiResponse.dataQuery.measure]) || 0;
                if (!groups[key]) {
                  groups[key] = 0;
                }
                groups[key] += value;
              });
              
              // Sort labels if they're dates
              const labels = Object.keys(groups);
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                labels.sort();
              }
              
              result = {
                labels: labels,
                datasets: [{
                  label: `Sum of ${aiResponse.dataQuery.measure}`,
                  data: labels.map(key => groups[key])
                }]
              };
            } else {
              // Simple sum
              const sum = filteredData.reduce((acc, row) => {
                return acc + (parseFloat(row[aiResponse.dataQuery.measure]) || 0);
              }, 0);
              result = {
                labels: ['Total'],
                datasets: [{
                  label: `Sum of ${aiResponse.dataQuery.measure}`,
                  data: [sum]
                }]
              };
            }
            break;

          case 'average':
            if (aiResponse.dataQuery.dimension) {
              // Group by dimension and average
              const groups = {};
              const counts = {};
              filteredData.forEach(row => {
                const key = row[aiResponse.dataQuery.dimension];
                const value = parseFloat(row[aiResponse.dataQuery.measure]) || 0;
                if (!groups[key]) {
                  groups[key] = 0;
                  counts[key] = 0;
                }
                groups[key] += value;
                counts[key]++;
              });
              result = {
                labels: Object.keys(groups),
                datasets: [{
                  label: `Average of ${aiResponse.dataQuery.measure}`,
                  data: Object.keys(groups).map(key => groups[key] / counts[key])
                }]
              };
            } else {
              // Simple average
              const sum = filteredData.reduce((acc, row) => {
                return acc + (parseFloat(row[aiResponse.dataQuery.measure]) || 0);
              }, 0);
              const avg = sum / filteredData.length;
              result = {
                labels: ['Total'],
                datasets: [{
                  label: `Average of ${aiResponse.dataQuery.measure}`,
                  data: [avg]
                }]
              };
            }
            break;
        }

        if (result) {
          chartData = result;
          break;
        }
        } catch (error) {
          console.error('Error processing Excel file:', error);
          throw new Error(`Error processing Excel file: ${error.message}`);
        }
      }
    }

    // If no data was found, return an error
    if (!chartData) {
      return res.status(404).json({
        message: 'No data found for the query',
        dataQuery: aiResponse.dataQuery,
        chartType: aiResponse.chartType,
        explanation: aiResponse.explanation
      });
    }

    // Add default styling to the chart data
    chartData.datasets[0] = {
      ...chartData.datasets[0],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    };

    // Generate SQL query from the data query specification
    let sqlQuery = '';
    if (aiResponse.dataQuery.type === 'count') {
      sqlQuery = 'SELECT COUNT(*)';
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      sqlQuery += ' FROM data';
    } else if (aiResponse.dataQuery.type === 'sum') {
      sqlQuery = `SELECT SUM(${aiResponse.dataQuery.measure})`;
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      sqlQuery += ' FROM data';
    } else if (aiResponse.dataQuery.type === 'average') {
      sqlQuery = `SELECT AVG(${aiResponse.dataQuery.measure})`;
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      sqlQuery += ' FROM data';
    }

    // Add WHERE clause if there are filters
    if (aiResponse.dataQuery.filters && aiResponse.dataQuery.filters.length > 0) {
      sqlQuery += ' WHERE ' + aiResponse.dataQuery.filters.map(filter => {
        return `${filter.column} ${filter.operator} '${filter.value}'`;
      }).join(' AND ');
    }

    // Add GROUP BY if there's a dimension
    if (aiResponse.dataQuery.dimension) {
      sqlQuery += ` GROUP BY ${aiResponse.dataQuery.dimension}`;
    }

    res.json({
      dataQuery: aiResponse.dataQuery,
      chartType: aiResponse.chartType,
      data: chartData,
      message: aiResponse.explanation,
      sql: sqlQuery
    });
  } catch (error) {
    console.error('Error generating chart:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to generate chart', 
      error: error.message,
      details: error.stack 
    });
  }
});

/**
 * @route   POST /api/workspaces/:workspaceId/charts/update
 * @desc    Update a chart using AI
 * @access  Private
 */
router.post('/:workspaceId/charts/update', authenticateUser, async (req, res) => {
  try {
    const { message, currentChart } = req.body;

    // Create a more specific prompt for updating chart appearance
    const prompt = `Current chart:
Type: ${currentChart.type}
SQL: ${currentChart.sql}
Data: ${JSON.stringify(currentChart.data)}

User request: ${message}

You must respond with ONLY a JSON object (no markdown, no code blocks, no backticks).
The JSON object must have exactly these fields:
{
  "sql": "the SQL query (keep current if only visual changes)",
  "chartType": "one of: bar, line, pie, scatter, radar",
  "message": "explanation of changes made"
}

Help modify the chart based on the user's request by providing:
1. The SQL query (keep the current one if only visual changes are requested)
2. The chart type (change only if specifically requested)
3. A clear explanation of the changes made`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a data visualization expert. You must respond with ONLY a JSON object - no markdown, no code blocks, no backticks. The response must be valid JSON that can be parsed directly."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      response_format: { type: "json_object" }
    });

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error('Invalid response from OpenAI API');
    }

    // Clean and parse the response
    let content = completion.choices[0].message.content.trim();
    
    // Remove any markdown code block syntax if present
    content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    
    // Remove any leading/trailing whitespace or newlines
    content = content.trim();

    // Additional safety check - ensure the content starts with { and ends with }
    if (!content.startsWith('{') || !content.endsWith('}')) {
      throw new Error('Invalid JSON format in OpenAI response');
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
    }

    // Validate the required fields are present
    if (!aiResponse.sql || !aiResponse.chartType || !aiResponse.message) {
      throw new Error('OpenAI response missing required fields');
    }

    // Validate chart type is one of the allowed values
    const allowedChartTypes = ['bar', 'line', 'pie', 'scatter', 'radar'];
    if (!allowedChartTypes.includes(aiResponse.chartType)) {
      throw new Error(`Invalid chart type: ${aiResponse.chartType}`);
    }

    // Execute the SQL query and get the data
    const data = await executeQuery(aiResponse.sql, currentChart.dataset);

    // If no data was found, return an error
    if (!data) {
      return res.status(404).json({
        message: 'No data found for the updated query',
        sql: aiResponse.sql,
        chartType: aiResponse.chartType,
        explanation: aiResponse.message
      });
    }

    // Add default styling to the chart data
    data.datasets[0] = {
      ...data.datasets[0],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    };

    res.json({
      sql: aiResponse.sql,
      chartType: aiResponse.chartType,
      data,
      message: aiResponse.message
    });
  } catch (error) {
    console.error('Error updating chart:', error);
    res.status(500).json({ 
      message: 'Failed to update chart', 
      error: error.message,
      details: error.stack 
    });
  }
});

// Helper function to parse date in DD/MM/YYYY format
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // If it's already a Date object, return it
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  // Convert to string if it's not already
  const str = String(dateStr);
  
  // Log the date string we're trying to parse
  console.log('Parsing date:', str);
  
  // Handle Excel serial numbers (numbers like 42082)
  if (/^\d+$/.test(str)) {
    // Excel's epoch starts on December 30, 1899
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const days = parseInt(str);
    const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    console.log('Parsed Excel serial number:', date);
    return date;
  }
  
  // Handle DD/MM/YYYY format
  if (str.includes('/')) {
    const [day, month, year] = str.split('/');
    const date = new Date(year, month - 1, day); // month is 0-based in JavaScript Date
    console.log('Parsed DD/MM/YYYY:', date);
    return date;
  }
  
  // Handle YYYY-MM-DD format
  if (str.includes('-')) {
    const date = new Date(str);
    console.log('Parsed YYYY-MM-DD:', date);
    return date;
  }
  
  // Handle MM/DD/YYYY format (common in US)
  if (str.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const [month, day, year] = str.split('/');
    const date = new Date(year, month - 1, day);
    console.log('Parsed MM/DD/YYYY:', date);
    return date;
  }
  
  // Try parsing as is
  const date = new Date(str);
  console.log('Parsed as is:', date);
  return date;
}

// Helper function to compare dates
function compareDates(date1, date2, operator) {
  if (!date1 || !date2) {
    console.log('Invalid dates for comparison:', date1, date2);
    return false;
  }
  
  // Convert both dates to start of day for comparison
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());
  
  console.log('Comparing dates:', {
    date1: d1.toISOString(),
    date2: d2.toISOString(),
    operator
  });
  
  switch (operator) {
    case '=':
      return d1.getTime() === d2.getTime();
    case '>=':
      return d1.getTime() >= d2.getTime();
    case '<=':
      return d1.getTime() <= d2.getTime();
    case '>':
      return d1.getTime() > d2.getTime();
    case '<':
      return d1.getTime() < d2.getTime();
    default:
      console.log('Unknown operator:', operator);
      return false;
  }
}

// Helper function to execute SQL queries for Excel files
async function executeExcelQuery(sql, worksheet, headers) {
  // Convert worksheet to JSON with header row
  const data = xlsx.utils.sheet_to_json(worksheet, { header: headers });
  
  // Log the headers and first row for debugging
  console.log('Excel Headers:', headers);
  console.log('First row of data:', data[0]);
  
  // Parse the SQL query to understand what we need to do
  const sqlLower = sql.toLowerCase();
  const isCount = sqlLower.includes('count(');
  const isGroupBy = sqlLower.includes('group by');
  const whereClause = sqlLower.includes('where') ? 
    sql.substring(sqlLower.indexOf('where') + 5, isGroupBy ? sqlLower.indexOf('group by') : undefined).trim() : null;
  
  // Apply WHERE clause filtering
  let filteredData = data;
  if (whereClause) {
    // Parse the WHERE conditions (simple AND conditions only for now)
    const conditions = whereClause.split('and').map(cond => {
      const [field, operator, ...value] = cond.trim().split(/\s+/);
      // Handle field names with spaces
      const fieldName = field.replace(/['"]/g, '');
      return {
        field: fieldName,
        operator: operator.trim(),
        value: value.join(' ').replace(/['"]/g, '').trim()
      };
    });

    console.log('Parsed WHERE conditions:', conditions);

    filteredData = data.filter(row => {
      return conditions.every(condition => {
        const fieldValue = row[condition.field];
        const compareValue = condition.value;
        
        console.log(`Comparing ${condition.field}:`, fieldValue, condition.operator, compareValue);
        
        // Handle date comparisons
        if (condition.field.toLowerCase().includes('date')) {
          const rowDate = parseDate(fieldValue);
          const compareDate = parseDate(compareValue);
          
          if (!rowDate || !compareDate) {
            console.log('Invalid date:', fieldValue, compareValue);
            return false;
          }
          
          return compareDates(rowDate, compareDate, condition.operator);
        }
        
        // Handle string comparisons
        switch (condition.operator) {
          case '=':
            return fieldValue?.toString().toLowerCase() === compareValue.toLowerCase();
          default:
            return false;
        }
      });
    });

    console.log('Filtered data count:', filteredData.length);
    if (filteredData.length > 0) {
      console.log('First filtered row:', filteredData[0]);
    }
  }

  // Handle GROUP BY
  let groupedData = filteredData;
  let groupByField = null;
  if (isGroupBy) {
    const groupByIndex = sqlLower.indexOf('group by') + 8;
    groupByField = sql.substring(groupByIndex).trim();
    
    // Group the data
    const groups = {};
    filteredData.forEach(row => {
      const key = row[groupByField];
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    // If we're counting, transform groups into count per group
    if (isCount) {
      groupedData = Object.entries(groups).map(([key, rows]) => ({
        [groupByField]: key,
        count: rows.length
      }));
    }
  } else if (isCount) {
    // Simple count without grouping
    groupedData = [{
      count: filteredData.length
    }];
  }

  console.log('Final grouped data:', groupedData);
  return groupedData;
}

// Helper function to execute SQL queries
async function executeQuery(sql, dataset) {
  try {
    // Check if we have a database object or ID
    let databaseId = dataset.database;
    if (typeof dataset.database === 'object' && dataset.database !== null) {
      // If it's the full database object, use its properties directly
      const dbInfo = dataset.database;
      if (dbInfo.type === 'XLS') {
        // Read Excel file
        const workbook = xlsx.readFile(dbInfo.filePath);
        const worksheet = workbook.Sheets[dbInfo.sheetName || workbook.SheetNames[0]];
        
        // Get the headers from the first row
        const range = xlsx.utils.decode_range(worksheet['!ref']);
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; C++) {
          const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: C })];
          headers.push(cell ? cell.v : undefined);
        }

        // Skip column validation for COUNT(*) queries
        const isCountStar = sql.toLowerCase().includes('count(*)');
        if (!isCountStar) {
          // Validate non-aggregated columns from SQL exist in the Excel file
          const sqlColumns = extractColumnsFromSQL(sql);
          if (sqlColumns.length > 0) {
            const missingColumns = sqlColumns.filter(col => !headers.includes(col));
            if (missingColumns.length > 0) {
              throw new Error(`Columns not found in Excel file: ${missingColumns.join(', ')}`);
            }
          }
        }

        // Execute the query against the Excel data
        const data = await executeExcelQuery(sql, worksheet, headers);

        // If no data was returned, return null
        if (!data || data.length === 0) {
          return null;
        }

        // For aggregated queries (like COUNT), we need to handle the result differently
        const isCount = sql.toLowerCase().includes('count(');
        if (isCount) {
          const groupByMatch = sql.toLowerCase().match(/group by\s+(\w+)/);
          const groupByField = groupByMatch ? groupByMatch[1] : null;

          if (groupByField) {
            // Return grouped counts
            return {
              labels: data.map(row => row[groupByField]),
              datasets: [{
                label: 'Count',
                data: data.map(row => row.count)
              }]
            };
          } else {
            // Return single count
            return {
              labels: ['Total'],
              datasets: [{
                label: 'Count',
                data: [data[0].count]
              }]
            };
          }
        } else {
          // For non-aggregated queries, use the standard data extraction
          const { labels, values } = extractDataFromRows(data, sql);
          return {
            labels,
            datasets: [{
              label: extractLabelFromSQL(sql),
              data: values
            }]
          };
        }
      }
    } else {
      // If it's an ID, fetch the database details first
      const database = await Database.findById(databaseId);
      if (!database) {
        throw new Error('Database not found');
      }

      let data;
      switch (database.type) {
        case 'XLS':
          // Read Excel file
          const workbook = xlsx.readFile(database.filePath);
          const worksheet = workbook.Sheets[database.sheetName || workbook.SheetNames[0]];
          
          // Get the headers from the first row
          const range = xlsx.utils.decode_range(worksheet['!ref']);
          const headers = [];
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = worksheet[xlsx.utils.encode_cell({ r: 0, c: C })];
            headers.push(cell ? cell.v : undefined);
          }
          
          // Validate that all required columns from SQL exist in the Excel file
          const sqlColumns = extractColumnsFromSQL(sql);
          const missingColumns = sqlColumns.filter(col => !headers.includes(col));
          if (missingColumns.length > 0) {
            throw new Error(`Columns not found in Excel file: ${missingColumns.join(', ')}`);
          }

          // Convert worksheet to JSON with header row
          data = xlsx.utils.sheet_to_json(worksheet, { header: headers });
          break;

        case 'CSV':
          // Read CSV file
          const csvData = fs.readFileSync(database.filePath, 'utf-8');
          const records = csvData.split('\n').map(row => row.split(','));
          const csvHeaders = records[0].map(h => h.trim());
          
          // Validate CSV columns
          const csvSqlColumns = extractColumnsFromSQL(sql);
          const csvMissingColumns = csvSqlColumns.filter(col => !csvHeaders.includes(col));
          if (csvMissingColumns.length > 0) {
            throw new Error(`Columns not found in CSV file: ${csvMissingColumns.join(', ')}`);
          }

          data = records.slice(1).map(row => {
            const obj = {};
            csvHeaders.forEach((header, index) => {
              obj[header] = row[index]?.trim();
            });
            return obj;
          });
          break;

        case 'PostgreSQL':
          if (!Pool) {
            throw new Error('PostgreSQL support is not available. Please install the "pg" package.');
          }
          // Execute PostgreSQL query
          const pool = new Pool({
            host: database.host,
            port: database.port,
            database: database.databaseName,
            user: database.username,
            password: database.password,
            ssl: {
              rejectUnauthorized: false
            }
          });

          // Validate that the columns exist in the database
          const tableColumns = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
          `, [dataset.schema, dataset.table]);
          
          const pgSqlColumns = extractColumnsFromSQL(sql);
          const pgMissingColumns = pgSqlColumns.filter(
            col => !tableColumns.rows.some(row => row.column_name === col)
          );
          
          if (pgMissingColumns.length > 0) {
            throw new Error(`Columns not found in database: ${pgMissingColumns.join(', ')}`);
          }

          const result = await pool.query(sql);
          data = result.rows;
          await pool.end();
          break;

        default:
          throw new Error(`Unsupported database type: ${database.type}`);
      }

      // If no data was returned, return null
      if (!data || data.length === 0) {
        return null;
      }

      // Transform the data into the format expected by the chart
      const { labels, values } = extractDataFromRows(data, sql);

      // If we couldn't extract valid labels or values, return null
      if (!labels || !values || labels.length === 0 || values.length === 0) {
        return null;
      }

      return {
        labels,
        datasets: [{
          label: extractLabelFromSQL(sql),
          data: values
        }]
      };
    }
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// Helper function to extract column names from SQL query
function extractColumnsFromSQL(sql) {
  const sqlLower = sql.toLowerCase();
  const selectIndex = sqlLower.indexOf('select') + 6;
  const fromIndex = sqlLower.indexOf('from');
  const columnsStr = sql.substring(selectIndex, fromIndex).trim();
  
  // If it's a COUNT(*) query, return empty array to skip validation
  if (sqlLower.includes('count(*)')) {
    return [];
  }
  
  return columnsStr.split(',').map(col => {
    const parts = col.trim().split(' as ');
    const columnExpr = parts[0].trim();
    
    // Handle aggregation functions
    if (columnExpr.includes('(')) {
      // For COUNT(*), SUM(*), etc., we don't need to validate any columns
      if (columnExpr.includes('(*)')) {
        return null;
      }
      // For other aggregations like COUNT(column), SUM(column), extract the column name
      const match = columnExpr.match(/\(([^)]+)\)/);
      if (match) {
        const innerColumn = match[1].trim();
        return innerColumn === '*' ? null : innerColumn;
      }
      return null;
    }
    
    // For regular columns, use the column name (not the alias)
    return columnExpr;
  }).filter(col => col !== null);
}

// Helper function to extract label from SQL for chart
function extractLabelFromSQL(sql) {
  const sqlLower = sql.toLowerCase();
  const selectIndex = sqlLower.indexOf('select') + 6;
  const fromIndex = sqlLower.indexOf('from');
  const columnsStr = sql.substring(selectIndex, fromIndex).trim();
  const columns = columnsStr.split(',').map(col => {
    const parts = col.trim().split(' as ');
    const columnExpr = parts[0].trim();
    
    // If there's an alias, use it
    if (parts.length > 1) {
      return parts[1].trim();
    }
    
    // For aggregations without alias, create a readable label
    if (columnExpr.includes('(')) {
      const funcName = columnExpr.substring(0, columnExpr.indexOf('(')).trim();
      const match = columnExpr.match(/\(([^)]+)\)/);
      const innerColumn = match ? match[1].trim() : '*';
      return `${funcName} of ${innerColumn === '*' ? 'rows' : innerColumn}`;
    }
    
    return columnExpr;
  });
  
  return columns[0]; // First column is typically the measure (e.g., COUNT(*))
}

// Helper function to extract data from rows based on SQL
function extractDataFromRows(data, sql) {
  const sqlLower = sql.toLowerCase();
  const selectIndex = sqlLower.indexOf('select') + 6;
  const fromIndex = sqlLower.indexOf('from');
  const columnsStr = sql.substring(selectIndex, fromIndex).trim();
  const columns = columnsStr.split(',').map(col => {
    const parts = col.trim().split(' as ');
    const columnExpr = parts[0].trim();
    const alias = parts.length > 1 ? parts[1].trim() : columnExpr;
    
    // If it's an aggregation with an alias, use the alias
    if (columnExpr.includes('(') && parts.length > 1) {
      return alias;
    }
    
    // For aggregations without alias, create a default name
    if (columnExpr.includes('(')) {
      const funcName = columnExpr.substring(0, columnExpr.indexOf('(')).trim();
      const match = columnExpr.match(/\(([^)]+)\)/);
      const innerColumn = match ? match[1].trim() : '*';
      return `${funcName}_${innerColumn}`.toLowerCase();
    }
    
    return columnExpr;
  });

  // Handle COUNT(*) queries
  if (sqlLower.includes('count(*)')) {
    return {
      labels: ['Total'],
      values: [data.length]
    };
  }

  // For aggregated queries, we expect the first column to be the measure and the second to be the dimension
  const labels = data.map(row => {
    const value = row[columns[1]];
    return value instanceof Date ? value.toISOString().split('T')[0] : value;
  });
  
  const values = data.map(row => {
    const value = row[columns[0]];
    return typeof value === 'string' ? parseFloat(value) : value;
  });

  return { labels, values };
}

module.exports = router; 