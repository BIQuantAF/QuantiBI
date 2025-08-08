const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { authenticateUser } = require('../middleware/auth');

/**
 * @route   GET /api/users/me
 * @desc    Get current user's information
 * @access  Private
 */
router.get('/me', authenticateUser, async (req, res) => {
  try {
    // User information is already added to req.user by the authenticateUser middleware
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/users/me
 * @desc    Update user profile information
 * @access  Private
 */
router.put('/me', authenticateUser, async (req, res) => {
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