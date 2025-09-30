const mongoose = require('mongoose');

const databaseSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PostgreSQL', 'Snowflake', 'MySQL', 'Databricks', 'Google BigQuery', 'Google Sheets', 'CSV', 'XLS']
  },
  name: {
    type: String,
    required: true
  },
  displayName: {
    type: String,
    required: false
  },
  // Connection details for traditional databases
  host: String,
  port: Number,
  databaseName: String,
  username: String,
  password: String,
  
  // Google BigQuery specific fields
  projectId: String,
  datasetId: String,
  credentials: String,
  
  // Google Sheets specific fields
  spreadsheetUrl: String,
  sheetName: String,
  
  // File upload fields
  filePath: String,
  fileType: String,
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
databaseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Database = mongoose.model('Database', databaseSchema);

module.exports = Database; 