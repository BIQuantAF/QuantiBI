const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Physical', 'Virtual'],
    required: true
  },
  database: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Database',
    required: true
  },
  schema: {
    type: String,
    required: true
  },
  table: {
    type: String,
    required: true
  },
  owners: [{
    type: String,
    required: true
  }],
  lastModified: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastModified timestamp before saving
datasetSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Dataset', datasetSchema); 