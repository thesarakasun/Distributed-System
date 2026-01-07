const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const SESSION_TIMEOUT_MINUTES = 30;

/**
 * Middleware to authenticate JWT token and validate session
 */
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if session exists and is valid in database
    const sessionResult = await db.query(
      'SELECT s.*, u.username, u.role FROM sessions s JOIN users u ON s.user_id = u.user_id WHERE s.token = $1',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Check if session has expired
    if (new Date(session.expires_at) < new Date()) {
      await db.query('DELETE FROM sessions WHERE session_id = $1', [session.session_id]);
      return res.status(401).json({ error: 'Session expired' });
    }

    // Update last_activity timestamp (heartbeat)
    await db.query(
      'UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE session_id = $1',
      [session.session_id]
    );

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      username: session.username,
      role: session.role,
      sessionId: session.session_id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to require specific roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to require ownership of a resource or admin role
 */
const requireOwnership = async (req, res, next) => {
  try {
    const noteId = req.params.id;
    
    // Get note owner
    const noteResult = await db.query(
      'SELECT owner_id FROM notes WHERE note_id = $1',
      [noteId]
    );

    if (noteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = noteResult.rows[0];

    // Admin can access anything, otherwise must be owner
    if (req.user.role === 'Admin' || note.owner_id === req.user.userId) {
      next();
    } else {
      res.status(403).json({ error: 'You can only modify your own notes' });
    }
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: 'Failed to verify ownership' });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  JWT_SECRET,
  SESSION_TIMEOUT_MINUTES,
};
