const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  owner: {
    type: String, // Firebase UID
    required: true,
  },
  // Simple plan and usage tracking for single-user free/pro model
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  usage: {
    uploads: {
      type: Number,
      default: 0,
    },
    charts: {
      type: Number,
      default: 0,
    },
    reports: {
      type: Number,
      default: 0,
    },
  },
  // Optional payment subscription id (e.g. Stripe subscription)
  subscriptionId: {
    type: String,
    default: null,
  },
  members: [
    {
      uid: {
        type: String, // Firebase UID
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ['owner', 'admin', 'member', 'viewer'],
        default: 'member',
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  invites: [
    {
      email: {
        type: String,
        required: true,
      },
      role: {
        type: String,
        enum: ['admin', 'member', 'viewer'],
        default: 'member',
      },
      token: {
        type: String,
        required: true,
      },
      expiresAt: {
        type: Date,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
workspaceSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for faster queries
workspaceSchema.index({ owner: 1 });
workspaceSchema.index({ 'members.uid': 1 });
workspaceSchema.index({ 'invites.email': 1 });

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace; 