# Real-Time Features Implementation

## Overview
This document describes the real-time update features implemented in the Distributed Shared Note-Taking System using Socket.IO.

## Features Implemented

### 1. Real-Time Lock Updates
- **Lock Acquisition**: When a user locks a note for editing, all other connected users immediately see the lock icon appear on that note
- **Lock Release**: When a note is unlocked, the lock status is instantly updated for all users
- **Lock Renewal**: Lock renewals happen silently in the background and are reflected in real-time

### 2. Real-Time Note Updates
- **Note Creation**: Newly created notes appear instantly in all users' note lists
- **Note Updates**: When a note is saved, all users see the updated content immediately
- **Note Deletion**: Deleted notes are removed from all users' views in real-time

### 3. Active Users Counter
- Shows the number of currently connected users in real-time
- Updates automatically when users connect or disconnect

### 4. Visual Indicators
- **Lock Icon (🔒)**: Appears on locked notes with tooltip showing who locked it
- **Active Users (👥)**: Shows count of connected users in the header
- **Lock Timer**: Displays remaining time before lock expires (for the user who has the lock)
- **Lock Warning**: Animated warning when viewing a note that's locked by another user

## Technical Architecture

### Backend Components

#### 1. Socket Handler (`backend/socket/socketHandler.js`)
- Manages WebSocket connections and authentication
- Handles connection/disconnection events
- Broadcasts note events to all connected clients
- Tracks active users

#### 2. Updated Routes (`backend/routes/notes.js`)
Event broadcasting on:
- `note:created` - When a new note is created
- `note:updated` - When a note is saved
- `note:deleted` - When a note is removed
- `note:locked` - When a note is locked
- `note:unlocked` - When a note is unlocked
- `note:lock-renewed` - When a lock is renewed

#### 3. Server Integration (`backend/server.js`)
- Initializes Socket.IO with HTTP server
- Configures CORS for WebSocket connections
- Integrates socketHandler with Express routes

### Frontend Components

#### 1. Socket Service (`frontend/src/services/socket.js`)
- Singleton service for managing WebSocket connections
- Provides event subscription/unsubscription methods
- Handles connection state and reconnection logic
- Automatic authentication using JWT tokens

#### 2. Dashboard Updates (`frontend/src/components/Dashboard.js`)
- Subscribes to all real-time events on mount
- Updates notes list without page refresh
- Shows notifications for important events
- Displays active users count
- Automatically cleans up listeners on unmount

#### 3. Note Editor Updates (`frontend/src/components/NoteEditor.js`)
- Listens for lock status changes on current note
- Updates content in real-time when viewing
- Shows visual warnings when note is locked by others
- Displays lock timer for active locks

### Infrastructure Updates

#### 1. Nginx Configuration (`nginx/nginx.conf`)
Added specific location block for Socket.IO:
```nginx
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
}
```

#### 2. Package Dependencies
- **Backend**: `socket.io@^4.7.2`
- **Frontend**: `socket.io-client@^4.7.2`

## Usage

### For Users

1. **Seeing Real-Time Updates**
   - No action needed - updates appear automatically
   - Lock status changes appear immediately
   - New notes appear at the top of the list
   - Deleted notes disappear instantly

2. **Active Users Counter**
   - Look for the 👥 icon in the header
   - Hover over it to see "Active users"

3. **Lock Indicators**
   - 🔒 icon on locked notes
   - Hover to see who locked it
   - Lock timer shows when you have the lock

### For Developers

#### Connecting to WebSocket
```javascript
import socketService from '../services/socket';

// Connect with JWT token
const token = localStorage.getItem('token');
socketService.connect(token);
```

#### Subscribing to Events
```javascript
// Subscribe to an event
const unsubscribe = socketService.on('note:created', (data) => {
  console.log('New note:', data.note);
});

// Unsubscribe when component unmounts
useEffect(() => {
  return () => {
    unsubscribe();
  };
}, []);
```

#### Broadcasting Events (Backend)
```javascript
// In route handler
const socketHandler = req.app.get('socketHandler');
if (socketHandler) {
  socketHandler.noteCreated(newNote);
}
```

## Benefits

1. **Better User Experience**
   - No need to refresh the page
   - Immediate feedback on actions
   - Awareness of other users' activities

2. **Reduced Server Load**
   - Fewer polling requests
   - Efficient push-based updates
   - Single WebSocket connection per client

3. **Improved Collaboration**
   - Users can see when others are editing
   - Prevents conflicts with real-time lock status
   - Better awareness of team activity

## Testing the Real-Time Features

1. **Open Multiple Browser Windows**
   - Login with different users in each window
   - Watch the active users counter update

2. **Test Lock Synchronization**
   - Lock a note in one window
   - See the lock appear immediately in other windows
   - Try to edit - should show "locked by..." message

3. **Test Note Updates**
   - Create a note in one window
   - See it appear in other windows instantly
   - Edit and save - changes appear immediately
   - Delete - note disappears from all windows

4. **Test Notifications**
   - Perform actions in one window
   - Check for notification popups in other windows

## Troubleshooting

### WebSocket Connection Issues

1. **Check Browser Console**
   - Look for "WebSocket connected" message
   - Check for connection errors

2. **Verify Backend**
   - Ensure server shows "WebSocket: Enabled" on startup
   - Check for socket connection logs

3. **Check Network**
   - Ensure port 80 (nginx) is accessible
   - Verify no firewall blocking WebSocket connections

### Events Not Updating

1. **Verify Token**
   - Ensure JWT token is valid
   - Check authentication in WebSocket handshake

2. **Check Event Listeners**
   - Verify component properly subscribes to events
   - Ensure cleanup functions are called on unmount

3. **Backend Event Broadcasting**
   - Check server logs for event broadcast messages
   - Verify socketHandler is properly initialized

## Performance Considerations

1. **Connection Management**
   - Single WebSocket per client
   - Automatic reconnection on disconnect
   - Graceful degradation if WebSocket fails

2. **Event Throttling**
   - Lock renewals don't trigger notifications
   - Only relevant events shown to users
   - Efficient state updates using React state management

3. **Scalability**
   - For production, consider Redis adapter for Socket.IO
   - Enable sticky sessions for load balancing
   - Monitor connection counts and resource usage

## Future Enhancements

1. **Typing Indicators**
   - Show when someone is typing in a note
   - Display cursor positions for collaborative editing

2. **Presence Information**
   - Show which notes users are currently viewing
   - Display user avatars on locked notes

3. **Chat Feature**
   - Real-time messaging between users
   - Note-specific discussion threads

4. **Operational Transform**
   - True collaborative editing like Google Docs
   - Character-level synchronization

## Conclusion

The real-time features significantly enhance the user experience by providing immediate feedback and better collaboration capabilities. All updates happen instantly without requiring page refreshes, making the application feel more responsive and modern.
