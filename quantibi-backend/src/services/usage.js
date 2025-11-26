const User = require('../models/User');

// Free-tier limits
const LIMITS = {
  uploads: 1,
  charts: 1,
  reports: 1,
  workspaces: 1,
  dashboards: 1
};

/**
 * Try to consume one unit of the given usage type for the user.
 * For 'pro' users this is a no-op and always succeeds.
 * Returns { success: boolean, user?: User, message?: string }
 */
async function tryConsume(uid, type) {
  if (!LIMITS[type]) {
    // Unknown type -> allow
    return { success: true };
  }

  // First, fetch the user document. If none exists (race where frontend calls
  // a gated endpoint before /api/users/me ran), create a minimal user record
  // so the consumption check can proceed normally.
  let user = await User.findOne({ uid });
  if (!user) {
    try {
      user = new User({ uid });
      await user.save();
    } catch (err) {
      console.error('Error creating user record in usage.tryConsume:', err);
      return { success: false, message: 'User not found and could not be created' };
    }
  }

  // Pro users have unlimited usage; do not increment counters
  // For pro users: allow and increment (we record usage even for pro in case we add limits later)
  if (user.plan === 'pro') {
    const updated = await User.findOneAndUpdate({ uid }, { $inc: { [`usage.${type}`]: 1 } }, { new: true });
    return { success: true, user: updated };
  }

  // For free users, atomically increment if under limit
  const filter = {
    uid,
    [`usage.${type}`]: { $lt: LIMITS[type] }
  };
  const update = { $inc: { [`usage.${type}`]: 1 } };
  const opts = { new: true };

  const updated = await User.findOneAndUpdate(filter, update, opts);
  if (!updated) {
    return { success: false, message: `Free tier limit reached for ${type}. Upgrade to Pro to continue.` };
  }

  return { success: true, user: updated };
}

/**
 * Check remaining allowance for a user and type without consuming.
 */
async function getRemaining(uid, type) {
  const user = await User.findOne({ uid });
  if (!user) return { remaining: LIMITS[type] || null };
  if (user.plan === 'pro') return { remaining: Infinity };
  const used = (user.usage && user.usage[type]) || 0;
  const limit = LIMITS[type] || null;
  return { remaining: limit !== null ? Math.max(limit - used, 0) : null };
}

module.exports = {
  tryConsume,
  getRemaining,
  LIMITS
};
