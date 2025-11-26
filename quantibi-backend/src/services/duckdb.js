const duckdb = require('duckdb');
const fs = require('fs');
const path = require('path');

/**
 * DuckDB Service - Handles SQL queries on file-based data using DuckDB Node.js API
 * Supports CSV, Parquet, JSON, and other formats natively
 */

let db = null;

/**
 * Get or create a DuckDB database connection
 * @param {string} workspaceId - Workspace identifier (optional, for logging)
 * @returns {Object} - DuckDB database instance
 */
function getConnection(workspaceId = 'default') {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'temp', `duckdb-${workspaceId}.db`);
    const dir = path.dirname(dbPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    db = new duckdb.Database(dbPath);
    console.log(`✅ DuckDB connection initialized at: ${dbPath}`);
  }
  
  return db;
}

/**
 * Execute SQL query on a file using DuckDB's native query engine
 * @param {string} filePath - Local path to CSV/JSON/Parquet file
 * @param {string} sql - SQL query to execute
 * @returns {Promise<Array>} - Query results as array of objects
 */
async function executeQuery(filePath, sql) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const conn = getConnection().connect();
      
      // Execute the SQL query directly - DuckDB handles file reading
      conn.all(sql, (err, result) => {
        conn.close();
        if (err) {
          console.error('❌ Query execution error:', err);
          return reject(new Error(`Failed to execute query: ${err.message}`));
        }
        
        console.log(`✅ Query executed successfully: ${result ? result.length : 0} rows returned`);
        resolve(result || []);
      });
    } catch (error) {
      console.error('❌ Query execution error:', error);
      reject(new Error(`Failed to execute query: ${error.message}`));
    }
  });
}

/**
 * Detect schema from file using DuckDB's introspection
 * @param {string} filePath - Local path to CSV/JSON/Parquet file
 * @returns {Promise<Array>} - Array of {name, type} objects
 */
async function detectSchema(filePath) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const ext = path.extname(filePath).toLowerCase();
      const conn = getConnection().connect();
      
      // Convert Windows backslashes to forward slashes for SQL
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      let readQuery = '';
      if (ext === '.csv') {
        // Use read_csv_auto with ignore_errors=true to handle encoding issues and malformed rows
        // encoding detection will auto-detect UTF-8, UTF-16, Latin1, etc.
        readQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=false) LIMIT 1`;
      } else if (['.parquet', '.pq'].includes(ext)) {
        readQuery = `SELECT * FROM read_parquet('${normalizedPath}') LIMIT 1`;
      } else if (ext === '.json') {
        readQuery = `SELECT * FROM read_json_auto('${normalizedPath}') LIMIT 1`;
      } else {
        conn.close();
        return reject(new Error(`Unsupported file format: ${ext}`));
      }
      
      conn.all(readQuery, (err, result) => {
        if (err) {
          conn.close();
          console.error('❌ Schema detection error (attempt 1):', err.message.split('\n')[0]);
          
          // If first attempt fails and it's a CSV, try with more aggressive settings
          if (ext === '.csv' && err.message.includes('unicode')) {
            console.log('🔄 Retrying with fallback encoding settings...');
            
            // Try with all_varchar=true to treat all columns as text (no type inference)
            const fallbackQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=true) LIMIT 1`;
            
            conn.all(fallbackQuery, (retryErr, retryResult) => {
              if (retryErr) {
                conn.close();
                console.error('❌ Schema detection error (fallback):', retryErr.message.split('\n')[0]);
                return reject(new Error(`Failed to detect schema: ${retryErr.message.split('\n')[0]}`));
              }
              
              // Process retry result
              processSchemaResult(retryResult, conn, resolve);
            });
            return;
          }
          
          return reject(new Error(`Failed to detect schema: ${err.message.split('\n')[0]}`));
        }
        
        processSchemaResult(result, conn, resolve);
      });
    } catch (error) {
      console.error('❌ Schema detection error:', error);
      reject(new Error(`Failed to detect schema: ${error.message}`));
    }
  });
}

/**
 * Helper function to process schema detection results
 */
function processSchemaResult(result, conn, resolve) {
  // Get column info from the query result
  if (!result || result.length === 0) {
    conn.close();
    const schema = [];
    console.log('✅ Schema detected: 0 columns (empty file)');
    return resolve(schema);
  }
  
  // Extract schema from first row
  const firstRow = result[0];
  const schema = Object.entries(firstRow).map(([name, value]) => ({
    name,
    type: typeof value === 'bigint' ? 'BIGINT' : 
           typeof value === 'number' ? (Number.isInteger(value) ? 'INTEGER' : 'DOUBLE') :
           typeof value === 'boolean' ? 'BOOLEAN' :
           typeof value === 'string' ? 'VARCHAR' :
           value === null ? 'NULL' : 'UNKNOWN'
  }));
  
  conn.close();
  console.log(`✅ Schema detected: ${schema.length} columns`);
  resolve(schema);
}

/**
 * Get sample data from file
 * @param {string} filePath - Local path to CSV/JSON/Parquet file
 * @param {number} limit - Number of rows to fetch
 * @returns {Promise<Object>} - {columns, rows, totalRows}
 */
async function getSampleData(filePath, limit = 100) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const ext = path.extname(filePath).toLowerCase();
      const conn = getConnection().connect();
      
      // Convert Windows backslashes to forward slashes for SQL
      const normalizedPath = filePath.replace(/\\/g, '/');
      
      let readQuery = '';
      if (ext === '.csv') {
        // Use same encoding-tolerant options for sample data
        readQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=false) LIMIT ${limit}`;
      } else if (['.parquet', '.pq'].includes(ext)) {
        readQuery = `SELECT * FROM read_parquet('${normalizedPath}') LIMIT ${limit}`;
      } else if (ext === '.json') {
        readQuery = `SELECT * FROM read_json_auto('${normalizedPath}') LIMIT ${limit}`;
      } else {
        conn.close();
        return reject(new Error(`Unsupported file format: ${ext}`));
      }
      
      conn.all(readQuery, (err, result) => {
        if (err) {
          conn.close();
          console.error('❌ Sample data fetch error (attempt 1):', err.message.split('\n')[0]);
          
          // If first attempt fails and it's a CSV, try fallback
          if (ext === '.csv' && err.message.includes('unicode')) {
            console.log('🔄 Retrying sample data with fallback settings...');
            const fallbackQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=true) LIMIT ${limit}`;
            
            conn.all(fallbackQuery, (retryErr, retryResult) => {
              if (retryErr) {
                conn.close();
                console.error('❌ Sample data fetch error (fallback):', retryErr.message.split('\n')[0]);
                return reject(new Error(`Failed to fetch sample data: ${retryErr.message.split('\n')[0]}`));
              }
              
              processSampleDataResult(retryResult, conn, resolve);
            });
            return;
          }
          
          return reject(new Error(`Failed to fetch sample data: ${err.message.split('\n')[0]}`));
        }
        
        processSampleDataResult(result, conn, resolve);
      });
    } catch (error) {
      console.error('❌ Sample data fetch error:', error);
      reject(new Error(`Failed to fetch sample data: ${error.message}`));
    }
  });
}

/**
 * Get all (or up to maxRows) data rows from file for full chart processing
 * WARNING: For very large files this can be expensive; a future improvement
 * would push aggregation into SQL directly. For now we cap rows.
 * @param {string} filePath
 * @param {number} maxRows - safety cap to avoid loading extremely large files
 * @returns {Promise<Object>} - {columns, rows, totalRows}
 */
async function getAllData(filePath, maxRows = 100000) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }
      const ext = path.extname(filePath).toLowerCase();
      const conn = getConnection().connect();
      const normalizedPath = filePath.replace(/\\/g, '/');
      let readQuery = '';
      if (ext === '.csv') {
        readQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=false)`;
      } else if (['.parquet', '.pq'].includes(ext)) {
        readQuery = `SELECT * FROM read_parquet('${normalizedPath}')`;
      } else if (ext === '.json') {
        readQuery = `SELECT * FROM read_json_auto('${normalizedPath}')`;
      } else {
        conn.close();
        return reject(new Error(`Unsupported file format: ${ext}`));
      }
      // Apply safety cap
      readQuery += ` LIMIT ${maxRows}`;
      conn.all(readQuery, (err, result) => {
        if (err) {
          conn.close();
          console.error('❌ Full data fetch error (attempt 1):', err.message.split('\n')[0]);
          if (ext === '.csv' && err.message.includes('unicode')) {
            console.log('🔄 Retrying full data with fallback settings...');
            const fallbackQuery = `SELECT * FROM read_csv_auto('${normalizedPath}', ignore_errors=true, all_varchar=true) LIMIT ${maxRows}`;
            conn.all(fallbackQuery, (retryErr, retryResult) => {
              if (retryErr) {
                conn.close();
                console.error('❌ Full data fetch error (fallback):', retryErr.message.split('\n')[0]);
                return reject(new Error(`Failed to fetch full data: ${retryErr.message.split('\n')[0]}`));
              }
              const columns = retryResult.length > 0 ? Object.keys(retryResult[0]) : [];
              const rows = retryResult.map(r => Object.values(r));
              conn.close();
              return resolve({ columns, rows, totalRows: rows.length });
            });
            return;
          }
          return reject(new Error(`Failed to fetch full data: ${err.message.split('\n')[0]}`));
        }
        const columns = result.length > 0 ? Object.keys(result[0]) : [];
        const rows = result.map(r => Object.values(r));
        conn.close();
        resolve({ columns, rows, totalRows: rows.length });
      });
    } catch (error) {
      console.error('❌ Full data fetch error:', error);
      reject(new Error(`Failed to fetch full data: ${error.message}`));
    }
  });
}

/**
 * Helper function to process sample data results
 */
function processSampleDataResult(result, conn, resolve) {
  const columns = result.length > 0 ? Object.keys(result[0]) : [];
  const rows = result.map(row => Object.values(row));
  
  conn.close();
  resolve({
    columns,
    rows,
    totalRows: rows.length
  });
}

/**
 * Execute a chart query on a CSV/Parquet file
 * @param {string} filePath - Local path to data file
 * @param {string} chartQuery - SQL query for chart data
 * @returns {Promise<Object>} - Query result with columns and rows
 */
async function executeChartQuery(filePath, chartQuery) {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(filePath)) {
        return reject(new Error(`File not found: ${filePath}`));
      }

      const conn = getConnection().connect();
      
      conn.all(chartQuery, (err, result) => {
        conn.close();
        if (err) {
          console.error('❌ Chart query error:', err);
          return reject(new Error(`Failed to execute chart query: ${err.message}`));
        }
        
        const columns = result.length > 0 ? Object.keys(result[0]) : [];
        const rows = result.map(row => Object.values(row));
        
        console.log(`✅ Chart query executed: ${rows.length} data points`);
        resolve({ columns, rows });
      });
    } catch (error) {
      console.error('❌ Chart query error:', error);
      reject(new Error(`Failed to execute chart query: ${error.message}`));
    }
  });
}

/**
 * Close database connection
 */
function closeConnection() {
  if (db) {
    db.close();
    db = null;
    console.log('✅ DuckDB connection closed');
  }
}

module.exports = {
  getConnection,
  executeQuery,
  detectSchema,
  getSampleData,
  getAllData,
  executeChartQuery,
  closeConnection
};
