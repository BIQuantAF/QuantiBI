const mongoose = require('mongoose');

const chartSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['bar', 'line', 'pie', 'scatter', 'radar'],
    required: true
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  dataset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dataset',
    required: true
  },
  dashboard: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Dashboard'
  },
  owner: {
    type: String,
    required: true
  },
  query: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  style: {
    colors: [String],
    backgroundColor: String,
    borderColor: String,
    borderWidth: Number,
    borderRadius: Number,
    padding: Number,
    legend: {
      position: {
        type: String,
        enum: ['top', 'bottom', 'left', 'right'],
        default: 'top'
      },
      display: {
        type: Boolean,
        default: true
      }
    },
    title: {
      text: String,
      display: {
        type: Boolean,
        default: true
      },
      position: {
        type: String,
        enum: ['top', 'bottom'],
        default: 'top'
      }
    },
    axis: {
      x: {
        title: String,
        display: {
          type: Boolean,
          default: true
        }
      },
      y: {
        title: String,
        display: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  lastModified: {
    type: Date,
    default: Date.now
  }
});

// Update lastModified timestamp on save
chartSchema.pre('save', function(next) {
  this.lastModified = new Date();
  next();
});

module.exports = mongoose.model('Chart', chartSchema); 