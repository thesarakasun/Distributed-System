const db = require('../config/database');

const SESSION_TIMEOUT_MINUTES = 30;
const LOCK_TIMEOUT_MINUTES = 5;
const CLEANUP_INTERVAL_SECONDS = 30;

/**
 * Background job to clean up expired sessions and locks
 */
async function cleanupExpiredResources() {
  try {
    const now = new Date();

    // 1. Release locks from expired sessions
    const expiredSessionLocks = await db.query(
      `UPDATE notes 
       SET locked_by = NULL, lock_timestamp = NULL 
       WHERE locked_by IN (
         SELECT user_id FROM sessions 
         WHERE last_activity < $1
       )
       RETURNING note_id`,
      [new Date(now.getTime() - SESSION_TIMEOUT_MINUTES * 60 * 1000)]
    );

    if (expiredSessionLocks.rowCount > 0) {
      console.log(`✓ Released ${expiredSessionLocks.rowCount} locks from expired sessions`);
    }

    // 2. Release locks that exceeded timeout
    const expiredLocks = await db.query(
      `UPDATE notes 
       SET locked_by = NULL, lock_timestamp = NULL 
       WHERE lock_timestamp < $1 AND locked_by IS NOT NULL
       RETURNING note_id`,
      [new Date(now.getTime() - LOCK_TIMEOUT_MINUTES * 60 * 1000)]
    );

    if (expiredLocks.rowCount > 0) {
      console.log(`✓ Released ${expiredLocks.rowCount} expired locks`);
    }

    // 3. Delete expired sessions
    const expiredSessions = await db.query(
      `DELETE FROM sessions 
       WHERE expires_at < $1 OR last_activity < $2
       RETURNING session_id`,
      [now, new Date(now.getTime() - SESSION_TIMEOUT_MINUTES * 60 * 1000)]
    );

    if (expiredSessions.rowCount > 0) {
      console.log(`✓ Removed ${expiredSessions.rowCount} expired sessions`);
    }

  } catch (error) {
    console.error('✗ Cleanup job error:', error);
  }
}

/**
 * Start the background cleanup job
 */
function startCleanupJob() {
  console.log(`✓ Starting background cleanup job (interval: ${CLEANUP_INTERVAL_SECONDS}s)`);
  
  // Run immediately on start
  cleanupExpiredResources();
  
  // Run periodically
  const intervalId = setInterval(cleanupExpiredResources, CLEANUP_INTERVAL_SECONDS * 1000);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    console.log('✓ Background cleanup job stopped');
  };
}

module.exports = {
  startCleanupJob,
  cleanupExpiredResources,
};
