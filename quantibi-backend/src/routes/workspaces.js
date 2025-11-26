const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const Workspace = require('../models/Workspace');
const crypto = require('crypto');

/**
 * @route   GET /api/workspaces
 * @desc    Get all workspaces for the authenticated user
 * @access  Private
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    // Find workspaces where the user is either the owner or a member
    const workspaces = await Workspace.find({
      $or: [
        { owner: req.user.uid },
        { 'members.uid': req.user.uid }
      ]
    }).select('-invites');

    res.json(workspaces);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces
 * @desc    Create a new workspace
 * @access  Private
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }

    // Enforce workspace creation limits
    try {
      const usageService = require('../services/usage');
      const consume = await usageService.tryConsume(req.user.uid, 'workspaces');
      if (!consume.success) {
        return res.status(403).json({ code: 'PAYWALL', message: consume.message, upgradeUrl: process.env.UPGRADE_URL || null });
      }
    } catch (err) {
      console.error('Error checking workspace usage limits:', err);
      return res.status(500).json({ message: 'Error checking usage limits' });
    }

    const workspace = new Workspace({
      name,
      description,
      owner: req.user.uid,
      members: [
        {
          uid: req.user.uid,
          email: req.user.email,
          role: 'owner',
        }
      ]
    });

    const savedWorkspace = await workspace.save();
    res.status(201).json(savedWorkspace);
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/workspaces/:id
 * @desc    Get a workspace by ID
 * @access  Private
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user has access to this workspace
    const isMember = workspace.owner === req.user.uid || 
                      workspace.members.some(member => member.uid === req.user.uid);
    
    if (!isMember) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(workspace);
  } catch (error) {
    console.error('Error fetching workspace:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   PUT /api/workspaces/:id
 * @desc    Update a workspace
 * @access  Private
 */
router.put('/:id', authenticateUser, async (req, res) => {
  try {
    const { name, description } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is the owner or admin
    const userRole = workspace.owner === req.user.uid 
      ? 'owner' 
      : workspace.members.find(member => member.uid === req.user.uid)?.role;
    
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (name) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    
    const updatedWorkspace = await workspace.save();
    res.json(updatedWorkspace);
  } catch (error) {
    console.error('Error updating workspace:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/workspaces/:id/invite
 * @desc    Invite a user to a workspace
 * @access  Private
 */
router.post('/:id/invite', authenticateUser, async (req, res) => {
  try {
    const { email, role } = req.body;
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is the owner or admin
    const userRole = workspace.owner === req.user.uid 
      ? 'owner' 
      : workspace.members.find(member => member.uid === req.user.uid)?.role;
    
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if user is already a member
    const isAlreadyMember = workspace.members.some(member => member.email === email);
    if (isAlreadyMember) {
      return res.status(400).json({ message: 'User is already a member of this workspace' });
    }

    // Check if user is already invited
    const existingInvite = workspace.invites.find(invite => invite.email === email);
    if (existingInvite) {
      return res.status(400).json({ message: 'User is already invited to this workspace' });
    }

    // Create invitation token
    const token = crypto.randomBytes(20).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    workspace.invites.push({
      email,
      role: role || 'member',
      token,
      expiresAt
    });

    await workspace.save();

    // Here you would typically send an email with the invitation link
    // For now, we'll just return the token
    res.status(201).json({ 
      message: 'Invitation sent successfully',
      token
    });
  } catch (error) {
    console.error('Error inviting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/workspaces/:id
 * @desc    Delete a workspace
 * @access  Private
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    console.log('Deleting workspace:', req.params.id);

    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      console.log('Workspace not found:', req.params.id);
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Only the owner can delete a workspace
    if (workspace.owner !== req.user.uid) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete the workspace
    const result = await Workspace.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      console.log('No workspace was deleted');
      return res.status(404).json({ message: 'Workspace not found' });
    }

    console.log('Workspace deleted successfully');
    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    res.status(500).json({ 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * @route   DELETE /api/workspaces/:id/members/:memberId
 * @desc    Remove a member from a workspace
 * @access  Private
 */
router.delete('/:id/members/:memberId', authenticateUser, async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({ message: 'Workspace not found' });
    }

    // Check if user is the owner or admin
    const userRole = workspace.owner === req.user.uid 
      ? 'owner' 
      : workspace.members.find(member => member.uid === req.user.uid)?.role;
    
    if (userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Find the member to remove
    const memberToRemove = workspace.members.find(member => member.uid === req.params.memberId);
    
    if (!memberToRemove) {
      return res.status(404).json({ message: 'Member not found' });
    }

    // Prevent removing the owner
    if (memberToRemove.role === 'owner') {
      return res.status(403).json({ message: 'Cannot remove the workspace owner' });
    }

    // Prevent admins from removing other admins (only owner can)
    if (memberToRemove.role === 'admin' && userRole !== 'owner') {
      return res.status(403).json({ message: 'Only the owner can remove admins' });
    }

    // Remove the member
    workspace.members = workspace.members.filter(member => member.uid !== req.params.memberId);
    await workspace.save();

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 