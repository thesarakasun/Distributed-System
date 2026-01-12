import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map();
  }

  /**
   * Connect to the WebSocket server
   * @param {string} token - JWT authentication token
   */
  connect(token) {
    if (this.socket && this.connected) {
      console.log('Socket already connected');
      return;
    }

    // Determine the backend URL
    const backendURL = process.env.REACT_APP_SOCKET_URL || 
                      process.env.REACT_APP_API_URL || 
                      'http://localhost:3001';

    console.log('Connecting to WebSocket:', backendURL);

    this.socket = io(backendURL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected:', this.socket.id);
      this.connected = true;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ WebSocket disconnected:', reason);
      this.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Set up default event listeners
    this.setupDefaultListeners();
  }

  /**
   * Set up listeners for common events
   */
  setupDefaultListeners() {
    // Users count updates
    this.socket.on('users:count', (data) => {
      console.log(`Active users: ${data.count}`);
      this.emit('users:count', data);
    });

    // Note events
    this.socket.on('note:created', (data) => {
      console.log('Note created:', data.note.title);
      this.emit('note:created', data);
    });

    this.socket.on('note:updated', (data) => {
      console.log('Note updated:', data.note.title);
      this.emit('note:updated', data);
    });

    this.socket.on('note:deleted', (data) => {
      console.log('Note deleted:', data.noteId);
      this.emit('note:deleted', data);
    });

    this.socket.on('note:locked', (data) => {
      console.log(`Note ${data.noteId} locked by ${data.username}`);
      this.emit('note:locked', data);
    });

    this.socket.on('note:unlocked', (data) => {
      console.log(`Note ${data.noteId} unlocked`);
      this.emit('note:unlocked', data);
    });

    this.socket.on('note:lock-renewed', (data) => {
      console.log(`Note ${data.noteId} lock renewed by ${data.username}`);
      this.emit('note:lock-renewed', data);
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  /**
   * Join a note room for targeted updates
   * @param {string|number} noteId 
   */
  joinNoteRoom(noteId) {
    if (this.socket && this.connected) {
      this.socket.emit('note:join', noteId);
    }
  }

  /**
   * Leave a note room
   * @param {string|number} noteId 
   */
  leaveNoteRoom(noteId) {
    if (this.socket && this.connected) {
      this.socket.emit('note:leave', noteId);
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function (optional, removes all if not provided)
   */
  off(event, callback) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Emit event to local listeners
   * @param {string} event - Event name
   * @param {*} data - Event data
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Check if socket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.connected;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
