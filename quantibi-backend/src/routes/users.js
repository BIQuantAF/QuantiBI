const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateUser } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

/**
 * @route   GET /api/users/me
 * @desc    Get current user's information
 * @access  Private
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    // User information is already added to req.user by the authenticateUser middleware
    // Ensure a User document exists for tracking plan/usage
    let userDoc = await User.findOne({ uid: req.user.uid });
    if (!userDoc) {
      userDoc = new User({ uid: req.user.uid, email: req.user.email || undefined });
      await userDoc.save();
    }

    // Ensure the user has a default workspace. If not, create one.
    let workspace = await Workspace.findOne({ owner: req.user.uid });
    if (!workspace) {
      workspace = new Workspace({
        name: 'My Workspace',
        owner: req.user.uid
      });
      await workspace.save();

      // Increment user's workspace count to record the created default workspace
      userDoc.usage.workspaces = (userDoc.usage.workspaces || 0) + 1;
      await userDoc.save();
    }

    res.json({
      user: req.user,
      profile: userDoc,
      workspace
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Debug: Get current user's usage and remaining limits
 * @route GET /api/users/me/usage
 * Protected: requires authentication
 */
router.get('/me/usage', authenticateUser, async (req, res) => {
  try {
    const User = require('../models/User');
    const usageService = require('../services/usage');
    const userDoc = await User.findOne({ uid: req.user.uid });
    if (!userDoc) return res.status(404).json({ message: 'User not found' });

    const remaining = {};
    for (const key of Object.keys(usageService.LIMITS)) {
      const r = await usageService.getRemaining(req.user.uid, key);
      remaining[key] = r.remaining;
    }

    res.json({ usage: userDoc.usage, plan: userDoc.plan, remaining });
  } catch (err) {
    console.error('Error fetching usage:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile information
 * @access  Private
 */
router.put('/me', authenticateUser, validate, async (req, res) => {
  try {
    const { displayName, photoURL } = req.body;
    
    // Update the user in Firebase Auth
    await admin.auth().updateUser(req.user.uid, {
      displayName,
      photoURL,
    });
    
    res.json({ message: 'User profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 