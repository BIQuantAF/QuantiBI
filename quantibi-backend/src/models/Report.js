const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
  },
  createdBy: {
    type: String, // Firebase UID
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  // Dataset ID that the report is based on
  datasetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    required: true,
  },
  // Chart IDs included in this report (auto-generated or user-added)
  chartIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chart',
    },
  ],
  // Report content sections
  sections: [
    {
      type: {
        type: String,
        enum: ['title', 'summary', 'metric', 'insight', 'chart', 'conclusion'],
      },
      title: String,
      content: String,
      chartId: mongoose.Schema.Types.ObjectId,
      metrics: {
        label: String,
        value: String,
        format: String,
      },
    },
  ],
  // AI-generated summary and insights
  summary: {
    type: String,
    default: '',
  },
  insights: [
    {
      type: String,
    },
  ],
  // Report status: draft, completed, failed
  status: {
    type: String,
    enum: ['draft', 'completed', 'failed'],
    default: 'draft',
  },
  // Error message if generation failed
  error: {
    type: String,
    default: null,
  },
  // Public sharing link
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

reportSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

reportSchema.index({ workspace: 1 });
reportSchema.index({ createdBy: 1 });
reportSchema.index({ datasetId: 1 });
reportSchema.index({ shareToken: 1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
