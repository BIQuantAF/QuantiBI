const { BigQuery } = require('@google-cloud/bigquery');

/**
 * Create a BigQuery client from stored credentials and projectId
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @returns {BigQuery}
 */
function createBigQueryClient(projectId, credentialsJson) {
  let credentials;
  if (typeof credentialsJson === 'string') {
    try {
      credentials = JSON.parse(credentialsJson);
    } catch (err) {
      throw new Error('Invalid JSON credentials');
    }
  } else {
    credentials = credentialsJson;
  }
  return new BigQuery({
    projectId,
    credentials,
  });
}

/**
 * Test BigQuery connection by listing datasets
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function testBigQueryConnection(projectId, credentialsJson) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    await bigquery.getDatasets();
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * List all datasets (schemas) in a BigQuery project
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @returns {Promise<string[]>}
 */
async function listDatasets(projectId, credentialsJson) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    const [datasets] = await bigquery.getDatasets();
    return datasets.map(dataset => dataset.id);
  } catch (err) {
    throw new Error(`Failed to list datasets: ${err.message}`);
  }
}

/**
 * List all tables in a BigQuery dataset
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @param {string} datasetId
 * @returns {Promise<string[]>}
 */
async function listTables(projectId, credentialsJson, datasetId) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    const [tables] = await bigquery.dataset(datasetId).getTables();
    return tables.map(table => table.id);
  } catch (err) {
    throw new Error(`Failed to list tables: ${err.message}`);
  }
}

/**
 * Get table schema and sample data from BigQuery
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @param {string} datasetId
 * @param {string} tableId
 * @param {number} maxRows - Maximum number of rows to fetch
 * @returns {Promise<{columns: string[], sampleData: any[], totalRows: number}>}
 */
async function getTableData(projectId, credentialsJson, datasetId, tableId, maxRows = 100) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    const table = bigquery.dataset(datasetId).table(tableId);
    
    // Get table metadata for schema info
    const [metadata] = await table.getMetadata();
    const columns = metadata.schema.fields.map(field => field.name);
    
    // Get sample data
    const query = `SELECT * FROM \`${projectId}.${datasetId}.${tableId}\` LIMIT ${maxRows}`;
    const [rows] = await bigquery.query({ query });
    
    return {
      columns,
      sampleData: rows.slice(0, 5), // Only return first 5 rows as sample
      totalRows: rows.length
    };
  } catch (err) {
    throw new Error(`Failed to get table data: ${err.message}`);
  }
}

/**
 * Execute a custom query on BigQuery
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @param {string} query
 * @returns {Promise<any[]>}
 */
async function executeQuery(projectId, credentialsJson, query) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    const [rows] = await bigquery.query({ query });
    return rows;
  } catch (err) {
    throw new Error(`Failed to execute query: ${err.message}`);
  }
}

/**
 * Validate that a dataset and table exist in BigQuery
 * @param {string} projectId
 * @param {string|object} credentialsJson
 * @param {string} datasetId
 * @param {string} tableId
 * @returns {Promise<{exists: boolean, message: string}>}
 */
async function validateDatasetAndTable(projectId, credentialsJson, datasetId, tableId) {
  try {
    const bigquery = createBigQueryClient(projectId, credentialsJson);
    
    // Check if dataset exists
    try {
      await bigquery.dataset(datasetId).get();
    } catch (err) {
      if (err.code === 404) {
        return { 
          exists: false, 
          message: `Dataset '${datasetId}' not found in project '${projectId}'. Available datasets can be listed using the schemas endpoint.` 
        };
      }
      throw err;
    }
    
    // Check if table exists
    try {
      await bigquery.dataset(datasetId).table(tableId).get();
    } catch (err) {
      if (err.code === 404) {
        return { 
          exists: false, 
          message: `Table '${tableId}' not found in dataset '${datasetId}'. Available tables can be listed using the tables endpoint.` 
        };
      }
      throw err;
    }
    
    return { exists: true, message: 'Dataset and table exist' };
  } catch (err) {
    return { exists: false, message: `Validation error: ${err.message}` };
  }
}

module.exports = {
  createBigQueryClient,
  testBigQueryConnection,
  listDatasets,
  listTables,
  getTableData,
  executeQuery,
  validateDatasetAndTable,
};
