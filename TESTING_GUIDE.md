# System Testing Guide

## 🧪 Comprehensive Testing Checklist

### 1. Basic Functionality Testing

#### Test Authentication
- [ ] Login with valid credentials (admin/password123)
- [ ] Login with invalid credentials (should fail)
- [ ] Logout and verify session is cleared
- [ ] Try accessing dashboard without login (should redirect to login)

#### Test Note Creation
- [ ] Create a new note as Admin
- [ ] Create a new note as User (john)
- [ ] Try creating note as Guest (should be blocked)
- [ ] Create note with empty title (should fail validation)

#### Test Note Reading
- [ ] View all notes as Admin (should see all notes)
- [ ] View all notes as User (should see all notes)
- [ ] View all notes as Guest (should only see guest's notes if any)

#### Test Note Editing
- [ ] Edit own note as User
- [ ] Try editing another user's note as User (should be blocked)
- [ ] Edit any note as Admin (should succeed)

#### Test Note Deletion
- [ ] Delete own note as User
- [ ] Try deleting another user's note as User (should be blocked)
- [ ] Delete any note as Admin (should succeed)

---

### 2. Distributed Systems Testing

#### Test High Availability (Failover)

**Scenario 1: Primary Server Failure**
```bash
# Start system
docker-compose up -d

# Monitor which server handles requests
docker logs -f notes-nginx

# Login and create a note
# Note which server handled the request

# Stop primary server
docker stop notes-app-1

# Continue using the application
# Verify requests now go to notes-app-2

# Check system still works:
# - Create new note
# - Edit existing note
# - Delete note

# Restart primary server
docker start notes-app-1

# Wait 10 seconds for health checks
# Verify traffic distributes between both servers again
```

**Expected Results:**
- ✅ No data loss during failover
- ✅ Max 5-10 second disruption
- ✅ Session remains valid after failover
- ✅ Locks persist across servers

#### Test Load Balancing

**Scenario 2: Load Distribution**
```bash
# Start system
docker-compose up -d

# Make multiple requests and check distribution
for i in {1..10}; do
  curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost/api/notes
  sleep 1
done

# Check Nginx logs
docker logs notes-nginx | grep "upstream"

# Verify requests distributed across both servers
```

**Expected Results:**
- ✅ Requests distributed using least-connections algorithm
- ✅ Both servers handle requests
- ✅ No single server is overloaded

---

### 3. Concurrency Control Testing

#### Test Pessimistic Locking

**Scenario 1: Two Users Edit Same Note**

1. **User 1 (Admin):**
   - Login as admin
   - Click edit on "Meeting Notes"
   - ✅ Should acquire lock successfully
   - **Don't save yet**

2. **User 2 (John) - Different Browser:**
   - Login as john
   - Try to click edit on "Meeting Notes"
   - ✅ Should see "Note is locked by admin"
   - ✅ Edit button should be disabled or show warning

3. **User 1:**
   - Save the note
   - ✅ Lock should be released

4. **User 2:**
   - Try edit again
   - ✅ Should now acquire lock successfully

**Scenario 2: Lock Timeout**

1. User acquires lock on a note
2. Close browser without releasing lock
3. Wait 5 minutes (lock timeout)
4. Different user tries to edit
5. ✅ Should acquire lock successfully (previous lock expired)

**Scenario 3: Lock Renewal**

1. User acquires lock on a note
2. Keep editing for more than 5 minutes
3. ✅ Lock should auto-renew every 2 minutes
4. ✅ User should not lose lock while actively editing

---

### 4. Session Management Testing

#### Test Session Heartbeat

```bash
# Login and get token
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Keep session alive with heartbeats
for i in {1..5}; do
  curl -X POST http://localhost/api/auth/heartbeat \
    -H "Authorization: Bearer YOUR_TOKEN"
  sleep 60
done
```

**Expected Results:**
- ✅ Session stays active with regular heartbeats
- ✅ Session expires after 30 minutes without heartbeat
- ✅ Expired session requires re-login

#### Test Client Failure Detection

1. Login and acquire lock on a note
2. Close browser suddenly (kill process)
3. Wait 30 seconds for cleanup job to run
4. Login as different user
5. Check if note is still locked
6. ✅ Lock should be released after session timeout

---

### 5. Reliability Testing

#### Test Request Retry Logic

**Scenario: Network Failure**

1. Open browser developer tools (F12)
2. Go to Network tab
3. Set network throttling to "Offline"
4. Try to create a note
5. ✅ Should see "Server temporarily unavailable, retrying..."
6. Set network back to "Online"
7. ✅ Request should automatically retry and succeed

#### Test Server Recovery

```bash
# Start system
docker-compose up -d

# Kill both servers
docker stop notes-app-1 notes-app-2

# Try to use application
# ✅ Should show error message

# Restart one server
docker start notes-app-2

# Wait 10 seconds for health check
# Try application again
# ✅ Should work normally

# Restart second server
docker start notes-app-1
```

---

### 6. Performance Testing

#### Test Concurrent Users

```bash
# Install Apache Bench
# Windows: Download from Apache website
# Mac: brew install apache-bench
# Linux: sudo apt-get install apache2-utils

# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json http://localhost/api/auth/login

# Test read operations
ab -n 1000 -c 50 -H "Authorization: Bearer TOKEN" http://localhost/api/notes
```

**Expected Results:**
- ✅ Response time < 500ms for read operations
- ✅ System handles 100+ concurrent users
- ✅ No failed requests under normal load

#### Test Database Connection Pool

```bash
# Monitor database connections
docker exec -it notes-postgres psql -U admin -d notesdb -c "SELECT count(*) FROM pg_stat_activity;"

# Make many concurrent requests
# Verify connection count stays within pool limit (20)
```

---

### 7. Security Testing

#### Test Authentication

```bash
# Try accessing protected endpoint without token
curl http://localhost/api/notes
# ✅ Should return 401 Unauthorized

# Try with invalid token
curl -H "Authorization: Bearer invalid-token" http://localhost/api/notes
# ✅ Should return 401 Unauthorized

# Try with expired token
# ✅ Should return 401 Unauthorized and prompt login
```

#### Test Authorization

```bash
# Login as Guest
# Try to create note
# ✅ Should return 403 Forbidden

# Login as User
# Try to delete another user's note
# ✅ Should return 403 Forbidden

# Login as Admin
# Try to delete any note
# ✅ Should succeed
```

#### Test SQL Injection

```bash
# Try SQL injection in login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR 1=1--","password":"anything"}'

# ✅ Should fail (parameterized queries prevent injection)
```

---

### 8. Data Consistency Testing

#### Test ACID Properties

**Atomicity:**
1. Try to update note without acquiring lock
2. ✅ Operation should fail completely (no partial update)

**Consistency:**
1. Create note
2. Stop one server mid-update
3. ✅ Note should be either old version or new version (not corrupted)

**Isolation:**
1. Two users try to update same note simultaneously
2. ✅ Only one should acquire lock
3. ✅ Other should wait or fail gracefully

**Durability:**
1. Create note
2. Restart all services
3. ✅ Note should persist

---

### 9. Monitoring & Logging

#### Check Application Logs

```bash
# Backend logs
docker logs notes-app-1
docker logs notes-app-2

# Frontend logs
docker logs notes-frontend

# Nginx logs
docker logs notes-nginx

# Database logs
docker logs notes-postgres
```

#### Check System Health

```bash
# Health check endpoint
curl http://localhost/health

# Expected response:
{
  "status": "healthy",
  "server": "node-app-1",
  "timestamp": "2025-09-30T12:00:00.000Z",
  "uptime": 3600
}
```

---

## 📊 Test Results Template

Create a file `TEST_RESULTS.md` and document your findings:

```markdown
# Test Results

**Date:** [Date]
**Tester:** [Name]
**Version:** 1.0.0

## Functionality Tests
- [ ] Authentication: PASS/FAIL
- [ ] Note CRUD: PASS/FAIL
- [ ] Role-based Access: PASS/FAIL

## Distributed Systems Tests
- [ ] Failover: PASS/FAIL (Failover time: X seconds)
- [ ] Load Balancing: PASS/FAIL
- [ ] Lock Consistency: PASS/FAIL

## Performance Tests
- [ ] Response Time: X ms (Target: <500ms)
- [ ] Concurrent Users: X users (Target: 100+)
- [ ] Connection Pool: Within limits

## Issues Found
1. [Description]
2. [Description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🎯 Acceptance Criteria

The system passes testing if:

✅ All functionality tests pass  
✅ Failover occurs in < 10 seconds  
✅ No data loss during server failure  
✅ Locks prevent concurrent edits  
✅ Session persists across servers  
✅ Response time < 500ms  
✅ Supports 100+ concurrent users  
✅ No security vulnerabilities  
✅ All cleanup jobs work correctly  

---

## 📝 Notes

- Run all tests multiple times to ensure consistency
- Test with different browsers (Chrome, Firefox, Edge)
- Test with different network conditions (slow 3G, offline)
- Monitor resource usage during testing
- Document any unexpected behavior

---

**Last Updated:** September 30, 2025
