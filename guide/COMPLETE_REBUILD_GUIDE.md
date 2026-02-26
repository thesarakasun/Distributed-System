# Complete Azure AKS Deployment Guide - Distributed Notes
## Full Rebuild Instructions for Interview Preparation

**Created:** February 27, 2026  
**Project:** Distributed Notes (MERN Stack + PostgreSQL)  
**Last Deployed:** Successfully deployed to Azure AKS  
**External IP:** 20.81.38.58 (will change on rebuild)

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Phase 1: Azure Infrastructure](#phase-1-azure-infrastructure-setup)
3. [Phase 2: Build & Push Docker Images](#phase-2-build-and-push-docker-images)
4. [Phase 3: Deploy to Kubernetes](#phase-3-deploy-to-kubernetes)
5. [Phase 4: Initialize Database](#phase-4-initialize-database)
6. [Verification & Testing](#verification-and-testing)
7. [Cleanup Instructions](#cleanup-instructions)
8. [Important Notes](#important-notes)

---

## Prerequisites

### Required Tools
- Azure CLI installed and configured
- Docker Desktop running
- kubectl installed
- PowerShell or Bash terminal

### Before Starting
1. ✅ Ensure Docker Desktop is running
2. ✅ Log in to Azure CLI: `az login`
3. ✅ Verify subscription: `az account show`

---

## Phase 1: Azure Infrastructure Setup

### Step 1.1: Create Resource Group
```powershell
az group create --name DistributedProject --location eastus
```

**Expected Output:** 
```json
{
  "location": "eastus",
  "name": "DistributedProject",
  "provisioningState": "Succeeded"
}
```

---

### Step 1.2: Create Azure Container Registry (ACR)
```powershell
az acr create --resource-group DistributedProject --name distributedregistry --sku Basic
```

**Important Notes:**
- ACR name must be globally unique
- If `distributedregistry` is taken, try: `distributedregistry2026`, `distributedregistryXYZ`, etc.
- Save the `loginServer` value: `distributedregistry.azurecr.io`

**Expected Output:**
```json
{
  "loginServer": "distributedregistry.azurecr.io",
  "name": "distributedregistry",
  "provisioningState": "Succeeded"
}
```

---

### Step 1.3: Create AKS Cluster
```powershell
az aks create --resource-group DistributedProject --name DistributedCluster --node-count 2 --node-vm-size Standard_B2s --generate-ssh-keys --attach-acr distributedregistry
```

**Important:**
- Use `Standard_B2s` VM size (works with Azure for Students)
- Default `Standard_DS2_v2` may not be available in student subscription
- This takes 5-10 minutes to complete

**Expected Output:**
```json
{
  "agentPoolProfiles": [{"count": 2, "vmSize": "Standard_B2s"}],
  "name": "DistributedCluster",
  "provisioningState": "Succeeded"
}
```

---

### Step 1.4: Connect kubectl to AKS Cluster
```powershell
az aks get-credentials --resource-group DistributedProject --name DistributedCluster --overwrite-existing
```

**Expected Output:**
```
Merged "DistributedCluster" as current context in C:\Users\<YourUser>\.kube\config
```

---

### Step 1.5: Verify Cluster Nodes
```powershell
kubectl get nodes
```

**Expected Output:**
```
NAME                                STATUS   ROLES    AGE   VERSION
aks-nodepool1-52722002-vmss000000   Ready    <none>   5m    v1.33.6
aks-nodepool1-52722002-vmss000001   Ready    <none>   5m    v1.33.6
```

**✅ Phase 1 Complete - Infrastructure Ready**

---

## Phase 2: Build and Push Docker Images

### Step 2.1: Log in to ACR
```powershell
az acr login --name distributedregistry
```

**Expected Output:** `Login Succeeded`

**Troubleshooting:** If Docker error occurs, ensure Docker Desktop is running.

---

### Step 2.2: Build Frontend Image
```powershell
docker build -t distributedregistry.azurecr.io/frontend:v1 -f ./frontend/Dockerfile ./frontend
```

**Time:** 3-5 minutes (depends on npm install speed)

**Expected Output:**
```
Successfully built <image-id>
Successfully tagged distributedregistry.azurecr.io/frontend:v1
```

---

### Step 2.3: Push Frontend Image
```powershell
docker push distributedregistry.azurecr.io/frontend:v1
```

**Expected Output:**
```
v1: digest: sha256:47f5059f9b943224429bc006fd11c1dc934c9a89e398e9fcd86b08d6a893195a size: 1998
```

---

### Step 2.4: Build Backend Image
```powershell
docker build -t distributedregistry.azurecr.io/backend:v1 -f ./backend/Dockerfile ./backend
```

**Expected Output:**
```
Successfully built <image-id>
Successfully tagged distributedregistry.azurecr.io/backend:v1
```

---

### Step 2.5: Push Backend Image
```powershell
docker push distributedregistry.azurecr.io/backend:v1
```

**Expected Output:**
```
v1: digest: sha256:ad9ce4290cbd1d3555a06c23e5c74dc720ca00facd8e0e8c7310876f1aaaf098 size: 2204
```

---

### Step 2.6: Build Nginx Image
```powershell
docker build -t distributedregistry.azurecr.io/nginx:v1 -f ./nginx/Dockerfile ./nginx
```

**Expected Output:**
```
Successfully built <image-id>
Successfully tagged distributedregistry.azurecr.io/nginx:v1
```

---

### Step 2.7: Push Nginx Image
```powershell
docker push distributedregistry.azurecr.io/nginx:v1
```

**Expected Output:**
```
v1: digest: sha256:5b347a85dd9f95c143ec7f8c88685f7979ce7e4d63b84afeaa176a9df8d6b24e size: 2196
```

---

### Step 2.8: Verify All Images in ACR
```powershell
az acr repository list --name distributedregistry --output table
```

**Expected Output:**
```
Result
----------
backend
frontend
nginx
```

**Check tags:**
```powershell
az acr repository show-tags --name distributedregistry --repository frontend --output table
az acr repository show-tags --name distributedregistry --repository backend --output table
az acr repository show-tags --name distributedregistry --repository nginx --output table
```

**✅ Phase 2 Complete - All Images Built & Pushed**

---

## Phase 3: Deploy to Kubernetes

### Step 3.1: Update YAML Files (CRITICAL!)

Before deploying, ensure all Kubernetes YAML files reference the correct registry.

**Update these files:**

#### 1. `k8s/frontend.yaml`
Change:
```yaml
image: team04registry.azurecr.io/frontend:v1
```
To:
```yaml
image: distributedregistry.azurecr.io/frontend:v1
```

#### 2. `k8s/backend.yaml`
Change:
```yaml
image: team04registry.azurecr.io/backend:v7-stable
```
To:
```yaml
image: distributedregistry.azurecr.io/backend:v1
```

#### 3. `k8s/nginx.yaml`
Change:
```yaml
image: team04registry.azurecr.io/nginx:v1
```
To:
```yaml
image: distributedregistry.azurecr.io/nginx:v1
```

---

### Step 3.2: Apply Kubernetes Configurations
```powershell
kubectl apply -f k8s/
```

**Expected Output:**
```
deployment.apps/backend created
service/backend-service created
deployment.apps/frontend created
service/frontend-service created
deployment.apps/nginx-gateway created
service/nginx-public created
persistentvolumeclaim/postgres-pvc created
deployment.apps/postgres created
service/postgres-service created
```

---

### Step 3.3: Monitor Pod Creation
```powershell
kubectl get pods --watch
```

**Wait until all pods show `Running` status:**
```
NAME                            READY   STATUS    RESTARTS   AGE
backend-6579c4bb4-7c4dg         1/1     Running   0          2m
backend-6579c4bb4-gxwtb         1/1     Running   0          2m
frontend-54f4cf94b8-fkttp       1/1     Running   0          2m
nginx-gateway-8fcc7b88d-tpplk   1/1     Running   0          2m
postgres-767f5f8bd6-kskzj       1/1     Running   0          2m
```

Press `Ctrl+C` to stop watching.

---

### Step 3.4: Get External IP
```powershell
kubectl get services
```

**Expected Output:**
```
NAME               TYPE           CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
nginx-public       LoadBalancer   10.0.251.150   20.81.38.58   80:31008/TCP   5m
backend-service    ClusterIP      10.0.177.31    <none>        3001/TCP       5m
frontend-service   ClusterIP      10.0.185.59    <none>        3000/TCP       5m
postgres-service   ClusterIP      10.0.206.70    <none>        5432/TCP       5m
```

**🌟 Important:** 
- Copy the `EXTERNAL-IP` for `nginx-public` (e.g., `20.81.38.58`)
- If it shows `<pending>`, wait 2-5 minutes and check again
- This IP will be different each time you rebuild!

**To watch continuously:**
```powershell
kubectl get services --watch
```

**✅ Phase 3 Complete - Application Deployed**

---

## Phase 4: Initialize Database

### Step 4.1: Get PostgreSQL Pod Name
```powershell
kubectl get pods
```

**Look for the postgres pod** (example: `postgres-767f5f8bd6-kskzj`)

**Or get it automatically:**
```powershell
kubectl get pods -l app=postgres -o jsonpath="{.items[0].metadata.name}"
```

**Output example:** `postgres-767f5f8bd6-kskzj`

---

### Step 4.2: Copy Init Script to Pod
```powershell
kubectl cp ./database/init.sql postgres-767f5f8bd6-kskzj:/tmp/init.sql
```

**Replace** `postgres-767f5f8bd6-kskzj` with your actual pod name.

**No output = success!**

---

### Step 4.3: Execute Init Script
```powershell
kubectl exec -it postgres-767f5f8bd6-kskzj -- psql -U user -d notes_db -f /tmp/init.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
CREATE INDEX
CREATE INDEX
...
NOTICE:  Database initialized successfully!
NOTICE:  Sample users created:
NOTICE:    - admin (Admin role)
NOTICE:    - john (User role)
NOTICE:    - jane (User role)
NOTICE:    - guest (Guest role)
NOTICE:  Default password for all users: password123
DO
```

**Note:** Some errors about "role admin" are normal and can be ignored.

---

### Step 4.4: Verify Database Tables
```powershell
kubectl exec -it postgres-767f5f8bd6-kskzj -- psql -U user -d notes_db -c "\dt"
```

**Expected Output:**
```
         List of relations
 Schema |   Name   | Type  | Owner
--------+----------+-------+-------
 public | notes    | table | user
 public | sessions | table | user
 public | users    | table | user
(3 rows)
```

---

### Step 4.5: Verify Sample Users
```powershell
kubectl exec -it postgres-767f5f8bd6-kskzj -- psql -U user -d notes_db -c "SELECT username, role FROM users;"
```

**Expected Output:**
```
 username | role  
----------+-------
 admin    | Admin
 john     | User
 jane     | User
 guest    | Guest
(4 rows)
```

**✅ Phase 4 Complete - Database Initialized**

---

## Verification and Testing

### Final Status Check
```powershell
# Check all pods are running
kubectl get pods

# Check services and external IP
kubectl get services

# Check deployments
kubectl get deployments
```

**Expected Final State:**
- ✅ 5 pods running (2 backend, 1 frontend, 1 nginx, 1 postgres)
- ✅ External IP assigned to nginx-public
- ✅ All deployments show READY
- ✅ Database initialized with sample users

---

### Access the Application

**Open in browser:**
```
http://<EXTERNAL-IP>
```

**Example:** `http://20.81.38.58`

---

### Test Login Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `password123` | Admin |
| `john` | `password123` | User |
| `jane` | `password123` | User |
| `guest` | `password123` | Guest |

---

### View Application Logs

**Backend logs:**
```powershell
kubectl logs -l app=backend --tail=50 -f
```

**Frontend logs:**
```powershell
kubectl logs -l app=frontend --tail=50 -f
```

**Nginx logs:**
```powershell
kubectl logs -l app=nginx --tail=50 -f
```

**Postgres logs:**
```powershell
kubectl logs -l app=postgres --tail=50 -f
```

Press `Ctrl+C` to stop following logs.

---

## Cleanup Instructions

### Save Costs - Delete Everything When Not Needed

**Option 1: Delete Entire Resource Group (Recommended)**
```powershell
# This deletes EVERYTHING: AKS, ACR, and all resources
az group delete --name DistributedProject --yes --no-wait
```

**Option 2: Stop AKS Cluster (Saves ~70% cost)**
```powershell
# Stop the cluster (keeps configuration)
az aks stop --name DistributedCluster --resource-group DistributedProject

# Start it later
az aks start --name DistributedCluster --resource-group DistributedProject

# Check status
az aks show --name DistributedCluster --resource-group DistributedProject --query powerState
```

**Option 3: Delete Resources Individually**
```powershell
# Delete AKS cluster
az aks delete --name DistributedCluster --resource-group DistributedProject --yes --no-wait

# Delete ACR
az acr delete --name distributedregistry --resource-group DistributedProject --yes

# Delete resource group
az group delete --name DistributedProject --yes
```

---

## Important Notes

### Critical Information to Remember

#### Azure Resource Names (MUST BE CONSISTENT)
- **Resource Group:** `DistributedProject`
- **Location:** `eastus`
- **ACR Name:** `distributedregistry` (or whatever you used)
- **ACR Login Server:** `distributedregistry.azurecr.io`
- **AKS Cluster:** `DistributedCluster`
- **VM Size:** `Standard_B2s` (for Azure for Students)

#### Docker Image Tags
- Frontend: `distributedregistry.azurecr.io/frontend:v1`
- Backend: `distributedregistry.azurecr.io/backend:v1`
- Nginx: `distributedregistry.azurecr.io/nginx:v1`

#### Kubernetes Service Names
- `nginx-public` - LoadBalancer (External IP)
- `backend-service` - ClusterIP (Internal)
- `frontend-service` - ClusterIP (Internal)
- `postgres-service` - ClusterIP (Internal)

#### Database Configuration
- **Database Name:** `notes_db`
- **Username:** `user`
- **Password:** `password123`
- **Tables:** users, notes, sessions

---

### Common Issues and Solutions

#### Issue 1: ImagePullBackOff
**Symptom:** Pod stuck in ImagePullBackOff state

**Cause:** Wrong registry name in YAML files or ACR not attached

**Solution:**
```powershell
# Verify ACR attachment
az aks check-acr --resource-group DistributedProject --name DistributedCluster --acr distributedregistry.azurecr.io

# Re-attach if needed
az aks update --resource-group DistributedProject --name DistributedCluster --attach-acr distributedregistry

# Check pod details
kubectl describe pod <pod-name>
```

---

#### Issue 2: Docker Desktop Not Running
**Symptom:** "DOCKER_COMMAND_ERROR" or "Cannot connect to Docker daemon"

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully load (whale icon in system tray)
3. Retry the command

---

#### Issue 3: External IP Stays <pending>
**Symptom:** nginx-public shows `<pending>` for EXTERNAL-IP

**Solution:**
- Wait 5-10 minutes (Azure provisions load balancer)
- Check again: `kubectl get services --watch`
- If still pending after 15 minutes, check Azure quotas

---

#### Issue 4: VM Size Not Available
**Symptom:** "The VM size Standard_DS2_v2 is not allowed"

**Solution:**
Use `Standard_B2s` instead (works with Azure for Students):
```powershell
az aks create --resource-group DistributedProject --name DistributedCluster --node-count 2 --node-vm-size Standard_B2s --generate-ssh-keys --attach-acr distributedregistry
```

---

#### Issue 5: Database Connection Failed
**Symptom:** Backend can't connect to database

**Solution:**
```powershell
# Check if postgres pod is running
kubectl get pods -l app=postgres

# Check postgres logs
kubectl logs -l app=postgres

# Verify service
kubectl get service postgres-service

# Test connection from backend pod
kubectl exec -it <backend-pod-name> -- nc -zv postgres-service 5432
```

---

### Rebuild Checklist

Use this checklist when rebuilding before an interview:

**Pre-Deployment:**
- [ ] Azure CLI installed and logged in
- [ ] Docker Desktop running
- [ ] kubectl installed
- [ ] In project root directory

**Phase 1: Infrastructure**
- [ ] Create Resource Group
- [ ] Create ACR
- [ ] Create AKS cluster with `Standard_B2s` VM
- [ ] Connect kubectl
- [ ] Verify 2 nodes are Ready

**Phase 2: Images**
- [ ] Log in to ACR
- [ ] Build frontend image
- [ ] Push frontend image
- [ ] Build backend image
- [ ] Push backend image
- [ ] Build nginx image
- [ ] Push nginx image
- [ ] Verify all 3 images in ACR

**Phase 3: Deploy**
- [ ] Update YAML files with correct registry name
- [ ] Apply k8s configurations
- [ ] Wait for all pods Running
- [ ] Get External IP from nginx-public service

**Phase 4: Database**
- [ ] Get postgres pod name
- [ ] Copy init.sql to pod
- [ ] Execute init script
- [ ] Verify tables created
- [ ] Verify sample users exist

**Testing:**
- [ ] Open External IP in browser
- [ ] Test login with admin/password123
- [ ] Verify application works

---

## Quick Reference Commands

### Status Checks
```powershell
# Everything at once
kubectl get all

# Pods
kubectl get pods

# Services (with external IP)
kubectl get services

# Deployments
kubectl get deployments

# Watch pods in real-time
kubectl get pods --watch

# Watch services in real-time
kubectl get services --watch
```

### Logs
```powershell
# All backend logs
kubectl logs -l app=backend

# Follow backend logs
kubectl logs -l app=backend -f

# Last 50 lines
kubectl logs -l app=backend --tail=50

# Multiple pods
kubectl logs -l app=backend --all-containers=true --prefix=true
```

### Database Operations
```powershell
# Get postgres pod name
$POSTGRES_POD = kubectl get pods -l app=postgres -o jsonpath="{.items[0].metadata.name}"

# Connect to database
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db

# Run query
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db -c "SELECT * FROM users;"

# List tables
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db -c "\dt"

# Describe table
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db -c "\d users"
```

### Restart/Update
```powershell
# Restart deployment (recreates pods)
kubectl rollout restart deployment backend
kubectl rollout restart deployment frontend
kubectl rollout restart deployment nginx-gateway

# Watch rollout status
kubectl rollout status deployment backend

# Rollback to previous version
kubectl rollout undo deployment backend

# Scale deployment
kubectl scale deployment backend --replicas=3
```

### Debugging
```powershell
# Describe pod (see events and errors)
kubectl describe pod <pod-name>

# Get pod YAML
kubectl get pod <pod-name> -o yaml

# Execute command in pod
kubectl exec -it <pod-name> -- sh

# Check pod logs (previous instance)
kubectl logs <pod-name> --previous

# Port forward to local machine
kubectl port-forward <pod-name> 8080:3001
```

### Azure Commands
```powershell
# List all resources in resource group
az resource list --resource-group DistributedProject --output table

# Show AKS cluster info
az aks show --name DistributedCluster --resource-group DistributedProject

# Show ACR info
az acr show --name distributedregistry --resource-group DistributedProject

# Get AKS credentials again
az aks get-credentials --resource-group DistributedProject --name DistributedCluster --overwrite-existing

# Check ACR-AKS connection
az aks check-acr --resource-group DistributedProject --name DistributedCluster --acr distributedregistry.azurecr.io
```

---

## Deployment Timeline

**Typical deployment time breakdown:**

| Phase | Task | Time |
|-------|------|------|
| Phase 1 | Create Resource Group | 5 seconds |
| Phase 1 | Create ACR | 1-2 minutes |
| Phase 1 | Create AKS Cluster | 5-10 minutes |
| Phase 1 | Connect kubectl | 5 seconds |
| Phase 2 | Build Frontend | 3-5 minutes |
| Phase 2 | Push Frontend | 1-2 minutes |
| Phase 2 | Build Backend | 2-4 minutes |
| Phase 2 | Push Backend | 1-2 minutes |
| Phase 2 | Build Nginx | 30 seconds |
| Phase 2 | Push Nginx | 30 seconds |
| Phase 3 | Deploy to K8s | 30 seconds |
| Phase 3 | Pods Starting | 2-3 minutes |
| Phase 3 | External IP | 2-5 minutes |
| Phase 4 | Database Init | 30 seconds |

**Total Time: 20-35 minutes**

---

## Cost Estimates (Azure for Students)

**Monthly costs if running 24/7:**
- AKS Cluster (2x Standard_B2s): ~$30-40/month
- ACR Basic: ~$5/month
- Load Balancer: ~$18/month
- Storage: ~$5/month
- **Total: ~$60-70/month**

**Cost Saving Tips:**
1. Delete resource group when not in use (saves 100%)
2. Stop AKS cluster (saves ~70%)
3. Use only during development/demos
4. Delete after interviews

**Azure for Students Credit:**
- Usually $100/year
- Can rebuild ~1.5 months of continuous use
- Or rebuild multiple times for short demos

---

## Architecture Summary

```
Internet (Browser)
    ↓
[Azure Load Balancer] - External IP: 20.81.38.58
    ↓
[Nginx Gateway Pod] - Port 80
    ↓ (routes /api/* to backend)
    ↓ (routes /* to frontend)
    ├─→ [Frontend Pod] - React App (Port 3000)
    └─→ [Backend Pods x2] - Node.js API (Port 3001)
           ↓
        [PostgreSQL Pod] - Database (Port 5432)
           ↓
        [Persistent Volume] - Data Storage
```

**Network Flow:**
1. User accesses `http://20.81.38.58`
2. Azure Load Balancer routes to Nginx
3. Nginx reverse proxy routes:
   - `/api/*` → Backend service
   - `/*` → Frontend service
4. Backend connects to PostgreSQL
5. Data persists in Azure Persistent Volume

---

## Project File Structure

```
distributed-notes/
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   └── socket/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── public/
│   └── src/
├── nginx/
│   ├── Dockerfile
│   └── nginx.conf
├── database/
│   └── init.sql
├── k8s/
│   ├── backend.yaml
│   ├── frontend.yaml
│   ├── nginx.yaml
│   ├── postgres.yaml
│   └── ... (other K8s configs)
├── docker-compose.yml
├── README.md
└── COMPLETE_REBUILD_GUIDE.md (this file)
```

---

## Success Indicators

**You know deployment is successful when:**

✅ **Infrastructure:**
- `kubectl get nodes` shows 2 Ready nodes
- `az aks show` shows "Succeeded"
- `az acr list` shows your registry

✅ **Images:**
- `az acr repository list` shows 3 images (frontend, backend, nginx)
- All tags show `v1`

✅ **Kubernetes:**
- `kubectl get pods` shows 5 pods, all Running
- `kubectl get deployments` shows all READY
- `kubectl get services` shows External IP for nginx-public

✅ **Database:**
- `\dt` shows 3 tables
- `SELECT * FROM users` shows 4 users

✅ **Application:**
- Browser opens External IP
- Login page loads
- Can log in with test credentials
- Application functions correctly

---

## Additional Resources

### Official Documentation
- [Azure AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
- [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)

### Useful Commands Reference
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Azure CLI Reference](https://docs.microsoft.com/en-us/cli/azure/)

---

## Interview Preparation Checklist

**Demo Script for Interviews:**

1. **Show Azure Resources (5 min)**
   - Show resource group in Azure Portal
   - Show ACR with images
   - Show AKS cluster overview

2. **Show Kubernetes Deployment (5 min)**
   ```powershell
   kubectl get all
   kubectl get pods -o wide
   kubectl describe deployment backend
   ```

3. **Show Application Running (5 min)**
   - Open browser to External IP
   - Demonstrate login functionality
   - Show features working

4. **Show Monitoring (3 min)**
   ```powershell
   kubectl top pods
   kubectl logs -l app=backend --tail=20
   ```

5. **Show Database (2 min)**
   ```powershell
   kubectl exec -it <postgres-pod> -- psql -U user -d notes_db
   \dt
   SELECT * FROM users;
   ```

6. **Explain Architecture (5 min)**
   - Draw/show architecture diagram
   - Explain load balancing
   - Explain high availability (2 backend replicas)
   - Explain persistent storage

**Total Demo Time: ~25 minutes**

---

## Final Notes

**This guide was created based on successful deployment on February 27, 2026.**

**What Changed from Team04 to Distributed:**
- Registry: `team04registry` → `distributedregistry`
- Resource Group: Updated naming
- All YAML files updated with new registry paths
- Backend image tag: `v7-stable` → `v1`

**Remember:**
- External IP will be different each time
- Pod names will have different random suffixes
- Build times vary based on network speed
- Azure provisioning times can vary

**Good luck with your interviews! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** February 27, 2026  
**Status:** Deployed and Verified  
**Rebuild Status:** Ready for cleanup and rebuild

---

## Emergency Contact Commands

If something goes wrong during rebuild:

```powershell
# Check what went wrong
kubectl get events --sort-by='.lastTimestamp'

# Get all pod statuses
kubectl get pods -o wide

# Describe problem pod
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name> --previous

# Delete and recreate deployment
kubectl delete deployment <deployment-name>
kubectl apply -f k8s/<file>.yaml

# Nuclear option - delete everything and start over
kubectl delete all --all
kubectl apply -f k8s/
```

**Remember: You can always delete the resource group and start fresh!**

```powershell
az group delete --name DistributedProject --yes --no-wait
```

Then follow this guide again from Phase 1. That's the beauty of infrastructure as code! 😄
