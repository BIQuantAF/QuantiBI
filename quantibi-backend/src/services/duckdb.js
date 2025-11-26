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
      
      let describeQuery = '';
      if (ext === '.csv') {
        describeQuery = `DESCRIBE read_csv_auto('${filePath.replace(/\\/g, '\\\\')}')`;
      } else if (['.parquet', '.pq'].includes(ext)) {
        describeQuery = `DESCRIBE read_parquet('${filePath.replace(/\\/g, '\\\\')}')`;
      } else if (ext === '.json') {
        describeQuery = `DESCRIBE read_json_auto('${filePath.replace(/\\/g, '\\\\')}')`;
      } else {
        conn.close();
        return reject(new Error(`Unsupported file format: ${ext}`));
      }
      
      conn.all(describeQuery, (err, result) => {
        conn.close();
        if (err) {
          console.error('❌ Schema detection error:', err);
          return reject(new Error(`Failed to detect schema: ${err.message}`));
        }
        
        // Convert DuckDB schema to {name, type} format
        const schema = result.map(row => ({
          name: row.column_name,
          type: row.column_type
        }));
        
        console.log(`✅ Schema detected: ${schema.length} columns`);
        resolve(schema);
      });
    } catch (error) {
      console.error('❌ Schema detection error:', error);
      reject(new Error(`Failed to detect schema: ${error.message}`));
    }
  });
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
      
      let readQuery = '';
      if (ext === '.csv') {
        readQuery = `SELECT * FROM read_csv_auto('${filePath.replace(/\\/g, '\\\\')}') LIMIT ${limit}`;
      } else if (['.parquet', '.pq'].includes(ext)) {
        readQuery = `SELECT * FROM read_parquet('${filePath.replace(/\\/g, '\\\\')}') LIMIT ${limit}`;
      } else if (ext === '.json') {
        readQuery = `SELECT * FROM read_json_auto('${filePath.replace(/\\/g, '\\\\')}') LIMIT ${limit}`;
      } else {
        conn.close();
        return reject(new Error(`Unsupported file format: ${ext}`));
      }
      
      conn.all(readQuery, (err, result) => {
        conn.close();
        if (err) {
          console.error('❌ Sample data fetch error:', err);
          return reject(new Error(`Failed to fetch sample data: ${err.message}`));
        }
        
        const columns = result.length > 0 ? Object.keys(result[0]) : [];
        const rows = result.map(row => Object.values(row));
        
        resolve({
          columns,
          rows,
          totalRows: rows.length
        });
      });
    } catch (error) {
      console.error('❌ Sample data fetch error:', error);
      reject(new Error(`Failed to fetch sample data: ${error.message}`));
    }
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
  executeChartQuery,
  closeConnection
};
