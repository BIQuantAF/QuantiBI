
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
const bigqueryService = require('../services/bigquery');
const usageService = require('../services/usage');
const csv = require('csv-parse/sync');
const s3Service = require('../services/s3');
const duckdbService = require('../services/duckdb');

/**
 * Helper function to convert BigInt values to regular numbers for JSON serialization
 * Also handles Date objects and other special types
 * @param {*} obj - Object to convert
 * @returns {*} - Object with BigInt values converted to numbers and Dates converted to ISO strings
 */
function convertBigIntToNumber(obj) {
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  // Handle Date objects by converting to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToNumber);
  }
  // Handle plain objects (but not special types like Date)
  if (obj !== null && typeof obj === 'object' && obj.constructor === Object) {
    const converted = {};
    for (const key in obj) {
      converted[key] = convertBigIntToNumber(obj[key]);
    }
    return converted;
  }
  return obj;
}

/**
 * @route   GET /api/workspaces/:workspaceId/charts/:chartId
 * @desc    Get a single chart by ID for a workspace
 * @access  Private
 */
router.get('/:workspaceId/charts/:chartId', authenticateUser, async (req, res) => {
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
      workspace: workspace._id
    });
    if (!chart) {
      return res.status(404).json({ message: 'Chart not found' });
    }
    res.json(chart);
  } catch (error) {
    console.error('Error fetching chart:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

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
 * @route   POST /api/workspaces/:workspaceId/charts/ai/generate
 * @desc    Generate a chart using AI
 * @access  Private
 */
router.post('/:workspaceId/charts/ai/generate', authenticateUser, async (req, res) => {
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

    // Enforce chart generation limits for free users
    try {
      const consume = await usageService.tryConsume(req.user.uid, 'charts');
      if (!consume.success) {
        return res.status(403).json({ code: 'PAYWALL', message: consume.message, upgradeUrl: process.env.UPGRADE_URL || null });
      }
    } catch (err) {
      console.error('Error checking chart usage limits:', err);
      return res.status(500).json({ message: 'Error checking usage limits' });
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
        password: datasetObj.database.password,
        projectId: datasetObj.database.projectId,
        credentials: datasetObj.database.credentials
      }
    }];

    // For BigQuery, get data from the specific table
    if (datasetObj.database.type === 'Google BigQuery') {
      try {
        // First validate that the dataset and table exist
        const validation = await bigqueryService.validateDatasetAndTable(
          datasetObj.database.projectId,
          datasetObj.database.credentials,
          datasetObj.schema,
          datasetObj.table
        );
        
        if (!validation.exists) {
          console.error('BigQuery validation failed:', validation.message);
          return res.status(404).json({ 
            message: 'BigQuery dataset or table not found',
            details: validation.message,
            dataset: datasetObj.schema,
            table: datasetObj.table,
            project: datasetObj.database.projectId
          });
        }
        
        const tableData = await bigqueryService.getTableData(
          datasetObj.database.projectId, 
          datasetObj.database.credentials, 
          datasetObj.schema, 
          datasetObj.table,
          100
        );
        
        datasetDetails[0].database = {
          ...datasetDetails[0].database,
          columns: tableData.columns,
          sampleData: tableData.sampleData,
          totalRows: tableData.totalRows
        };
        
        console.log('BigQuery data loaded:', {
          rowCount: tableData.totalRows,
          columns: tableData.columns,
          dataset: datasetObj.schema,
          table: datasetObj.table
        });
      } catch (error) {
        console.error('Error querying BigQuery:', error);
        return res.status(500).json({ 
          message: 'Error querying BigQuery', 
          error: error.message,
          dataset: datasetObj.schema,
          table: datasetObj.table,
          project: datasetObj.database.projectId
        });
      }
    }

    // For file-based databases (CSV, XLS), read from S3 or local file using DuckDB
    if (datasetObj.database.type === 'XLS' || datasetObj.database.type === 'CSV') {
      console.log('Reading file database:', { type: datasetObj.database.type, s3Url: datasetObj.database.s3Url });
      
      let filePath = null;
      
      try {
        // Use S3 if available, otherwise fall back to local file path
        if (datasetObj.database.s3Url && datasetObj.database.s3Key) {
          console.log('Downloading file from S3:', datasetObj.database.s3Url);
          filePath = await s3Service.downloadFileToTemp(datasetObj.database.s3Key, datasetObj.database.s3Bucket);
        } else if (datasetObj.database.filePath) {
          console.log('Using local file path:', datasetObj.database.filePath);
          filePath = datasetObj.database.filePath;
        } else {
          return res.status(400).json({ 
            message: 'Dataset file is missing. Please recreate the dataset from the database connection.' 
          });
        }
        
        if (!fs.existsSync(filePath)) {
          return res.status(400).json({ 
            message: 'Dataset file not found.' 
          });
        }
        
        // Detect schema using DuckDB
        const schema = await duckdbService.detectSchema(filePath);
        const columns = schema.map(col => col.name);
        
        // Get sample data using DuckDB
        const sampleResult = await duckdbService.getSampleData(filePath, 5);
        const sampleData = [];
        for (let i = 0; i < (sampleResult.rows || []).length; i++) {
          const row = {};
          columns.forEach((col, idx) => {
            row[col] = sampleResult.rows[i][idx];
          });
          sampleData.push(row);
        }
        
        datasetDetails[0].database = {
          ...datasetDetails[0].database,
          columns: columns,
          sampleData: sampleData,
          totalRows: sampleResult.totalRows || 0,
          localFilePath: filePath  // Store the file path for later use in aggregation
        };
        
        console.log('File data loaded via DuckDB:', {
          rowCount: sampleResult.totalRows,
          columns: columns,
          type: datasetObj.database.type
        });
        
        // Clean up temporary S3 file if it was downloaded
        if (datasetObj.database.s3Url && filePath) {
          try {
            await s3Service.cleanupLocalFile(filePath);
          } catch (err) {
            console.warn('Failed to clean up temp file:', err);
          }
        }
      } catch (error) {
        console.error('Error reading file:', error);
        return res.status(500).json({ 
          message: 'Error reading the file. Please check if the file exists and is accessible.',
          error: error.message
        });
      }
    }

    console.log('Dataset details loaded');
    
    // Convert BigInt values before stringifying
    const cleanedDatasetDetails = convertBigIntToNumber(datasetDetails);
    console.log('Dataset details structure:', JSON.stringify(cleanedDatasetDetails, null, 2));

    // Create prompt for OpenAI with detailed data information
    const prompt = `Given the following dataset and its contents:
${JSON.stringify(cleanedDatasetDetails, null, 2)}

User question: ${query}

You must respond with ONLY a JSON object (no markdown, no code blocks, no backticks).
The JSON object must have exactly these fields:
{
  "dataQuery": {
    "type": "count" | "sum" | "average" | "group",
    "measure": "column name to measure (required for sum/average)",
    "dimension": "column name to group by (if needed)",
    "multiSeries": "true for multi-series comparisons (e.g., 'A vs B by time')",
    "seriesDimension": "column name to separate series by (when multiSeries is true)",
    "filters": [
      {
        "column": "column name",
        "operator": "=" | ">=" | "<=" | ">" | "<" | "IN" | "LIKE",
        "value": "single value OR array of values for IN operator"
      }
    ]
  },
  "chartType": "one of: bar, line, pie, scatter, area",
  "explanation": "why this visualization is suitable"
}

IMPORTANT INSTRUCTIONS:
1. For comparisons between multiple values (like "Kentucky vs California"), use the IN operator with an array of values
2. For time-based queries, use appropriate date filtering with >= and <= operators
3. CRITICAL: When you see "vs" or "versus" with time words like "by month", "by year", "over time", set "multiSeries": true
4. For multi-series queries, set "dimension" to the TIME column and "seriesDimension" to the COMPARISON column
5. For sales/revenue queries, use "sum" type with the appropriate measure column
6. Choose chart types wisely: line for time trends with comparisons, bar for simple comparisons, pie for parts of whole

PATTERN DETECTION:
- "A vs B by [time]" → multiSeries: true, dimension: [time column], seriesDimension: [location/category column]
- "A vs B" (no time) → multiSeries: false, dimension: [location/category column]
- "A over time" → multiSeries: false, dimension: [time column]

EXAMPLES:

For "show me sales in Kentucky vs California by month" or "sales for Kentucky vs California by month":
{
  "dataQuery": {
    "type": "sum",
    "measure": "Sales", 
    "dimension": "OrderDate",
    "multiSeries": true,
    "seriesDimension": "State",
    "filters": [
      {
        "column": "State",
        "operator": "IN",
        "value": ["Kentucky", "California"]
      }
    ]
  },
  "chartType": "line",
  "explanation": "Line chart is perfect for comparing sales trends between states over time"
}

For "show me sales for Kentucky vs California" (simple comparison):
{
  "dataQuery": {
    "type": "sum",
    "measure": "Sales", 
    "dimension": "State",
    "filters": [
      {
        "column": "State",
        "operator": "IN",
        "value": ["Kentucky", "California"]
      }
    ]
  },
  "chartType": "bar",
  "explanation": "Bar chart is perfect for comparing total sales between different states"
}

For "orders in Kentucky in November 2016":
{
  "dataQuery": {
    "type": "count",
    "dimension": "OrderDate",
    "filters": [
      {
        "column": "State",
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
        "operator": "<=",
        "value": "2016-11-30"
      }
    ]
  },
  "chartType": "line",
  "explanation": "Line chart shows the trend of orders over time within the specified period"
}`;

    console.log('=== AI CHART GENERATION DEBUG ===');
    console.log('User Query:', query);
    console.log('Dataset type:', datasetDetails.type);
    console.log('Available columns:', datasetDetails.columns);
    console.log('Sample data:', JSON.stringify(datasetDetails.sampleData?.[0], null, 2));
    
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

    console.log('Raw OpenAI response:', completion.choices[0].message.content);

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
      console.log('=== PARSED AI RESPONSE ===');
      console.log('Data Query Type:', aiResponse.dataQuery?.type);
      console.log('Measure:', aiResponse.dataQuery?.measure);
      console.log('Dimension:', aiResponse.dataQuery?.dimension);
      console.log('Multi-Series:', aiResponse.dataQuery?.multiSeries);
      console.log('Series Dimension:', aiResponse.dataQuery?.seriesDimension);
      console.log('Filters:', JSON.stringify(aiResponse.dataQuery?.filters, null, 2));
      console.log('Chart Type:', aiResponse.chartType);
      console.log('Explanation:', aiResponse.explanation);
      
      // Auto-detect multi-series queries if AI missed it
      if (!aiResponse.dataQuery.multiSeries && 
          aiResponse.dataQuery.filters?.some(f => f.operator === 'IN' && Array.isArray(f.value)) &&
          aiResponse.dataQuery.dimension?.toLowerCase().includes('date') &&
          (query.toLowerCase().includes('vs') || query.toLowerCase().includes('versus'))) {
        
        console.log('=== AUTO-DETECTING MULTI-SERIES QUERY ===');
        aiResponse.dataQuery.multiSeries = true;
        
        // Find the filter with IN operator to determine series dimension
        const inFilter = aiResponse.dataQuery.filters.find(f => f.operator === 'IN' && Array.isArray(f.value));
        if (inFilter) {
          aiResponse.dataQuery.seriesDimension = inFilter.column;
          console.log('Auto-detected series dimension:', inFilter.column);
        }
      }
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
    console.log('Starting data processing for', datasetDetails.length, 'datasets');
    
    for (const dataset of datasetDetails) {
      console.log('Processing dataset:', {
        type: dataset.database.type,
        name: dataset.name,
        schema: dataset.schema,
        table: dataset.table
      });
      
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
                case 'IN':
                  // Handle IN operator with array of values
                  if (Array.isArray(filterValue)) {
                    return filterValue.some(val => 
                      value?.toString().toLowerCase() === val.toLowerCase()
                    );
                  }
                  return false;
                case 'LIKE':
                  return value?.toString().toLowerCase().includes(filterValue.toLowerCase());
                case '>':
                  return parseFloat(value) > parseFloat(filterValue);
                case '<':
                  return parseFloat(value) < parseFloat(filterValue);
                case '>=':
                  return parseFloat(value) >= parseFloat(filterValue);
                case '<=':
                  return parseFloat(value) <= parseFloat(filterValue);
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
              // Check if this is a multi-series query (e.g., "Kentucky vs California by month")
              if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
                console.log('=== PROCESSING MULTI-SERIES EXCEL DATA ===');
                console.log('Dimension (time):', aiResponse.dataQuery.dimension);
                console.log('Series dimension (category):', aiResponse.dataQuery.seriesDimension);
                console.log('Measure:', aiResponse.dataQuery.measure);
                
                // Multi-series grouping (e.g., group by month, separate series for each state)
                const seriesData = {};
                const allLabels = new Set();
                
                filteredData.forEach(row => {
                  let key = row[aiResponse.dataQuery.dimension];
                  const seriesKey = row[aiResponse.dataQuery.seriesDimension];
                  
                  console.log('Processing row:', {
                    timeKey: key,
                    seriesKey: seriesKey,
                    measure: row[aiResponse.dataQuery.measure]
                  });
                  
                  // If the dimension is a date field, group by month
                  if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                    const date = parseDate(row[aiResponse.dataQuery.dimension]);
                    if (date) {
                      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    }
                  }
                  
                  const value = parseFloat(row[aiResponse.dataQuery.measure]) || 0;
                  
                  if (!seriesData[seriesKey]) {
                    seriesData[seriesKey] = {};
                  }
                  if (!seriesData[seriesKey][key]) {
                    seriesData[seriesKey][key] = 0;
                  }
                  seriesData[seriesKey][key] += value;
                  allLabels.add(key);
                });
                
                console.log('Series data:', seriesData);
                console.log('All labels:', Array.from(allLabels));
                
                // Sort labels if they're dates
                const labels = Array.from(allLabels);
                if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                  labels.sort();
                }
                
                // Create datasets for each series
                const datasets = Object.keys(seriesData).map(seriesKey => ({
                  label: `${seriesKey} - ${aiResponse.dataQuery.measure}`,
                  data: labels.map(label => seriesData[seriesKey][label] || 0)
                }));
                
                console.log('Final datasets:', datasets);
                
                result = {
                  labels: labels,
                  datasets: datasets
                };
              } else {
                // Single-series grouping (original logic)
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
              }
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
      } else if (dataset.database.type === 'CSV') {
        // CSV aggregation via DuckDB SQL (push-down filters & grouping)
        console.log('Aggregating CSV via DuckDB');
        try {
          const filePath = dataset.database.localFilePath || dataset.database.filePath;
          if (!filePath) throw new Error('File path missing for CSV dataset');
          const normalizedPath = filePath.replace(/\\/g, '/');

          const dim = aiResponse.dataQuery.dimension;
          const seriesDim = aiResponse.dataQuery.seriesDimension;
          const measure = aiResponse.dataQuery.measure;
          const isDateDim = dim && dim.toLowerCase().includes('date');
          const quote = c => `"${c.replace(/"/g, '')}"`;
          const groupExpr = dim ? (isDateDim ? `strftime(${quote(dim)}, '%Y-%m')` : quote(dim)) : null;
          const seriesExpr = (aiResponse.dataQuery.multiSeries && seriesDim) ? quote(seriesDim) : null;

          let aggExpr;
          switch (aiResponse.dataQuery.type) {
            case 'count': aggExpr = 'COUNT(*) AS value'; break;
            case 'sum': aggExpr = `SUM(${quote(measure)}) AS value`; break;
            case 'average': aggExpr = `AVG(${quote(measure)}) AS value`; break;
            default: aggExpr = 'COUNT(*) AS value';
          }

          const selectParts = [];
          if (groupExpr) selectParts.push(`${groupExpr} AS group_key`);
          if (seriesExpr) selectParts.push(`${seriesExpr} AS series_key`);
          selectParts.push(aggExpr);
          let sql = `SELECT ${selectParts.join(', ')} FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=false)`;

          const whereClauses = [];
          (aiResponse.dataQuery.filters || []).forEach(f => {
            if (!f.column || f.value === undefined) return;
            const col = quote(f.column);
            if (f.operator === 'IN' && Array.isArray(f.value)) {
              const vals = f.value.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',');
              whereClauses.push(`${col} IN (${vals})`);
            } else if (f.operator === 'LIKE') {
              whereClauses.push(`${col} LIKE '%${String(f.value).replace(/'/g, "''")}%'`);
            } else {
              whereClauses.push(`${col} ${f.operator} '${String(f.value).replace(/'/g, "''")}'`);
            }
          });
          if (whereClauses.length) sql += ` WHERE ${whereClauses.join(' AND ')}`;
          if (groupExpr || seriesExpr) {
            const grpCols = [];
            if (groupExpr) grpCols.push('group_key');
            if (seriesExpr) grpCols.push('series_key');
            sql += ' GROUP BY ' + grpCols.join(', ');
            if (groupExpr) sql += ' ORDER BY group_key';
          }

          console.log('=== CSV AGGREGATION DEBUG ===');
          console.log('AI Response:', JSON.stringify(aiResponse.dataQuery, null, 2));
          console.log('Dimension:', dim);
          console.log('Is Date Dimension:', isDateDim);
          console.log('Measure:', measure);
          console.log('Filters:', aiResponse.dataQuery.filters);
          console.log('Executing CSV aggregation SQL:', sql);
          const rows = await duckdbService.executeQuery(filePath, sql);
          console.log('CSV aggregation returned', rows.length, 'rows');
          if (rows.length > 0) {
            console.log('First few rows:', rows.slice(0, 3));
          }

          let result;
          const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          if (rows.length === 0) {
            result = { labels: [], datasets: [{ label: 'Empty', data: [] }] };
          } else if (seriesExpr) {
            const labelsSet = new Set();
            const seriesMap = {};
            rows.forEach(r => {
              labelsSet.add(r.group_key);
              const sk = r.series_key;
              if (!seriesMap[sk]) seriesMap[sk] = {};
              seriesMap[sk][r.group_key] = Number(r.value) || 0;
            });
            const sortedKeys = Array.from(labelsSet).sort();
            let labels = sortedKeys;
            if (isDateDim) {
              labels = sortedKeys.map(k => {
                const [y,m] = k.split('-');
                return `${monthNames[parseInt(m)-1]} ${y}`;
              });
            }
            const datasets = Object.keys(seriesMap).map(sk => ({
              label: sk + (measure ? ` - ${measure}` : ''),
              data: sortedKeys.map(l => seriesMap[sk][l] || 0)
            }));
            result = { labels, datasets };
          } else if (groupExpr) {
            const keys = rows.map(r => r.group_key);
            let labels = keys;
            if (isDateDim) {
              labels = keys.map(k => { const [y,m]=k.split('-'); return `${monthNames[parseInt(m)-1]} ${y}`; });
            }
            result = { labels, datasets: [{ label: `${aiResponse.dataQuery.type} ${measure || ''}`.trim(), data: rows.map(r => Number(r.value) || 0) }] };
          } else {
            result = { labels: ['Total'], datasets: [{ label: `${aiResponse.dataQuery.type} ${measure || ''}`.trim(), data: [Number(rows[0].value) || 0] }] };
          }

          chartData = result;
          break;
        } catch (err) {
          console.error('CSV aggregation failed:', err.message);
          const sample = dataset.database.sampleData || [];
          chartData = { labels: ['Sample Count'], datasets: [{ label: 'Count', data: [sample.length] }] };
          break;
        }
      } else if (dataset.database.type === 'Google BigQuery') {
        // Handle BigQuery data processing
        console.log('Processing BigQuery data for chart generation');
        
        try {
          // Build SQL query based on the AI response
          let sqlQuery = '';
          const tableName = `\`${dataset.database.projectId}.${dataset.schema}.${dataset.table}\``;
          
          // Helper function to escape column names for BigQuery
          const escapeColumnName = (columnName) => {
            // If column name contains spaces or special characters, wrap in backticks
            if (columnName.includes(' ') || columnName.includes('-') || /[^a-zA-Z0-9_]/.test(columnName)) {
              return `\`${columnName}\``;
            }
            return columnName;
          };
          
          switch (aiResponse.dataQuery.type) {
            case 'count':
              if (aiResponse.dataQuery.dimension) {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                sqlQuery = `SELECT ${dimension}, COUNT(*) as count FROM ${tableName}`;
              } else {
                sqlQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
              }
              break;
            case 'sum':
              if (aiResponse.dataQuery.dimension) {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                const measure = escapeColumnName(aiResponse.dataQuery.measure);
                
                // Check if this is a multi-series query
                if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
                  const seriesDimension = escapeColumnName(aiResponse.dataQuery.seriesDimension);
                  
                  // For date dimensions, aggregate by month for better visualization
                  if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                    sqlQuery = `SELECT 
                      FORMAT_DATE('%Y-%m', ${dimension}) as month_year,
                      ${seriesDimension}, 
                      SUM(${measure}) as total 
                    FROM ${tableName}`;
                  } else {
                    sqlQuery = `SELECT ${dimension}, ${seriesDimension}, SUM(${measure}) as total FROM ${tableName}`;
                  }
                  console.log('Generated multi-series BigQuery SQL:', sqlQuery);
                } else {
                  // For date dimensions, aggregate by month for single series too
                  if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                    sqlQuery = `SELECT 
                      FORMAT_DATE('%Y-%m', ${dimension}) as month_year,
                      SUM(${measure}) as total 
                    FROM ${tableName}`;
                  } else {
                    sqlQuery = `SELECT ${dimension}, SUM(${measure}) as total FROM ${tableName}`;
                  }
                  console.log('Generated single-series BigQuery SQL:', sqlQuery);
                }
              } else {
                const measure = escapeColumnName(aiResponse.dataQuery.measure);
                sqlQuery = `SELECT SUM(${measure}) as total FROM ${tableName}`;
              }
              break;
            case 'average':
              if (aiResponse.dataQuery.dimension) {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                const measure = escapeColumnName(aiResponse.dataQuery.measure);
                sqlQuery = `SELECT ${dimension}, AVG(${measure}) as average FROM ${tableName}`;
              } else {
                const measure = escapeColumnName(aiResponse.dataQuery.measure);
                sqlQuery = `SELECT AVG(${measure}) as average FROM ${tableName}`;
              }
              break;
            default:
              // For other types, just select the data with optional filtering
              sqlQuery = `SELECT * FROM ${tableName}`;
          }
          
          // Add WHERE clause if there are filters
          if (aiResponse.dataQuery.filters && aiResponse.dataQuery.filters.length > 0) {
            const whereClause = aiResponse.dataQuery.filters.map(filter => {
              const columnName = escapeColumnName(filter.column);
              
              // Handle IN operator with array values
              if (filter.operator === 'IN' && Array.isArray(filter.value)) {
                const valueList = filter.value.map(val => `'${val}'`).join(', ');
                return `${columnName} IN (${valueList})`;
              }
              // Handle LIKE operator for partial matches
              else if (filter.operator === 'LIKE') {
                return `${columnName} LIKE '%${filter.value}%'`;
              }
              // Handle regular operators
              else {
                // Handle different data types for filtering
                if (typeof filter.value === 'string') {
                  return `${columnName} ${filter.operator} '${filter.value}'`;
                } else {
                  return `${columnName} ${filter.operator} ${filter.value}`;
                }
              }
            }).join(' AND ');
            sqlQuery += ` WHERE ${whereClause}`;
          }
          
          // Add GROUP BY if there's a dimension for aggregation queries
          if (aiResponse.dataQuery.dimension && ['count', 'sum', 'average'].includes(aiResponse.dataQuery.type)) {
            if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
              const seriesDimension = escapeColumnName(aiResponse.dataQuery.seriesDimension);
              // For date dimensions, group by the formatted month_year
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                sqlQuery += ` GROUP BY month_year, ${seriesDimension}`;
              } else {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                sqlQuery += ` GROUP BY ${dimension}, ${seriesDimension}`;
              }
            } else {
              // For date dimensions, group by the formatted month_year
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                sqlQuery += ` GROUP BY month_year`;
              } else {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                sqlQuery += ` GROUP BY ${dimension}`;
              }
            }
          }
          
          // Add HAVING clause to filter out zero values for sum aggregations
          if (aiResponse.dataQuery.type === 'sum') {
            sqlQuery += ` HAVING total > 0`;
          }
          
          // Add ORDER BY for better presentation
          if (aiResponse.dataQuery.dimension) {
            if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
              const seriesDimension = escapeColumnName(aiResponse.dataQuery.seriesDimension);
              // For date dimensions, order by the formatted month_year
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                sqlQuery += ` ORDER BY month_year, ${seriesDimension}`;
              } else {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                sqlQuery += ` ORDER BY ${dimension}, ${seriesDimension}`;
              }
            } else {
              // For date dimensions, order by the formatted month_year
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                sqlQuery += ` ORDER BY month_year`;
              } else {
                const dimension = escapeColumnName(aiResponse.dataQuery.dimension);
                sqlQuery += ` ORDER BY ${dimension}`;
              }
            }
          }
          
          // Limit results to prevent excessive data
          sqlQuery += ' LIMIT 1000';
          
          console.log('Executing BigQuery SQL:', sqlQuery);
          
          // Execute the query
          const queryResults = await bigqueryService.executeQuery(
            dataset.database.projectId,
            dataset.database.credentials,
            sqlQuery
          );
          
          console.log('BigQuery results:', queryResults.length, 'rows');
          
          // Debug: Log first few rows to understand data structure
          if (queryResults.length > 0) {
            console.log('Sample query result:', JSON.stringify(queryResults[0], null, 2));
          }
          
          // Process results into chart data format
          let result = null;
          
          if (aiResponse.dataQuery.dimension && queryResults.length > 0) {
            // Helper function to extract proper value from BigQuery results
            const extractValue = (value) => {
              if (value && typeof value === 'object' && value.value !== undefined) {
                // Handle BigQuery date/datetime objects
                return value.value;
              }
              return value;
            };
            
            // Check if this is a multi-series query
            if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
              console.log('=== PROCESSING MULTI-SERIES BIGQUERY DATA ===');
              console.log('Dimension (time):', aiResponse.dataQuery.dimension);
              console.log('Series dimension (category):', aiResponse.dataQuery.seriesDimension);
              console.log('Measure:', aiResponse.dataQuery.measure);
              console.log('Query results count:', queryResults.length);
              
              // Multi-series processing (e.g., Kentucky vs California by month)
              const seriesData = {};
              const allLabels = new Set();
              
              queryResults.forEach((row, index) => {
                // For date dimensions, use month_year field; otherwise use the original dimension
                let labelValue = aiResponse.dataQuery.dimension.toLowerCase().includes('date') 
                  ? extractValue(row.month_year) 
                  : extractValue(row[aiResponse.dataQuery.dimension]);
                  
                const seriesValue = extractValue(row[aiResponse.dataQuery.seriesDimension]);
                
                console.log(`Processing BigQuery row ${index}:`, {
                  rawRow: row,
                  dimension: aiResponse.dataQuery.dimension,
                  seriesDimension: aiResponse.dataQuery.seriesDimension,
                  labelValue: labelValue,
                  seriesValue: seriesValue,
                  totalValue: row.total
                });
                
                // No need for additional date formatting since we're using FORMAT_DATE in SQL
                labelValue = String(labelValue || '');
                const dataValue = parseFloat(extractValue(row.total || row.count || row.average)) || 0;
                
                if (!seriesData[seriesValue]) {
                  seriesData[seriesValue] = {};
                }
                seriesData[seriesValue][labelValue] = dataValue;
                allLabels.add(labelValue);
              });
              
              console.log('Series data after processing:', seriesData);
              console.log('All labels:', Array.from(allLabels));
              
              // Sort labels if they're dates
              let labels = Array.from(allLabels);
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                labels.sort();
                // Convert YYYY-MM to friendly month names
                const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                labels = labels.map(k => {
                  if (k && k.includes('-')) {
                    const [y,m] = k.split('-');
                    return `${monthNames[parseInt(m)-1]} ${y}`;
                  }
                  return k;
                });
              }
              
              // Create datasets for each series (use original sorted keys for data lookup)
              const originalKeys = Array.from(allLabels).sort();
              const datasets = Object.keys(seriesData).map(seriesKey => ({
                label: `${seriesKey} - ${aiResponse.dataQuery.measure || 'Count'}`,
                data: originalKeys.map(label => seriesData[seriesKey][label] || 0)
              }));
              
              console.log('Final BigQuery datasets:', datasets);
              
              result = {
                labels: labels,
                datasets: datasets
              };
            } else {
              // Single-series processing (original logic)
              let labels = queryResults.map(row => {
                // For date dimensions, use month_year field; otherwise use the original dimension
                const value = aiResponse.dataQuery.dimension.toLowerCase().includes('date') 
                  ? extractValue(row.month_year) 
                  : extractValue(row[aiResponse.dataQuery.dimension]);
                
                return String(value || '');
              });
              
              // Convert YYYY-MM to friendly month names for date dimensions
              if (aiResponse.dataQuery.dimension.toLowerCase().includes('date')) {
                const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                labels = labels.map(k => {
                  if (k && k.includes('-')) {
                    const [y,m] = k.split('-');
                    return `${monthNames[parseInt(m)-1]} ${y}`;
                  }
                  return k;
                });
              }
              
              let dataValues = [];
              let label = '';
              
              switch (aiResponse.dataQuery.type) {
                case 'count':
                  dataValues = queryResults.map(row => {
                    const value = extractValue(row.count);
                    return parseFloat(value) || 0;
                  });
                  label = 'Count';
                  break;
                case 'sum':
                  dataValues = queryResults.map(row => {
                    const value = extractValue(row.total);
                    return parseFloat(value) || 0;
                  });
                  label = `Sum of ${aiResponse.dataQuery.measure}`;
                  break;
                case 'average':
                  dataValues = queryResults.map(row => {
                    const value = extractValue(row.average);
                    return parseFloat(value) || 0;
                  });
                  label = `Average of ${aiResponse.dataQuery.measure}`;
                  break;
                default:
                  // For other types, just try to extract numeric values
                  dataValues = queryResults.map(row => {
                    const keys = Object.keys(row);
                    const numericKey = keys.find(key => key !== aiResponse.dataQuery.dimension);
                    if (numericKey) {
                      const value = extractValue(row[numericKey]);
                      return parseFloat(value) || 0;
                    }
                    return 0;
                  });
                  label = 'Value';
              }
              
              result = {
                labels: labels,
                datasets: [{
                  label: label,
                  data: dataValues
                }]
              };
            }
          } else if (queryResults.length > 0) {
            // Single value result
            const firstRow = queryResults[0];
            let value = 0;
            let label = '';
            
            switch (aiResponse.dataQuery.type) {
              case 'count':
                value = firstRow.count || 0;
                label = 'Total Count';
                break;
              case 'sum':
                value = firstRow.total || 0;
                label = `Total ${aiResponse.dataQuery.measure}`;
                break;
              case 'average':
                value = firstRow.average || 0;
                label = `Average ${aiResponse.dataQuery.measure}`;
                break;
              default:
                // Use first numeric value found
                const numericValue = Object.values(firstRow).find(val => typeof val === 'number');
                value = numericValue || 0;
                label = 'Value';
            }
            
            result = {
              labels: ['Total'],
              datasets: [{
                label: label,
                data: [value]
              }]
            };
          }
          
          if (result) {
            chartData = result;
          }
          
        } catch (error) {
          console.error('Error processing BigQuery data:', error);
          throw new Error(`Error processing BigQuery data: ${error.message}`);
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
    if (chartData.datasets) {
      const colors = [
        { bg: 'rgba(54, 162, 235, 0.5)', border: 'rgba(54, 162, 235, 1)' }, // Blue
        { bg: 'rgba(255, 99, 132, 0.5)', border: 'rgba(255, 99, 132, 1)' }, // Red  
        { bg: 'rgba(75, 192, 192, 0.5)', border: 'rgba(75, 192, 192, 1)' }, // Green
        { bg: 'rgba(255, 205, 86, 0.5)', border: 'rgba(255, 205, 86, 1)' }, // Yellow
        { bg: 'rgba(153, 102, 255, 0.5)', border: 'rgba(153, 102, 255, 1)' }, // Purple
        { bg: 'rgba(255, 159, 64, 0.5)', border: 'rgba(255, 159, 64, 1)' }  // Orange
      ];
      
      chartData.datasets.forEach((dataset, index) => {
        const colorIndex = index % colors.length;
        chartData.datasets[index] = {
          ...dataset,
          backgroundColor: colors[colorIndex].bg,
          borderColor: colors[colorIndex].border,
          borderWidth: 2,
          fill: false // Important for line charts
        };
      });
    }

    // Generate SQL query from the data query specification (for display purposes)
    let sqlQuery = '';
    if (aiResponse.dataQuery.type === 'count') {
      sqlQuery = 'SELECT COUNT(*)';
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
        sqlQuery += `, ${aiResponse.dataQuery.seriesDimension}`;
      }
      sqlQuery += ' FROM data';
    } else if (aiResponse.dataQuery.type === 'sum') {
      sqlQuery = `SELECT SUM(${aiResponse.dataQuery.measure})`;
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
        sqlQuery += `, ${aiResponse.dataQuery.seriesDimension}`;
      }
      sqlQuery += ' FROM data';
    } else if (aiResponse.dataQuery.type === 'average') {
      sqlQuery = `SELECT AVG(${aiResponse.dataQuery.measure})`;
      if (aiResponse.dataQuery.dimension) {
        sqlQuery += `, ${aiResponse.dataQuery.dimension}`;
      }
      if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
        sqlQuery += `, ${aiResponse.dataQuery.seriesDimension}`;
      }
      sqlQuery += ' FROM data';
    }

    // Add WHERE clause if there are filters
    if (aiResponse.dataQuery.filters && aiResponse.dataQuery.filters.length > 0) {
      sqlQuery += ' WHERE ' + aiResponse.dataQuery.filters.map(filter => {
        if (filter.operator === 'IN' && Array.isArray(filter.value)) {
          const valueList = filter.value.map(val => `'${val}'`).join(', ');
          return `${filter.column} IN (${valueList})`;
        } else {
          return `${filter.column} ${filter.operator} '${filter.value}'`;
        }
      }).join(' AND ');
    }

    // Add GROUP BY if there's a dimension
    if (aiResponse.dataQuery.dimension) {
      sqlQuery += ` GROUP BY ${aiResponse.dataQuery.dimension}`;
      if (aiResponse.dataQuery.multiSeries && aiResponse.dataQuery.seriesDimension) {
        sqlQuery += `, ${aiResponse.dataQuery.seriesDimension}`;
      }
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

/**
 * @route   POST /api/workspaces/:workspaceId/charts/execute-sql
 * @desc    Execute a custom SQL query against a dataset
 * @access  Private
 */
router.post('/execute-sql', async (req, res) => {
  try {
    const { sql, dataset } = req.body;
    const { workspaceId } = req.params;
    
    if (!sql || !dataset || !workspaceId) {
      return res.status(400).json({ error: 'Missing required fields: sql, dataset, workspaceId' });
    }

    // Find the dataset
    const datasetDoc = await Dataset.findOne({ _id: dataset, workspace: workspaceId });
    if (!datasetDoc) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // For file-based datasets, we'll need to read the file and apply the SQL
    if (datasetDoc.type === 'XLS' || datasetDoc.type === 'CSV') {
      if (!datasetDoc.filePath) {
        return res.status(400).json({ error: 'Dataset file not found' });
      }

      // Read the file data
      let data;
      if (datasetDoc.type === 'XLS') {
        const workbook = xlsx.readFile(datasetDoc.filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = xlsx.utils.sheet_to_json(worksheet);
      } else if (datasetDoc.type === 'CSV') {
        const fileContent = fs.readFileSync(datasetDoc.filePath, 'utf8');
        data = csv.parse(fileContent, { columns: true });
      }

      // For now, we'll return the data as-is since implementing a full SQL parser is complex
      // In a production environment, you'd want to use a proper SQL execution engine
      res.json({ 
        data: data,
        message: 'SQL execution is currently limited to file reading. Full SQL parsing will be implemented in future versions.'
      });
    } else {
      // For database connections, you could execute the SQL directly
      res.status(400).json({ error: 'SQL execution for database connections not yet implemented' });
    }
  } catch (error) {
    console.error('Error executing SQL:', error);
    res.status(500).json({ error: 'Internal server error' });
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