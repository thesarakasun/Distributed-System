# System Architecture Documentation

## 📐 Architecture Overview

The Distributed Shared Note-Taking System implements a **multi-tier distributed architecture** with the following key characteristics:

- **Stateless Application Servers** - No session data stored in server memory
- **Active-Active High Availability** - Both servers handle requests simultaneously
- **Centralized State Management** - All state stored in PostgreSQL
- **Intelligent Load Balancing** - Nginx with health monitoring and failover
- **Database-Backed Locking** - Pessimistic locks stored in centralized database

---

## 🎯 Architecture Principles

### 1. **Transparency**
- **Access Transparency:** Users access notes without knowing which server processes the request
- **Location Transparency:** Server location is abstracted by load balancer
- **Failure Transparency:** Automatic failover makes server failures invisible to users
- **Replication Transparency:** Session and lock state replicated via shared database

### 2. **Reliability**
- **Fault Tolerance:** System continues operating despite server failures
- **Error Handling:** All failures are detected, logged, and reported
- **Data Integrity:** ACID transactions ensure consistent state
- **Automatic Recovery:** Failed servers automatically rejoin when healthy

### 3. **Performance**
- **Load Distribution:** Requests balanced across servers using least-connections
- **Connection Pooling:** Efficient database connection reuse
- **Asynchronous I/O:** Non-blocking operations in Node.js
- **Query Optimization:** Indexed columns and efficient SQL queries

### 4. **Scalability**
- **Horizontal Scaling:** Add more application servers as needed
- **Stateless Design:** No server-specific state limits scaling
- **Database Scaling:** Can add read replicas for read-heavy workloads
- **Linear Growth:** System capacity increases linearly with servers

### 5. **Security**
- **Authentication:** JWT tokens with expiration
- **Authorization:** Role-based access control (RBAC)
- **Encryption:** Bcrypt password hashing
- **Input Validation:** SQL injection prevention via parameterized queries

---

## 🏛️ Detailed Component Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Single Page Application                │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │  │  Login   │  │Dashboard │  │  Note    │               │   │
│  │  │Component │  │Component │  │ Editor   │               │   │
│  │  └──────────┘  └──────────┘  └──────────┘               │   │
│  │         │              │              │                   │   │
│  │         └──────────────┴──────────────┘                   │   │
│  │                       │                                    │   │
│  │              ┌────────▼────────┐                          │   │
│  │              │  API Client     │◄─── Retry Logic          │   │
│  │              │  (Axios)        │◄─── Auth Interceptor     │   │
│  │              └────────┬────────┘                          │   │
│  └───────────────────────┼───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ HTTP/REST
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    LOAD BALANCING LAYER                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Nginx Reverse Proxy                       │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │ Health Check │  │Load Balancer │  │  Request Router │  │ │
│  │  │   (5s int)   │  │(least_conn)  │  │  (upstream)     │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────┬───────────────────┬────────────────────────────┘
                 │                   │
      ┌──────────┴──────┐   ┌────────┴──────────┐
      │                 │   │                   │
┌─────▼─────────────────▼───▼───────────────────▼────────────────┐
│                   APPLICATION LAYER                              │
│  ┌─────────────────────────┐  ┌─────────────────────────┐      │
│  │   Node.js Server 1      │  │   Node.js Server 2      │      │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │      │
│  │  │   Auth Routes    │   │  │  │   Auth Routes    │   │      │
│  │  │ - Login          │   │  │  │ - Login          │   │      │
│  │  │ - Logout         │   │  │  │ - Logout         │   │      │
│  │  │ - Heartbeat      │   │  │  │ - Heartbeat      │   │      │
│  │  └──────────────────┘   │  │  └──────────────────┘   │      │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │      │
│  │  │   Notes Routes   │   │  │  │   Notes Routes   │   │      │
│  │  │ - CRUD Ops       │   │  │  │ - CRUD Ops       │   │      │
│  │  │ - Lock Mgmt      │   │  │  │ - Lock Mgmt      │   │      │
│  │  └──────────────────┘   │  │  └──────────────────┘   │      │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │      │
│  │  │  Middleware      │   │  │  │  Middleware      │   │      │
│  │  │ - Auth Token     │   │  │  │ - Auth Token     │   │      │
│  │  │ - RBAC           │   │  │  │ - RBAC           │   │      │
│  │  └──────────────────┘   │  │  └──────────────────┘   │      │
│  │  ┌──────────────────┐   │  │  ┌──────────────────┐   │      │
│  │  │  Cleanup Jobs    │   │  │  │  Cleanup Jobs    │   │      │
│  │  │ - Sessions       │   │  │  │ - Sessions       │   │      │
│  │  │ - Locks          │   │  │  │ - Locks          │   │      │
│  │  └──────────────────┘   │  │  └──────────────────┘   │      │
│  └────────┬────────────────┘  └────────┬────────────────┘      │
└───────────┼─────────────────────────────┼─────────────────────-─┘
            │                             │
            └──────────┬──────────────────┘
                       │ Connection Pool (10 per server)
                       │
┌──────────────────────▼─────────────────────────────────────────┐
│                        DATA LAYER                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database (Centralized)              │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │ │
│  │  │   Users    │  │   Notes    │  │     Sessions       │   │ │
│  │  │ Table      │  │   Table    │  │      Table         │   │ │
│  │  │            │  │            │  │                    │   │ │
│  │  │ - user_id  │  │ - note_id  │  │ - session_id       │   │ │
│  │  │ - username │  │ - title    │  │ - user_id          │   │ │
│  │  │ - pass_hash│  │ - content  │  │ - token            │   │ │
│  │  │ - role     │  │ - owner_id │  │ - expires_at       │   │ │
│  │  │            │  │ - locked_by│  │ - last_activity    │   │ │
│  │  │            │  │ - lock_ts  │  │                    │   │ │
│  │  └────────────┘  └────────────┘  └────────────────────┘   │ │
│  │                                                              │ │
│  │  Features:                                                   │ │
│  │  • ACID Transactions                                         │ │
│  │  • Row-Level Locking                                         │ │
│  │  • Indexed Queries                                           │ │
│  │  • Connection Pooling (Max 20)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow Diagrams

### 1. User Login Flow

```
┌──────┐                  ┌──────┐                  ┌────────┐                  ┌──────────┐
│Client│                  │Nginx │                  │Node.js │                  │PostgreSQL│
└───┬──┘                  └───┬──┘                  └───┬────┘                  └────┬─────┘
    │                         │                         │                           │
    │ POST /api/auth/login    │                         │                           │
    ├────────────────────────►│                         │                           │
    │                         │ Forward request         │                           │
    │                         ├────────────────────────►│                           │
    │                         │                         │ Query user                │
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │                         │◄──────────────────────────┤
    │                         │                         │ User data                 │
    │                         │                         │                           │
    │                         │                         │ Verify password (bcrypt)  │
    │                         │                         │──────────┐                │
    │                         │                         │          │                │
    │                         │                         │◄─────────┘                │
    │                         │                         │                           │
    │                         │                         │ Generate JWT              │
    │                         │                         │──────────┐                │
    │                         │                         │          │                │
    │                         │                         │◄─────────┘                │
    │                         │                         │                           │
    │                         │                         │ Store session             │
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │                         │◄──────────────────────────┤
    │                         │                         │ Session saved             │
    │                         │                         │                           │
    │                         │ Response (token + user) │                           │
    │                         │◄────────────────────────┤                           │
    │ Response                │                         │                           │
    │◄────────────────────────┤                         │                           │
    │                         │                         │                           │
    │ Store token in          │                         │                           │
    │ localStorage            │                         │                           │
    │──────────┐              │                         │                           │
    │          │              │                         │                           │
    │◄─────────┘              │                         │                           │
```

### 2. Note Edit with Lock Acquisition Flow

```
┌──────┐                  ┌──────┐                  ┌────────┐                  ┌──────────┐
│Client│                  │Nginx │                  │Node.js │                  │PostgreSQL│
└───┬──┘                  └───┬──┘                  └───┬────┘                  └────┬─────┘
    │                         │                         │                           │
    │ Click "Edit" button     │                         │                           │
    │──────────┐              │                         │                           │
    │          │              │                         │                           │
    │◄─────────┘              │                         │                           │
    │                         │                         │                           │
    │ POST /api/notes/1/lock  │                         │                           │
    ├────────────────────────►│                         │                           │
    │ + Auth token            │ Forward request         │                           │
    │                         ├────────────────────────►│                           │
    │                         │                         │ Verify JWT                │
    │                         │                         │──────────┐                │
    │                         │                         │          │                │
    │                         │                         │◄─────────┘                │
    │                         │                         │                           │
    │                         │                         │ BEGIN TRANSACTION         │
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │                         │ SELECT ... FOR UPDATE     │
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │                         │◄──────────────────────────┤
    │                         │                         │ Note data (with row lock) │
    │                         │                         │                           │
    │                         │                         │ Check if already locked   │
    │                         │                         │──────────┐                │
    │                         │                         │          │                │
    │                         │                         │◄─────────┘                │
    │                         │                         │                           │
    │                         │                         │ UPDATE notes SET locked_by│
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │                         │◄──────────────────────────┤
    │                         │                         │ Lock acquired             │
    │                         │                         │                           │
    │                         │                         │ COMMIT                    │
    │                         │                         ├──────────────────────────►│
    │                         │                         │                           │
    │                         │ Response (lock acquired)│                           │
    │                         │◄────────────────────────┤                           │
    │ Response                │                         │                           │
    │◄────────────────────────┤                         │                           │
    │                         │                         │                           │
    │ Enable edit form        │                         │                           │
    │──────────┐              │                         │                           │
    │          │              │                         │                           │
    │◄─────────┘              │                         │                           │
    │                         │                         │                           │
    │ Start lock renewal      │                         │                           │
    │ timer (every 2 min)     │                         │                           │
    │──────────┐              │                         │                           │
    │          │              │                         │                           │
    │◄─────────┘              │                         │                           │
```

### 3. Server Failover Flow

```
Time: T0 - Normal Operation
┌──────┐         ┌──────┐         ┌────────┐  ┌────────┐         ┌──────────┐
│Client│         │Nginx │         │Node-1  │  │Node-2  │         │PostgreSQL│
└───┬──┘         └───┬──┘         └───┬────┘  └───┬────┘         └────┬─────┘
    │                │                 │           │                   │
    │  GET /api/notes                  │           │                   │
    ├───────────────►│                 │           │                   │
    │                │ Route to Node-1 │           │                   │
    │                ├────────────────►│           │                   │
    │                │                 │ Query DB  │                   │
    │                │                 ├───────────┼──────────────────►│
    │                │                 │           │                   │
    │                │                 │◄──────────┼───────────────────┤
    │                │ Response        │           │                   │
    │                │◄────────────────┤           │                   │
    │◄───────────────┤                 │           │                   │
    │                │                 │           │                   │

Time: T1 - Node-1 Crashes
    │                │                 X           │                   │
    │                │              CRASHED        │                   │
    │                │                             │                   │

Time: T2 - Health Check Fails
    │                │ Health check                │                   │
    │                ├────────────────X            │                   │
    │                │   NO RESPONSE               │                   │
    │                │                             │                   │
    │                │ Mark Node-1 DOWN            │                   │
    │                │──────────┐                  │                   │
    │                │          │                  │                   │
    │                │◄─────────┘                  │                   │

Time: T3 - New Request
    │  GET /api/notes                              │                   │
    ├───────────────►│                             │                   │
    │                │ Route to Node-2 (only healthy)                 │
    │                ├─────────────────────────────►│                   │
    │                │                             │ Query DB          │
    │                │                             ├──────────────────►│
    │                │                             │                   │
    │                │                             │◄──────────────────┤
    │                │ Response                    │                   │
    │                │◄─────────────────────────────┤                   │
    │◄───────────────┤                             │                   │
    │                │                             │                   │
    │ User unaware   │                             │                   │
    │ of failover    │                             │                   │

Time: T4 - Node-1 Recovers
    │                │                 ┌────────┐  │                   │
    │                │                 │RESTART │  │                   │
    │                │                 └───┬────┘  │                   │
    │                │ Health check        │       │                   │
    │                ├────────────────────►│       │                   │
    │                │                     │       │                   │
    │                │◄────────────────────┤       │                   │
    │                │ 200 OK              │       │                   │
    │                │                     │       │                   │
    │                │ Mark Node-1 UP      │       │                   │
    │                │──────────┐          │       │                   │
    │                │          │          │       │                   │
    │                │◄─────────┘          │       │                   │
    │                │                     │       │                   │
    │                │ Resume load         │       │                   │
    │                │ balancing           │       │                   │
```

---

## 🔒 Concurrency Control Mechanism

### Database-Backed Pessimistic Locking

**Why Database-Backed?**

In a distributed system with multiple application servers:
- ❌ **In-memory locks won't work** - Server 1 doesn't know about locks from Server 2
- ❌ **Server restarts lose locks** - All in-memory state is lost
- ✅ **Database is single source of truth** - All servers see same lock state
- ✅ **ACID guarantees** - Transactions ensure atomic lock operations

**Lock State Storage:**

```sql
-- Lock fields in notes table
locked_by INTEGER REFERENCES users(user_id)  -- Who holds the lock
lock_timestamp TIMESTAMP                     -- When lock was acquired
```

**Lock Acquisition Algorithm:**

```
1. Client requests lock via POST /api/notes/:id/lock
2. Server starts database transaction
3. Execute: SELECT ... FOR UPDATE (acquires row-level lock)
4. Check if note.locked_by IS NULL OR lock expired
5. If available:
   - UPDATE notes SET locked_by = user_id, lock_timestamp = NOW()
   - COMMIT transaction
   - Return success to client
6. If unavailable:
   - ROLLBACK transaction
   - Return error with current lock holder info
```

**Lock Lifecycle:**

```
┌─────────────┐
│  Available  │
└──────┬──────┘
       │ User requests lock
       │ POST /api/notes/:id/lock
       │
       ▼
┌─────────────┐
│   Locked    │◄───────┐ User saves changes
│  (5 min)    │        │ Lock auto-renewed
└──────┬──────┘        │ every 2 minutes
       │               │
       │ User saves/cancels OR
       │ 5 min timeout OR
       │ Session expires
       │
       ▼
┌─────────────┐
│  Released   │
└──────┬──────┘
       │
       └─────► Available
```

---

## 🛡️ Failure Detection & Recovery

### Server Failure Detection

**Active Health Checks (Nginx):**

```nginx
upstream backend {
    server node-app-1:3001 max_fails=2 fail_timeout=10s;
    server node-app-2:3002 max_fails=2 fail_timeout=10s;
}

# Health check endpoint: GET /health
# Interval: 5 seconds
# Timeout: 3 seconds
# Failure threshold: 2 consecutive failures
```

**Passive Health Checks:**
- Nginx monitors regular traffic
- If request fails (timeout, connection refused), increment fail counter
- If fail counter reaches max_fails, mark server as down

### Client Failure Detection

**Heartbeat Mechanism:**

```
Client                               Server
   │                                    │
   │  POST /api/auth/heartbeat          │
   ├───────────────────────────────────►│
   │  Every 60 seconds                  │
   │                                    │
   │                                    │ UPDATE sessions
   │                                    │ SET last_activity = NOW()
   │                                    │
   │◄───────────────────────────────────┤
   │  200 OK                            │
   │                                    │

If no heartbeat for 30 minutes:
   │                                    │
   │                                    │ Background job runs
   │                                    │
   │                                    │ DELETE FROM sessions
   │                                    │ WHERE last_activity < NOW() - 30min
   │                                    │
   │                                    │ UPDATE notes
   │                                    │ SET locked_by = NULL
   │                                    │ WHERE locked_by IN (expired_sessions)
```

### Automatic Cleanup Jobs

**Background Job Schedule:**

```javascript
// Runs every 30 seconds
setInterval(() => {
  // 1. Release locks from expired sessions
  UPDATE notes SET locked_by = NULL
  WHERE locked_by IN (
    SELECT user_id FROM sessions 
    WHERE last_activity < NOW() - INTERVAL '30 minutes'
  );
  
  // 2. Release locks that exceeded timeout
  UPDATE notes SET locked_by = NULL
  WHERE lock_timestamp < NOW() - INTERVAL '5 minutes'
  AND locked_by IS NOT NULL;
  
  // 3. Delete expired sessions
  DELETE FROM sessions
  WHERE expires_at < NOW()
  OR last_activity < NOW() - INTERVAL '30 minutes';
}, 30000);
```

---

## 📊 Capacity Planning

### Current Configuration

| Component | Capacity | Limit Factor |
|-----------|----------|--------------|
| Application Servers | 2 | Can scale to 10+ |
| Database Connections | 20 (10 per server) | PostgreSQL max_connections |
| Concurrent Users | 100-200 | Application server capacity |
| Notes per User | Unlimited | Database storage |
| Lock Duration | 5 minutes | Configurable timeout |
| Session Duration | 30 minutes | Configurable timeout |

### Scaling Scenarios

**Scenario 1: 500 Concurrent Users**
- Add 3 more application servers (total 5)
- Increase database connection pool to 50
- Add read replica for read-heavy operations
- Estimated response time: <300ms

**Scenario 2: 1000+ Concurrent Users**
- Deploy 10+ application servers
- Implement database read replication
- Add Redis caching layer
- Consider database sharding for very large datasets
- Estimated response time: <500ms

---

## 🔐 Security Architecture

### Defense in Depth Strategy

```
Layer 1: Network Security
- Firewall rules
- Only expose port 80/443
- Internal Docker network

Layer 2: Application Security
- Rate limiting (100 req/min per IP)
- Request timeout (60s)
- CORS policy

Layer 3: Authentication
- JWT tokens (30 min expiration)
- Secure token storage
- Automatic session expiration

Layer 4: Authorization
- Role-based access control
- Resource ownership checks
- Permission validation on every request

Layer 5: Data Security
- Bcrypt password hashing (cost 10)
- Parameterized SQL queries
- Input validation and sanitization

Layer 6: Database Security
- Connection encryption (SSL)
- Principle of least privilege
- Regular backups
```

---

## 📈 Performance Characteristics

### Latency Breakdown

```
Total Request Latency: ~200ms

┌─────────────────────────────────────────────────────────┐
│ Network Latency (Client → Nginx)        │ 20-50ms      │
├─────────────────────────────────────────────────────────┤
│ Nginx Processing                        │ 1-5ms        │
├─────────────────────────────────────────────────────────┤
│ Network Latency (Nginx → Node.js)      │ 1-2ms        │
├─────────────────────────────────────────────────────────┤
│ Node.js Processing                      │ 5-10ms       │
├─────────────────────────────────────────────────────────┤
│ Database Query                          │ 50-100ms     │
├─────────────────────────────────────────────────────────┤
│ Response Processing                     │ 5-10ms       │
├─────────────────────────────────────────────────────────┤
│ Network Latency (Response)              │ 20-50ms      │
└─────────────────────────────────────────────────────────┘
```

### Throughput

- **Read Operations:** 500-1000 req/sec per server
- **Write Operations:** 200-500 req/sec per server
- **Lock Acquisitions:** 100-200 req/sec per server

---

## 🎓 Design Patterns Used

1. **Repository Pattern** - Database access abstraction
2. **Middleware Pattern** - Request processing pipeline
3. **Observer Pattern** - Background cleanup jobs
4. **Proxy Pattern** - Nginx as reverse proxy
5. **Singleton Pattern** - Database connection pool
6. **Strategy Pattern** - Different RBAC strategies
7. **Factory Pattern** - JWT token generation

---

## 📚 References

- [CAP Theorem](https://en.wikipedia.org/wiki/CAP_theorem)
- [Two-Phase Locking](https://en.wikipedia.org/wiki/Two-phase_locking)
- [Nginx Load Balancing](https://docs.nginx.com/nginx/admin-guide/load-balancer/)
- [PostgreSQL MVCC](https://www.postgresql.org/docs/current/mvcc.html)
- [JWT Specification](https://jwt.io/)

---

**Last Updated:** September 30, 2025  
**Architecture Version:** 1.0.0
