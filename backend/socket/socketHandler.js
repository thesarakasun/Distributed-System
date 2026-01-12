const jwt = require('jsonwebtoken');

/**
 * Socket.IO event handler for real-time updates
 * Manages connections, authentication, and broadcasting events
 */
class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> Set of socket IDs
    
    // Set up authentication middleware for Socket.IO
    io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
        socket.userId = decoded.userId;
        socket.username = decoded.username;
        socket.role = decoded.role;
        next();
      } catch (err) {
        console.error('Socket authentication error:', err);
        next(new Error('Invalid token'));
      }
    });

    // Handle connections
    io.on('connection', (socket) => {
      this.handleConnection(socket);
    });
  }

  handleConnection(socket) {
    console.log(`✓ User connected: ${socket.username} (${socket.userId}) - Socket: ${socket.id}`);
    
    // Track connected user
    if (!this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, new Set());
    }
    this.connectedUsers.get(socket.userId).add(socket.id);

    // Send current connected users count
    this.io.emit('users:count', {
      count: this.connectedUsers.size,
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`✗ User disconnected: ${socket.username} - Socket: ${socket.id}`);
      
      const userSockets = this.connectedUsers.get(socket.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(socket.userId);
        }
      }

      this.io.emit('users:count', {
        count: this.connectedUsers.size,
      });
    });

    // Handle joining/leaving note rooms for targeted updates
    socket.on('note:join', (noteId) => {
      socket.join(`note:${noteId}`);
      console.log(`User ${socket.username} joined note room: ${noteId}`);
    });

    socket.on('note:leave', (noteId) => {
      socket.leave(`note:${noteId}`);
      console.log(`User ${socket.username} left note room: ${noteId}`);
    });
  }

  /**
   * Broadcast when a note is locked
   */
  noteLocked(noteId, userId, username, expiresIn) {
    this.io.emit('note:locked', {
      noteId,
      userId,
      username,
      expiresIn,
      timestamp: new Date().toISOString(),
    });
    console.log(`📌 Note ${noteId} locked by ${username}`);
  }

  /**
   * Broadcast when a note is unlocked
   */
  noteUnlocked(noteId) {
    this.io.emit('note:unlocked', {
      noteId,
      timestamp: new Date().toISOString(),
    });
    console.log(`🔓 Note ${noteId} unlocked`);
  }

  /**
   * Broadcast when a note is created
   */
  noteCreated(note) {
    this.io.emit('note:created', {
      note,
      timestamp: new Date().toISOString(),
    });
    console.log(`✨ Note created: ${note.title} (${note.note_id})`);
  }

  /**
   * Broadcast when a note is updated
   */
  noteUpdated(note) {
    this.io.emit('note:updated', {
      note,
      timestamp: new Date().toISOString(),
    });
    console.log(`✏️  Note updated: ${note.title} (${note.note_id})`);
  }

  /**
   * Broadcast when a note is deleted
   */
  noteDeleted(noteId) {
    this.io.emit('note:deleted', {
      noteId,
      timestamp: new Date().toISOString(),
    });
    console.log(`🗑️  Note deleted: ${noteId}`);
  }

  /**
   * Broadcast when lock is renewed
   */
  lockRenewed(noteId, userId, username, expiresIn) {
    this.io.emit('note:lock-renewed', {
      noteId,
      userId,
      username,
      expiresIn,
      timestamp: new Date().toISOString(),
    });
    console.log(`🔄 Lock renewed for note ${noteId} by ${username}`);
  }
}

module.exports = SocketHandler;
