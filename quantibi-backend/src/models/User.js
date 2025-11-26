const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String, // Firebase UID
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: false,
  },
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },
  usage: {
    uploads: { type: Number, default: 0 },
    charts: { type: Number, default: 0 },
    reports: { type: Number, default: 0 },
    // Start at 0; creating the default workspace will increment this value.
    workspaces: { type: Number, default: 0 },
    dashboards: { type: Number, default: 0 },
  },
  subscriptionId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.index({ uid: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
