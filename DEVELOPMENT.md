# Development Guide

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Docker Desktop
- VS Code (recommended)

### Local Development (Without Docker)

#### 1. Database Setup

```bash
# Start PostgreSQL
# Windows: Start PostgreSQL service from Services
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE notesdb;
CREATE USER admin WITH PASSWORD 'secret123';
GRANT ALL PRIVILEGES ON DATABASE notesdb TO admin;
\q

# Run migrations
psql -U admin -d notesdb -f database/init.sql
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notesdb
DB_USER=admin
DB_PASSWORD=secret123
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development
SERVER_NAME=local-dev
EOF

# Start backend
npm run dev
```

Backend runs on http://localhost:3001

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:3001
EOF

# Start frontend
npm start
```

Frontend runs on http://localhost:3000

---

## 📁 Project Structure Explained

### Backend Structure

```
backend/
├── config/
│   └── database.js          # PostgreSQL connection pool configuration
├── middleware/
│   └── auth.js              # JWT authentication & RBAC middleware
├── routes/
│   ├── auth.js              # Login, logout, heartbeat endpoints
│   └── notes.js             # CRUD operations, lock management
├── jobs/
│   └── cleanup.js           # Background job for session/lock cleanup
└── server.js                # Express app initialization
```

### Frontend Structure

```
frontend/src/
├── components/
│   ├── Login.js             # Login form component
│   ├── Dashboard.js         # Main dashboard with notes list
│   ├── NoteEditor.js        # Note creation/editing component
│   └── PrivateRoute.js      # Route protection wrapper
├── context/
│   └── AuthContext.js       # Global authentication state
├── services/
│   └── api.js               # API client with retry logic
└── styles/                  # CSS modules
```

---

## 🔧 Making Changes

### Adding a New API Endpoint

1. **Create route handler** in `backend/routes/`:

```javascript
// backend/routes/notes.js
router.get('/api/notes/:id/history', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    // Implementation here
    res.json({ success: true, history: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get history' });
  }
});
```

2. **Add API method** in `frontend/src/services/api.js`:

```javascript
export const notesAPI = {
  // ... existing methods
  getHistory: (id) => api.get(`/api/notes/${id}/history`),
};
```

3. **Use in component**:

```javascript
import { notesAPI } from '../services/api';

const history = await notesAPI.getHistory(noteId);
```

### Adding a New Database Table

1. **Update** `database/init.sql`:

```sql
CREATE TABLE IF NOT EXISTS note_history (
  history_id SERIAL PRIMARY KEY,
  note_id INTEGER NOT NULL REFERENCES notes(note_id) ON DELETE CASCADE,
  content_snapshot TEXT,
  changed_by INTEGER REFERENCES users(user_id),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_note_history_note ON note_history(note_id);
```

2. **Rebuild database**:

```bash
docker-compose down -v
docker-compose up --build
```

### Adding a New React Component

1. **Create component** in `frontend/src/components/`:

```javascript
// NoteHistory.js
import React, { useState, useEffect } from 'react';
import { notesAPI } from '../services/api';
import '../styles/NoteHistory.css';

function NoteHistory({ noteId }) {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    fetchHistory();
  }, [noteId]);
  
  const fetchHistory = async () => {
    const response = await notesAPI.getHistory(noteId);
    setHistory(response.data.history);
  };
  
  return (
    <div className="note-history">
      {/* Component JSX */}
    </div>
  );
}

export default NoteHistory;
```

2. **Create styles** in `frontend/src/styles/NoteHistory.css`

3. **Import and use** in parent component

---

## 🧪 Testing Changes

### Backend Testing

```bash
cd backend

# Manual API testing with curl
curl http://localhost:3001/health
curl http://localhost:3001/api/notes \
  -H "Authorization: Bearer YOUR_TOKEN"

# Or use Postman/Insomnia for interactive testing
```

### Frontend Testing

```bash
cd frontend

# Run React app in development mode
npm start

# Check for errors in browser console
# Use React DevTools for component debugging
```

### Integration Testing

```bash
# Start full stack with Docker
docker-compose up --build

# Test the complete flow
```

---

## 🐛 Debugging

### Backend Debugging

Add console logs:

```javascript
console.log('Debug: User ID:', req.user.userId);
console.log('Debug: Lock status:', note.locked_by);
```

View logs:

```bash
docker logs -f notes-app-1
```

### Frontend Debugging

Use browser DevTools:

```javascript
console.log('Debug: API response:', response);
console.log('Debug: Current user:', user);
```

### Database Debugging

```bash
# Access database
docker exec -it notes-postgres psql -U admin -d notesdb

# Check tables
\dt

# Query data
SELECT * FROM notes;
SELECT * FROM sessions;
SELECT * FROM users;

# Check active connections
SELECT * FROM pg_stat_activity;
```

---

## 📝 Code Style Guide

### Backend (JavaScript)

```javascript
// Use async/await
async function fetchNotes() {
  try {
    const result = await db.query('SELECT * FROM notes');
    return result.rows;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Use descriptive variable names
const noteId = req.params.id;
const userId = req.user.userId;

// Always validate input
if (!title || title.trim() === '') {
  return res.status(400).json({ error: 'Title is required' });
}

// Use meaningful error messages
throw new Error('Note not found');
```

### Frontend (React)

```javascript
// Use functional components with hooks
function MyComponent({ prop1, prop2 }) {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return <div>{/* JSX */}</div>;
}

// Destructure props
const { user, logout } = useAuth();

// Use meaningful handler names
const handleSubmit = () => {};
const handleInputChange = () => {};

// Always handle loading and error states
if (loading) return <div>Loading...</div>;
if (error) return <div>Error: {error}</div>;
```

### CSS

```css
/* Use meaningful class names */
.note-editor {
  /* Component styles */
}

.note-editor__header {
  /* Element styles */
}

.note-editor--locked {
  /* Modifier styles */
}

/* Use CSS variables for theme */
:root {
  --primary-color: #667eea;
  --error-color: #f44336;
}
```

---

## 🚀 Deployment

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm install --production
```

### Docker Production Build

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Push to registry
docker tag distributed-notes:latest your-registry/distributed-notes:latest
docker push your-registry/distributed-notes:latest
```

### Environment Variables for Production

```env
# Backend
JWT_SECRET=<strong-random-secret-64-characters>
NODE_ENV=production
DB_PASSWORD=<strong-database-password>

# Database
POSTGRES_PASSWORD=<strong-database-password>

# Enable SSL
DB_SSL=true
```

---

## 📊 Performance Optimization

### Database Optimization

```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_notes_created_at ON notes(created_at);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM notes WHERE owner_id = 1;

-- Enable query result caching (PostgreSQL)
SET shared_buffers = '256MB';
SET effective_cache_size = '1GB';
```

### Backend Optimization

```javascript
// Use connection pooling
const pool = new Pool({ max: 20 });

// Batch database operations
const insertMany = async (notes) => {
  const values = notes.map((n, i) => `($${i*2+1}, $${i*2+2})`).join(',');
  const params = notes.flatMap(n => [n.title, n.content]);
  await db.query(`INSERT INTO notes (title, content) VALUES ${values}`, params);
};

// Cache frequently accessed data
const cache = new Map();
const getCachedUser = async (userId) => {
  if (cache.has(userId)) return cache.get(userId);
  const user = await db.query('SELECT * FROM users WHERE user_id = $1', [userId]);
  cache.set(userId, user);
  return user;
};
```

### Frontend Optimization

```javascript
// Use React.memo for expensive components
const NoteItem = React.memo(({ note }) => {
  return <div>{note.title}</div>;
});

// Lazy load routes
const Dashboard = React.lazy(() => import('./components/Dashboard'));

// Debounce API calls
const debouncedSearch = useCallback(
  debounce((query) => searchNotes(query), 300),
  []
);
```

---

## 🔍 Monitoring

### Application Monitoring

```javascript
// Add request timing
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Add error tracking
app.use((err, req, res, next) => {
  console.error('Error:', err);
  // Send to error tracking service (e.g., Sentry)
  res.status(500).json({ error: 'Internal server error' });
});
```

### Database Monitoring

```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Monitor connections
SELECT count(*) FROM pg_stat_activity;

-- Monitor table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE schemaname = 'public';
```

---

## 📚 Additional Resources

### Documentation
- [Node.js Docs](https://nodejs.org/docs/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Docker Docs](https://docs.docker.com/)
- [Nginx Docs](https://nginx.org/en/docs/)

### Tools
- [Postman](https://www.postman.com/) - API testing
- [pgAdmin](https://www.pgadmin.org/) - PostgreSQL GUI
- [React DevTools](https://react.dev/learn/react-developer-tools) - React debugging

---

**Last Updated:** September 30, 2025
