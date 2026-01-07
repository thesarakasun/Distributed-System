const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireRole, requireOwnership } = require('../middleware/auth');

const router = express.Router();

const LOCK_TIMEOUT_MINUTES = 5;

/**
 * GET /api/notes
 * Get all notes with lock status (filtered by user permissions)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // All roles (Admin, User, Guest) can view all notes
    // Permissions for editing/deleting are enforced in their respective endpoints
    const query = `
      SELECT n.*, 
             u.username as owner_name, 
             l.username as locked_by_name
      FROM notes n
      LEFT JOIN users u ON n.owner_id = u.user_id
      LEFT JOIN users l ON n.locked_by = l.user_id
      ORDER BY n.updated_at DESC
    `;

    const result = await db.query(query);

    res.json({
      success: true,
      notes: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to retrieve notes' });
  }
});

/**
 * GET /api/notes/:id
 * Get a single note by ID with lock status
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;

    const result = await db.query(
      `SELECT n.*, 
              u.username as owner_name, 
              l.username as locked_by_name
       FROM notes n
       LEFT JOIN users u ON n.owner_id = u.user_id
       LEFT JOIN users l ON n.locked_by = l.user_id
       WHERE n.note_id = $1`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      note: result.rows[0],
    });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to retrieve note' });
  }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', authenticateToken, requireRole(['Admin', 'User']), async (req, res) => {
  try {
    const { title, content } = req.body;

    // Validate input
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Create note
    const result = await db.query(
      `INSERT INTO notes (title, content, owner_id) 
       VALUES ($1, $2, $3) 
       RETURNING note_id, title, content, owner_id, created_at, updated_at`,
      [title.trim(), content || '', req.user.userId]
    );

    res.status(201).json({
      success: true,
      note: result.rows[0],
      message: 'Note created successfully',
    });
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

/**
 * PUT /api/notes/:id
 * Update a note (requires lock)
 */
router.put('/:id', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const noteId = req.params.id;
    const { title, content } = req.body;

    // Validate input
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Use transaction to ensure atomicity
    const result = await db.transaction(async (client) => {
      // Check if note is locked by current user
      const lockCheck = await client.query(
        'SELECT locked_by, lock_timestamp FROM notes WHERE note_id = $1 FOR UPDATE',
        [noteId]
      );

      if (lockCheck.rows.length === 0) {
        throw new Error('Note not found');
      }

      const note = lockCheck.rows[0];

      // Verify user has the lock
      if (note.locked_by !== req.user.userId) {
        throw new Error('Note must be locked before editing');
      }

      // Check if lock has expired
      const lockAge = Date.now() - new Date(note.lock_timestamp).getTime();
      if (lockAge > LOCK_TIMEOUT_MINUTES * 60 * 1000) {
        throw new Error('Lock has expired');
      }

      // Update note
      const updateResult = await client.query(
        `UPDATE notes 
         SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP 
         WHERE note_id = $3 
         RETURNING *`,
        [title.trim(), content || '', noteId]
      );

      return updateResult.rows[0];
    });

    res.json({
      success: true,
      note: result,
      message: 'Note updated successfully',
    });
  } catch (error) {
    console.error('Update note error:', error);
    
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message === 'Note must be locked before editing' || error.message === 'Lock has expired') {
      return res.status(423).json({ error: error.message }); // 423 Locked
    }
    
    res.status(500).json({ error: 'Failed to update note' });
  }
});

/**
 * DELETE /api/notes/:id
 * Delete a note (Admin can delete any, User can delete own)
 */
router.delete('/:id', authenticateToken, requireOwnership, async (req, res) => {
  try {
    const noteId = req.params.id;

    const result = await db.query(
      'DELETE FROM notes WHERE note_id = $1 RETURNING *',
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      success: true,
      message: 'Note deleted successfully',
      note: result.rows[0],
    });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

/**
 * POST /api/notes/:id/lock
 * Acquire exclusive lock on a note (Admin and User only, not Guest)
 */
router.post('/:id/lock', authenticateToken, requireRole(['Admin', 'User']), async (req, res) => {
  try {
    const noteId = req.params.id;

    // Users can only lock their own notes (unless Admin)
    if (req.user.role === 'User') {
      const noteCheck = await db.query(
        'SELECT owner_id FROM notes WHERE note_id = $1',
        [noteId]
      );
      
      if (noteCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      if (noteCheck.rows[0].owner_id !== req.user.userId) {
        return res.status(403).json({ error: 'You can only edit your own notes' });
      }
    }

    // Use transaction for atomic lock acquisition
    const result = await db.transaction(async (client) => {
      // Get current lock status with row-level lock
      const lockCheck = await client.query(
        `SELECT note_id, locked_by, lock_timestamp, owner_id 
         FROM notes 
         WHERE note_id = $1 
         FOR UPDATE`,
        [noteId]
      );

      if (lockCheck.rows.length === 0) {
        throw new Error('Note not found');
      }

      const note = lockCheck.rows[0];

      // Check if already locked
      if (note.locked_by) {
        // Check if lock has expired
        const lockAge = Date.now() - new Date(note.lock_timestamp).getTime();
        
        if (lockAge < LOCK_TIMEOUT_MINUTES * 60 * 1000) {
          // Lock is still valid
          if (note.locked_by === req.user.userId) {
            // User already has the lock, just refresh it
            await client.query(
              'UPDATE notes SET lock_timestamp = CURRENT_TIMESTAMP WHERE note_id = $1',
              [noteId]
            );
            return { acquired: true, renewed: true };
          } else {
            // Someone else has the lock
            const lockedByResult = await client.query(
              'SELECT username FROM users WHERE user_id = $1',
              [note.locked_by]
            );
            throw new Error(`Note is locked by ${lockedByResult.rows[0].username}`);
          }
        }
        // Lock has expired, continue to acquire
      }

      // Acquire lock
      await client.query(
        'UPDATE notes SET locked_by = $1, lock_timestamp = CURRENT_TIMESTAMP WHERE note_id = $2',
        [req.user.userId, noteId]
      );

      return { acquired: true, renewed: false };
    });

    res.json({
      success: true,
      lockAcquired: result.acquired,
      renewed: result.renewed,
      message: result.renewed ? 'Lock renewed' : 'Lock acquired successfully',
      expiresIn: LOCK_TIMEOUT_MINUTES * 60, // seconds
    });
  } catch (error) {
    console.error('Lock acquisition error:', error);
    
    if (error.message === 'Note not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.startsWith('Note is locked by')) {
      return res.status(423).json({ 
        error: error.message,
        lockAcquired: false,
      });
    }
    
    res.status(500).json({ error: 'Failed to acquire lock' });
  }
});

/**
 * POST /api/notes/:id/unlock
 * Release lock on a note
 */
router.post('/:id/unlock', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;

    const result = await db.query(
      `UPDATE notes 
       SET locked_by = NULL, lock_timestamp = NULL 
       WHERE note_id = $1 AND locked_by = $2
       RETURNING note_id`,
      [noteId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Note not found or you do not hold the lock' 
      });
    }

    res.json({
      success: true,
      message: 'Lock released successfully',
    });
  } catch (error) {
    console.error('Lock release error:', error);
    res.status(500).json({ error: 'Failed to release lock' });
  }
});

/**
 * GET /api/notes/:id/lock-status
 * Check lock status of a note
 */
router.get('/:id/lock-status', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;

    const result = await db.query(
      `SELECT n.locked_by, n.lock_timestamp, u.username as locked_by_name
       FROM notes n
       LEFT JOIN users u ON n.locked_by = u.user_id
       WHERE n.note_id = $1`,
      [noteId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = result.rows[0];
    const isLocked = note.locked_by !== null;
    const lockedByMe = note.locked_by === req.user.userId;

    let lockTimeRemaining = null;
    if (isLocked) {
      const lockAge = Date.now() - new Date(note.lock_timestamp).getTime();
      lockTimeRemaining = Math.max(0, (LOCK_TIMEOUT_MINUTES * 60 * 1000) - lockAge);
    }

    res.json({
      success: true,
      isLocked,
      lockedByMe,
      lockedBy: note.locked_by_name,
      lockTimeRemaining: lockTimeRemaining ? Math.floor(lockTimeRemaining / 1000) : null, // in seconds
    });
  } catch (error) {
    console.error('Lock status error:', error);
    res.status(500).json({ error: 'Failed to get lock status' });
  }
});

module.exports = router;
