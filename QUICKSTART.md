# Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Install Prerequisites

Ensure you have Docker Desktop installed:
- **Windows/Mac:** [Download Docker Desktop](https://www.docker.com/products/docker-desktop)
- **Linux:** Install Docker Engine and Docker Compose

### Step 2: Clone and Navigate

```bash
git clone <your-repo-url>
cd Distributed-Shared-Note-Taking-System
```

### Step 3: Start the System

```bash
docker-compose up --build
```

Wait for the message: "✓ Server: node-app-1/node-app-2 listening on port..."

### Step 4: Access the Application

Open your browser and go to: **http://localhost:3000**

### Step 5: Login

Use these demo credentials:

```
Username: admin
Password: password123
```

### Step 6: Test the System

1. **Create a Note:** Click "New Note" button
2. **Edit a Note:** Click on any note to edit it
3. **Test Locking:** Open another browser, login as "john", try to edit the same note
4. **Test Failover:** Run `docker stop notes-app-1` and continue using the app

---

## 📌 Important URLs

- **Frontend:** http://localhost:3000
- **API:** http://localhost/api
- **Health Check:** http://localhost/health

---

## 🛑 Stopping the System

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

---

## 🔥 Common Issues

### "Port 80 is already in use"

**Solution:**
```bash
# Stop the conflicting service or change the port in docker-compose.yml
nginx:
  ports:
    - "8080:80"  # Use port 8080 instead
```

### "Cannot connect to database"

**Solution:**
```bash
# Restart the database
docker-compose restart postgres
```

### "Frontend shows blank page"

**Solution:**
```bash
# Check frontend logs
docker logs notes-frontend

# Rebuild frontend
docker-compose up --build frontend
```

---

## 📖 Need More Help?

See the full documentation in [SETUP_GUIDE.md](SETUP_GUIDE.md)
