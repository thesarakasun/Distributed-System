# Distributed Shared Note-Taking System

## 📝 Project Overview

A production-ready distributed note-taking system that enables multiple users to concurrently create, read, update, and delete text-based notes through a web interface. The system demonstrates fundamental distributed systems principles including high availability, fault tolerance, consistency, and scalability.

### Team 04

**Team Members:**
- A.M.C.R.P. Adikari - IM/2022/004
- B.M.N.N. Bandara - IM/2022/050
- H.M.M.C. Herath - IM/2022/057
- W.M.M.J. Wickramsinghe - IM/2022/064
- S.D.T. Kasun - IM/2022/071

**Course:** INTE 22253 - Distributed Systems and Cloud Computing  
**Institution:** University of Kelaniya, Sri Lanka  
**Date:** September 30, 2025

---

## 🌟 Key Features

✅ **High Availability** - Redundant application servers with automatic failover  
✅ **Fault Tolerance** - Nginx load balancing with health monitoring  
✅ **Data Consistency** - Pessimistic locking with database-backed state  
✅ **Security** - JWT authentication, role-based access control, bcrypt password hashing  
✅ **Scalability** - Horizontally scalable architecture with connection pooling  
✅ **Concurrent Access** - Lock management prevents data conflicts  
✅ **Automatic Cleanup** - Background jobs for expired sessions and locks  
✅ **Client Failure Detection** - Heartbeat mechanism with automatic resource cleanup  
✅ **Retry Logic** - Automatic request retry with exponential backoff  

---

## 🏗️ System Architecture

```
┌─────────────────┐
│  React Client   │
│   (Frontend)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nginx Load     │
│   Balancer      │◄──── Health Checks (5s interval)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Node.js │ │Node.js │
│ App 1  │ │ App 2  │  ◄──── Stateless Application Servers
└───┬────┘ └───┬────┘
    └─────┬─────┘
          ▼
    ┌──────────┐
    │PostgreSQL│  ◄──── Centralized Database
    │ Database │        (Sessions, Locks, Notes)
    └──────────┘
```

### Technology Stack

- **Frontend:** React.js, Axios, React Router
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL 15+
- **Load Balancer:** Nginx
- **Containerization:** Docker, Docker Compose
- **Authentication:** JWT (JSON Web Tokens)
- **Password Hashing:** bcrypt

---

## 🚀 Quick Start

### Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose v2.0+
- Git
- 4GB RAM minimum
- Ports 80, 3000, 3001, 3002, 5432 available

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/your-repo/distributed-notes.git
cd distributed-notes
```

2. **Create environment file**

```bash
copy .env.example .env  # Windows
# OR
cp .env.example .env    # Mac/Linux
```

3. **Build and start all services**

```bash
docker-compose up --build
```

Wait for all services to start (approximately 2-3 minutes on first run).

4. **Access the application**

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost/api
- **Health Check:** http://localhost/health

### Demo Credentials

```
Admin:  admin / password123
User:   john / password123
User:   jane / password123
Guest:  guest / password123
```

---

## 📂 Project Structure

```
Distributed-Shared-Note-Taking-System/
├── backend/                    # Node.js/Express backend
│   ├── config/
│   │   └── database.js        # PostgreSQL connection pool
│   ├── middleware/
│   │   └── auth.js            # Authentication & authorization
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   └── notes.js           # Note management endpoints
│   ├── jobs/
│   │   └── cleanup.js         # Background cleanup jobs
│   ├── server.js              # Express server
│   ├── package.json
│   └── Dockerfile
│
├── frontend/                   # React frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.js       # Login component
│   │   │   ├── Dashboard.js   # Main dashboard
│   │   │   ├── NoteEditor.js  # Note editor
│   │   │   └── PrivateRoute.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Authentication context
│   │   ├── services/
│   │   │   └── api.js         # API client
│   │   ├── styles/            # CSS files
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── database/
│   └── init.sql               # Database schema & seed data
│
├── nginx/
│   └── nginx.conf             # Load balancer configuration
│
├── docker-compose.yml         # Docker orchestration
├── .env.example               # Environment variables template
└── README.md                  # This file
```

---

## 🗄️ Database Schema

### Users Table

```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Admin', 'User', 'Guest')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notes Table

```sql
CREATE TABLE notes (
  note_id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  owner_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  locked_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  lock_timestamp TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Sessions Table

```sql
CREATE TABLE sessions (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔌 API Documentation

### Authentication Endpoints

#### POST /api/auth/login

Login with username and password.

**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": 1,
    "username": "admin",
    "role": "Admin"
  },
  "expiresAt": "2025-10-01T12:30:00.000Z"
}
```

#### POST /api/auth/logout

Logout and invalidate session.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### POST /api/auth/heartbeat

Update session activity timestamp.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Heartbeat received",
  "timestamp": "2025-10-01T12:00:00.000Z"
}
```

### Note Management Endpoints

#### GET /api/notes

Get all notes (filtered by role permissions).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "notes": [
    {
      "note_id": 1,
      "title": "Meeting Notes",
      "content": "Discuss project requirements...",
      "owner_id": 2,
      "owner_name": "john",
      "locked_by": null,
      "locked_by_name": null,
      "lock_timestamp": null,
      "created_at": "2025-09-30T10:00:00.000Z",
      "updated_at": "2025-09-30T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/notes/:id

Get a single note by ID.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/notes

Create a new note.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "New Note",
  "content": "Note content here..."
}
```

**Response:**
```json
{
  "success": true,
  "note": { /* note object */ },
  "message": "Note created successfully"
}
```

#### PUT /api/notes/:id

Update a note (requires lock).

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Updated Title",
  "content": "Updated content..."
}
```

#### DELETE /api/notes/:id

Delete a note.

**Headers:** `Authorization: Bearer <token>`

#### POST /api/notes/:id/lock

Acquire exclusive lock on a note.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "lockAcquired": true,
  "renewed": false,
  "message": "Lock acquired successfully",
  "expiresIn": 300
}
```

**Error (423 Locked):**
```json
{
  "error": "Note is locked by john",
  "lockAcquired": false
}
```

#### POST /api/notes/:id/unlock

Release lock on a note.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/notes/:id/lock-status

Check lock status of a note.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "isLocked": true,
  "lockedByMe": false,
  "lockedBy": "john",
  "lockTimeRemaining": 245
}
```

---

## 🎯 Role-Based Access Control

| Role  | Create Notes | Read All | Edit Own | Edit All | Delete Own | Delete All |
|-------|--------------|----------|----------|----------|------------|------------|
| Admin | ✅            | ✅        | ✅        | ✅        | ✅          | ✅          |
| User  | ✅            | ✅        | ✅        | ❌        | ✅          | ❌          |
| Guest | ❌            | ✅        | ❌        | ❌        | ❌          | ❌          |

---

## 🧪 Testing & Validation

### Test High Availability (Failover)

1. Start the system:
   ```bash
   docker-compose up
   ```

2. Login and create some notes

3. Simulate server failure:
   ```bash
   docker stop notes-app-1
   ```

4. Continue using the application - requests automatically route to `notes-app-2`

5. Check Nginx logs:
   ```bash
   docker logs notes-nginx
   ```

6. Restart failed server:
   ```bash
   docker start notes-app-1
   ```

7. Nginx automatically reintegrates the recovered server

### Test Concurrency Control (Locking)

1. Login with two different users in two browsers

2. User 1 clicks "Edit" on a note (acquires lock)

3. User 2 tries to edit the same note - sees "Note is locked by User1"

4. User 1 saves or cancels - lock is released

5. User 2 can now acquire the lock and edit

### Test Automatic Cleanup

1. Login and acquire a lock on a note

2. Close the browser without releasing the lock

3. Wait 5 minutes (lock timeout)

4. Check the note - lock is automatically released by background job

### Performance Testing

```bash
# Install Apache Bench (if not installed)
# Windows: download from Apache website
# Linux: sudo apt-get install apache2-utils
# Mac: brew install apache-bench

# Test login endpoint
ab -n 1000 -c 10 -p login.json -T application/json http://localhost/api/auth/login

# Test read operations (with authentication)
ab -n 1000 -c 50 -H "Authorization: Bearer YOUR_TOKEN" http://localhost/api/notes
```

---

## 🐳 Docker Commands

### Start all services
```bash
docker-compose up
```

### Start in background
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### Rebuild after code changes
```bash
docker-compose up --build
```

### View logs
```bash
docker-compose logs -f
docker logs notes-app-1      # Specific service
docker logs notes-nginx      # Nginx logs
```

### Check service status
```bash
docker-compose ps
```

### Access database
```bash
docker exec -it notes-postgres psql -U admin -d notesdb
```

### Clear all data and restart
```bash
docker-compose down -v
docker-compose up --build
```

---

## 🔧 Configuration

### Environment Variables

Edit `.env` file to customize:

```env
# Database
POSTGRES_DB=notesdb
POSTGRES_USER=admin
POSTGRES_PASSWORD=secret123

# Backend
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=development

# Frontend
REACT_APP_API_URL=http://localhost
```

### Timeouts & Intervals

**Backend (backend/middleware/auth.js):**
- Session timeout: 30 minutes
- Lock timeout: 5 minutes

**Backend (backend/jobs/cleanup.js):**
- Cleanup interval: 30 seconds

**Frontend (frontend/src/services/api.js):**
- Request timeout: 5 seconds
- Max retries: 2
- Heartbeat interval: 60 seconds

**Nginx (nginx/nginx.conf):**
- Health check interval: 5 seconds
- Failure threshold: 2 consecutive failures
- Request timeout: 60 seconds

---

## 🔍 Troubleshooting

### Port Already in Use

**Error:** `Bind for 0.0.0.0:80 failed: port is already allocated`

**Solution:**
```bash
# Windows
netstat -ano | findstr :80
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :80
kill -9 <PID>
```

### Database Connection Failed

**Error:** `Error: connect ECONNREFUSED`

**Solution:**
1. Check if PostgreSQL container is running:
   ```bash
   docker ps | grep postgres
   ```

2. Check PostgreSQL logs:
   ```bash
   docker logs notes-postgres
   ```

3. Restart database:
   ```bash
   docker-compose restart postgres
   ```

### Frontend Can't Connect to Backend

**Error:** `Network Error` in browser console

**Solution:**
1. Check if Nginx is running:
   ```bash
   docker ps | grep nginx
   ```

2. Verify backend services are healthy:
   ```bash
   curl http://localhost/health
   ```

3. Check Nginx logs:
   ```bash
   docker logs notes-nginx
   ```

### Application Running Slow

**Solution:**
1. Check Docker resource allocation (Settings → Resources)
2. Increase memory limit to at least 4GB
3. Check system resources:
   ```bash
   docker stats
   ```

---

## 📈 Scaling Guide

### Adding More Application Servers

1. Edit `docker-compose.yml`:

```yaml
node-app-3:
  build: ./backend
  container_name: notes-app-3
  environment:
    PORT: 3003
    DB_HOST: postgres
    # ... other env vars
  ports:
    - "3003:3003"
  # ... other config
```

2. Edit `nginx/nginx.conf`:

```nginx
upstream backend {
    least_conn;
    server node-app-1:3001 max_fails=2 fail_timeout=10s;
    server node-app-2:3002 max_fails=2 fail_timeout=10s;
    server node-app-3:3003 max_fails=2 fail_timeout=10s;  # Added
}
```

3. Restart services:

```bash
docker-compose up -d
```

### Database Read Replication (Future Enhancement)

For very high read loads, implement PostgreSQL read replicas:

1. Set up master-slave replication
2. Route write operations to master
3. Route read operations to read replicas
4. Update connection pool configuration

---

## 🔐 Security Best Practices

### Production Deployment Checklist

- [ ] Change default passwords in `.env`
- [ ] Generate strong JWT secret (32+ characters)
- [ ] Enable HTTPS with SSL/TLS certificates
- [ ] Configure Nginx rate limiting
- [ ] Set up firewall rules (only expose port 80/443)
- [ ] Enable PostgreSQL SSL connections
- [ ] Implement database backups
- [ ] Set up monitoring and alerting
- [ ] Review and harden Docker security
- [ ] Implement API request logging
- [ ] Add CORS restrictions
- [ ] Enable Content Security Policy (CSP)

---

## 📝 License

This project is developed for educational purposes as part of the INTE 22253 course at the University of Kelaniya.

---

## 👥 Contributors

Team 04 - University of Kelaniya  
Department of Industrial Management  
Faculty of Science

For questions or issues, please contact the team members listed above.

---

## 🙏 Acknowledgments

- Course Instructor: [Instructor Name]
- University of Kelaniya
- Department of Industrial Management

---

**Last Updated:** September 30, 2025  
**Version:** 1.0.0
