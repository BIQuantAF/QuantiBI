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
  // Chart IDs included in this report
  chartIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chart',
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

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
