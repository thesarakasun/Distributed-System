const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { authenticateToken, JWT_SECRET, SESSION_TIMEOUT_MINUTES } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * User authentication endpoint
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Get user from database
    const userResult = await db.query(
      'SELECT user_id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = userResult.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, role: user.role },
      JWT_SECRET,
      { expiresIn: `${SESSION_TIMEOUT_MINUTES}m` }
    );

    // Store session in database
    const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000);
    await db.query(
      'INSERT INTO sessions (user_id, token, expires_at, last_activity) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [user.user_id, token, expiresAt]
    );

    res.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role,
      },
      expiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 * User logout endpoint
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Get token from header
    const token = req.headers['authorization']?.split(' ')[1];

    // Delete session from database
    await db.query('DELETE FROM sessions WHERE token = $1', [token]);

    // Release any locks held by this user
    await db.query(
      'UPDATE notes SET locked_by = NULL, lock_timestamp = NULL WHERE locked_by = $1',
      [req.user.userId]
    );

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/heartbeat
 * Update session activity timestamp
 */
router.post('/heartbeat', authenticateToken, async (req, res) => {
  try {
    // The authenticateToken middleware already updates last_activity
    res.json({ 
      success: true, 
      message: 'Heartbeat received',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

/**
 * GET /api/auth/session
 * Get current session information
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    
    const sessionResult = await db.query(
      'SELECT session_id, user_id, created_at, expires_at, last_activity FROM sessions WHERE token = $1',
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      session: sessionResult.rows[0],
      user: req.user,
    });
  } catch (error) {
    console.error('Session info error:', error);
    res.status(500).json({ error: 'Failed to retrieve session' });
  }
});

/**
 * POST /api/auth/register (Optional - for creating new users)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'User' } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['Admin', 'User', 'Guest'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if username exists
    const existingUser = await db.query(
      'SELECT user_id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING user_id, username, role, created_at',
      [username, passwordHash, role]
    );

    res.status(201).json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

module.exports = router;
