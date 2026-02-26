# Azure Deployment Guide - Distributed Notes

Complete step-by-step guide for deploying the Distributed Notes application to Azure Kubernetes Service (AKS).

**Project:** Distributed Notes (MERN + PostgreSQL)  
**Deployment Date:** February 27, 2026  
**Status:** ✅ Phase 1 Complete

---

## Table of Contents
- [Phase 1: Azure Infrastructure](#phase-1-azure-infrastructure-✅-complete)
- [Phase 2: Build & Push Images](#phase-2-rebuild--push-docker-images)
- [Phase 3: Deploy to Kubernetes](#phase-3-deploy-to-kubernetes)
- [Phase 4: Initialize Database](#phase-4-initialize-database)
- [Troubleshooting](#troubleshooting-common-issues)
- [Maintenance](#maintenance-commands)

---

## Phase 1: Azure Infrastructure ✅ COMPLETE

**All infrastructure has been created successfully!**

### Created Resources:
- ✅ **Resource Group:** `DistributedProject` (East US)
- ✅ **Container Registry:** `distributedregistry.azurecr.io`
- ✅ **AKS Cluster:** `DistributedCluster` (2 nodes, Standard_B2s)
- ✅ **kubectl** connected to cluster
- ✅ **ACR** attached to AKS

### Verification:
```bash
# Verify you're logged in
az account show

# Check resource group
az group show --name DistributedProject

# Check ACR
az acr show --name distributedregistry --resource-group DistributedProject

# Check AKS
az aks show --name DistributedCluster --resource-group DistributedProject

# Verify cluster connection
kubectl get nodes
```

**Expected nodes output:**
```
NAME                                STATUS   ROLES    AGE   VERSION
aks-nodepool1-52722002-vmss000000   Ready    <none>   15m   v1.33.6
aks-nodepool1-52722002-vmss000001   Ready    <none>   15m   v1.33.6
```

---

## Phase 2: Rebuild & Push Docker Images

**⚠️ REQUIREMENT:** Docker Desktop must be running before starting this phase.

### Step 1: Start Docker Desktop

Make sure Docker Desktop is running on your Windows machine.

---

### Step 2: Log in to Azure Container Registry

```powershell
az acr login --name distributedregistry
```

**Expected Output:**
```
Login Succeeded
```

> **Troubleshooting:** If you get "DOCKER_COMMAND_ERROR", start Docker Desktop first.

---

### Step 3: Build Frontend Image

```powershell
docker build -t distributedregistry.azurecr.io/frontend:v1 -f ./frontend/Dockerfile ./frontend
```

**This will take 2-5 minutes.** You'll see npm installing packages.

**Expected Output (final lines):**
```
Successfully built <image-id>
Successfully tagged distributedregistry.azurecr.io/frontend:v1
```

---

### Step 4: Push Frontend Image to ACR

```powershell
docker push distributedregistry.azurecr.io/frontend:v1
```

**Expected Output:**
```
The push refers to repository [distributedregistry.azurecr.io/frontend]
...
v1: digest: sha256:... size: ...
```

---

### Step 5: Build Backend Image

```powershell
docker build -t distributedregistry.azurecr.io/backend:v1 -f ./backend/Dockerfile ./backend
```

**Expected Output:**
```
Successfully built <image-id>
Successfully tagged distributedregistry.azurecr.io/backend:v1
```

---

### Step 6: Push Backend Image to ACR

```powershell
docker push distributedregistry.azurecr.io/backend:v1
```

**Expected Output:**
```
v1: digest: sha256:... size: ...
```

---

### Step 7: Verify Images in ACR

```powershell
az acr repository list --name distributedregistry --output table
```

**Expected Output:**
```
Result
----------
backend
frontend
```

**Check tags:**
```powershell
az acr repository show-tags --name distributedregistry --repository frontend --output table
az acr repository show-tags --name distributedregistry --repository backend --output table
```

---

## Phase 2 Completion Checklist

- [ ] Docker Desktop is running
- [ ] Logged in to ACR successfully
- [ ] Built frontend image
- [ ] Pushed frontend image to ACR
- [ ] Built backend image
- [ ] Pushed backend image to ACR
- [ ] Verified both images exist in ACR

---

## Phase 3: Deploy to Kubernetes

### Step 1: Verify YAML Files (Already Updated!)

Your Kubernetes YAML files have been automatically updated to use:
- ✅ `distributedregistry.azurecr.io/frontend:v1`
- ✅ `distributedregistry.azurecr.io/backend:v1`

---

### Step 2: Apply All Kubernetes Configurations

```powershell
kubectl apply -f k8s/
```

**Expected Output:**
```
deployment.apps/frontend created
service/frontend-service created
deployment.apps/backend created
service/backend-service created
deployment.apps/postgres created
service/postgres-service created
persistentvolumeclaim/postgres-pvc created
deployment.apps/nginx created
service/nginx-service created
configmap/nginx-config created
```

---

### Step 3: Monitor Deployment Progress

**Watch pods being created:**
```powershell
kubectl get pods --watch
```

**Wait until all pods show `Running` status:**
```
NAME                        READY   STATUS    RESTARTS   AGE
backend-xxx-yyy             1/1     Running   0          2m
backend-xxx-zzz             1/1     Running   0          2m
frontend-xxx-yyy            1/1     Running   0          2m
nginx-xxx-yyy               1/1     Running   0          2m
postgres-xxx-yyy            1/1     Running   0          2m
```

Press `Ctrl+C` to stop watching once all are Running.

---

### Step 4: Get External IP Address

```powershell
kubectl get services
```

**Initial Output (IP pending):**
```
NAME               TYPE           EXTERNAL-IP   PORT(S)        AGE
nginx-service      LoadBalancer   <pending>     80:xxxxx/TCP   1m
postgres-service   ClusterIP      10.0.x.x      5432/TCP       1m
backend-service    ClusterIP      10.0.x.x      3001/TCP       1m
frontend-service   ClusterIP      10.0.x.x      3000/TCP       1m
```

**After 2-5 minutes:**
```
NAME               TYPE           EXTERNAL-IP     PORT(S)        AGE
nginx-service      LoadBalancer   20.123.45.67    80:xxxxx/TCP   5m
```

> **🌟 Important:** Copy the EXTERNAL-IP (e.g., `20.123.45.67`) - this is your application URL!

**To continuously watch for the IP:**
```powershell
kubectl get services --watch
```

---

### Step 5: Verify All Components

**Check deployments:**
```powershell
kubectl get deployments
```

**Expected Output:**
```
NAME       READY   UP-TO-DATE   AVAILABLE   AGE
backend    2/2     2            2           5m
frontend   1/1     1            1           5m
nginx      1/1     1            1           5m
postgres   1/1     1            1           5m
```

**Check pods detailed status:**
```powershell
kubectl get pods -o wide
```

---

## Phase 3 Completion Checklist

- [ ] Applied Kubernetes configurations
- [ ] All pods are `Running` (no CrashLoopBackOff or Error)
- [ ] External IP assigned to nginx-service
- [ ] All deployments show correct replica counts (READY)

---

## Phase 4: Initialize Database

**🔴 CRITICAL:** The database is empty! You must initialize it before the app will work.

### Step 1: Get the Postgres Pod Name

```powershell
kubectl get pods
```

**Look for the postgres pod:**
```
NAME                        READY   STATUS    RESTARTS   AGE
postgres-7d8f9b5c4-abc12    1/1     Running   0          5m
```

Copy the **exact pod name** (e.g., `postgres-7d8f9b5c4-abc12`).

---

### Step 2: Copy Init Script to the Pod

Replace `<postgres-pod-name>` with your actual pod name:

```powershell
kubectl cp ./database/init.sql <postgres-pod-name>:/tmp/init.sql
```

**Example:**
```powershell
kubectl cp ./database/init.sql postgres-7d8f9b5c4-abc12:/tmp/init.sql
```

**No output means success!**

---

### Step 3: Execute the Init Script

```powershell
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -f /tmp/init.sql
```

**Example:**
```powershell
kubectl exec -it postgres-7d8f9b5c4-abc12 -- psql -U user -d notes_db -f /tmp/init.sql
```

**Expected Output:**
```
CREATE TABLE
CREATE TABLE
CREATE INDEX
INSERT 0 1
...
```

---

### Step 4: Verify Database Initialization

```powershell
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c "\dt"
```

**Expected Output:**
```
           List of relations
 Schema |   Name    | Type  | Owner 
--------+-----------+-------+-------
 public | users     | table | user
 public | notes     | table | user
```

**Optional: Check if tables have data:**
```powershell
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c "SELECT COUNT(*) FROM users;"
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c "SELECT COUNT(*) FROM notes;"
```

---

## Phase 4 Completion Checklist

- [ ] Got postgres pod name
- [ ] Copied init.sql to pod successfully
- [ ] Executed init script without errors
- [ ] Verified tables exist in database

---

## 🎉 DEPLOYMENT COMPLETE!

### Access Your Application

Open your browser and go to:
```
http://<EXTERNAL-IP>
```

**Example:** `http://20.123.45.67`

You should see your **Distributed Notes** application! 🚀

---

## Quick Reference Commands

### Common Operations

```powershell
# Check everything
kubectl get all

# Watch pods
kubectl get pods --watch

# Get services
kubectl get services

# View logs
kubectl logs -l app=backend --tail=50 -f
kubectl logs -l app=frontend --tail=50 -f
kubectl logs -l app=nginx --tail=50 -f

# Describe a pod (for troubleshooting)
kubectl describe pod <pod-name>

# Get pod name quickly
kubectl get pods -l app=postgres -o name
```

---

### Database Commands

```powershell
# Get postgres pod name
$POSTGRES_POD = kubectl get pods -l app=postgres -o jsonpath="{.items[0].metadata.name}"

# Connect to database
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db

# Quick queries
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db -c "SELECT * FROM users;"
kubectl exec -it $POSTGRES_POD -- psql -U user -d notes_db -c "\dt"
```

**Inside psql prompt:**
```sql
\dt              -- List all tables
\d users         -- Describe users table
\d notes         -- Describe notes table
SELECT * FROM users;
\q               -- Quit
```

---

### Restart/Reload Services

```powershell
# Restart a deployment (recreates pods)
kubectl rollout restart deployment backend
kubectl rollout restart deployment frontend
kubectl rollout restart deployment nginx
kubectl rollout restart deployment postgres

# Watch rollout status
kubectl rollout status deployment backend

# Rollback if needed
kubectl rollout undo deployment backend
```

---

### Scale Services

```powershell
# Scale backend to 3 replicas
kubectl scale deployment backend --replicas=3

# Scale down to 1 replica
kubectl scale deployment backend --replicas=1

# Check scaling
kubectl get deployments
```

---

## Troubleshooting Common Issues

### Issue 1: Pods Stuck in "ImagePullBackOff"

 **Cause:** ACR not properly attached or wrong image name.

**Solution:**
```powershell
# Verify ACR attachment
az aks check-acr --resource-group DistributedProject --name DistributedCluster --acr distributedregistry.azurecr.io

# Check pod details
kubectl describe pod <pod-name>

# Look for the error message in the Events section
```

---

### Issue 2: Backend Can't Connect to Database

**Cause:** Database service not reachable or wrong credentials.

**Solution:**
```powershell
# Check backend logs
kubectl logs -l app=backend

# Look for connection errors like:
# "ECONNREFUSED", "password authentication failed", etc.

# Verify postgres service
kubectl get service postgres-service

# Check database initialization
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c "\dt"
```

---

### Issue 3: External IP Stays "Pending"

**Cause:** Azure is still provisioning the LoadBalancer.

**Solution:**
- Wait 5-10 minutes
- Check again with: `kubectl get services --watch`

If still pending after 10 minutes:
```powershell
# Check service events
kubectl describe service nginx-service

# Check if there are quota limits in Azure
az aks show --resource-group DistributedProject --name DistributedCluster
```

---

### Issue 4: Pods in "CrashLoopBackOff"

**Cause:** Application error preventing pod from starting.

**Solution:**
```powershell
# Check current logs
kubectl logs <pod-name>

# Check previous logs (from before the crash)
kubectl logs <pod-name> --previous

# Get detailed pod info
kubectl describe pod <pod-name>
```

Common causes:
- Database not initialized
- Environment variables missing
- Port conflicts
- Application code errors

---

### Issue 5: 502 Bad Gateway on External IP

**Cause:** Nginx can't reach backend/frontend services.

**Solution:**
```powershell
# Check if all pods are running
kubectl get pods

# Check nginx logs
kubectl logs -l app=nginx

# Verify nginx configuration
kubectl get configmap nginx-config -o yaml

# Test backend service internally
kubectl run test --rm -it --image=busybox -- wget -O- http://backend-service:3001/health
```

---

### Issue 6: Frontend Not Loading

**Cause:** React app environment variables or CORS issues.

**Solution:**
```powershell
# Check frontend logs
kubectl logs -l app=frontend

# Check frontend environment
kubectl exec -it <frontend-pod-name> -- env | grep REACT_APP

# Verify nginx is routing correctly
kubectl logs -l app=nginx | Select-String "3000"
```

---

## Maintenance Commands

### Update Application (Deploy New Version)

**1. Build and push new version:**
```powershell
docker build -t distributedregistry.azurecr.io/backend:v2 -f ./backend/Dockerfile ./backend
docker push distributedregistry.azurecr.io/backend:v2
```

**2. Update deployment:**
```powershell
kubectl set image deployment/backend backend=distributedregistry.azurecr.io/backend:v2
```

**3. Monitor rollout:**
```powershell
kubectl rollout status deployment/backend

# If there are issues, rollback:
kubectl rollout undo deployment/backend
```

---

### View Resource Usage

```powershell
# CPU and memory usage per pod
kubectl top pods

# Node resource usage
kubectl top nodes

# Get detailed pod resource info
kubectl describe pod <pod-name> | Select-String -Pattern "Limits|Requests"
```

---

### Backup Database

```powershell
# Get postgres pod name
$POSTGRES_POD = kubectl get pods -l app=postgres -o jsonpath="{.items[0].metadata.name}"

# Create backup
kubectl exec -it $POSTGRES_POD -- pg_dump -U user notes_db > backup.sql

# Restore from backup
kubectl exec -i $POSTGRES_POD -- psql -U user notes_db < backup.sql
```

---

### Clean Up Kubernetes Resources

**Delete specific deployment:**
```powershell
kubectl delete deployment backend
```

**Delete all resources from k8s/ folder:**
```powershell
kubectl delete -f k8s/
```

**Delete everything in the cluster:**
```powershell
kubectl delete all --all
```

---

### Clean Up Azure Resources

**Delete entire resource group (⚠️ CAUTION - deletes everything!):**
```powershell
az group delete --name DistributedProject --yes --no-wait
```

**Delete just the AKS cluster (keeps ACR and resource group):**
```powershell
az aks delete --name DistributedCluster --resource-group DistributedProject --yes --no-wait
```

**Delete just the ACR:**
```powershell
az acr delete --name distributedregistry --resource-group DistributedProject --yes
```

---

## Cost Optimization

### Stop Cluster When Not in Use

**Stop the cluster (saves ~70% of costs):**
```powershell
az aks stop --name DistributedCluster --resource-group DistributedProject
```

**Start it again when needed:**
```powershell
az aks start --name DistributedCluster --resource-group DistributedProject
```

**Check cluster state:**
```powershell
az aks show --name DistributedCluster --resource-group DistributedProject --query powerState
```

> **Note:** Stopping the cluster keeps your configuration but stops the VMs so you don't pay for compute.

---

### Monitor Costs

```powershell
# View cost analysis
az consumption usage list --start-date 2026-02-01 --end-date 2026-02-28

# List all resources in the resource group
az resource list --resource-group DistributedProject --output table
```

---

## Summary of Deployed Resources

| **Resource Type** | **Name** | **Purpose** |
|------------------|----------|-------------|
| Resource Group | DistributedProject | Container for all Azure resources |
| Container Registry | distributedregistry | Stores Docker images |
| AKS Cluster | DistributedCluster | Orchestrates containers |
| Node Pool | nodepool1 | 2x Standard_B2s VMs |
| **Kubernetes Resources** | | |
| Deployment | frontend | React.js frontend app (1 replica) |
| Deployment | backend | Node.js/Express API (2 replicas) |
| Deployment | nginx | Reverse proxy (1 replica) |
| Deployment | postgres | PostgreSQL database (1 replica) |
| Service | nginx-service | LoadBalancer with public IP |
| Service | frontend-service | Internal ClusterIP (port 3000) |
| Service | backend-service | Internal ClusterIP (port 3001) |
| Service | postgres-service | Internal ClusterIP (port 5432) |
| ConfigMap | nginx-config | Nginx reverse proxy configuration |
| PVC | postgres-pvc | Persistent storage for database |

---

## Environment Variables Reference

### Backend Environment Variables
(From [backend.yaml](k8s/backend.yaml))

```yaml
PORT: "3001"
CORS_ORIGIN: "*"
DB_HOST: "postgres-service"
DB_PORT: "5432"
DB_NAME: "notes_db"
DB_USER: "user"
DB_PASSWORD: "password123"
JWT_SECRET: "your-super-secret-jwt-key-change-in-production"
```

### Frontend Environment Variables
(From [frontend.yaml](k8s/frontend.yaml))

```yaml
REACT_APP_API_URL: "/"  # Relative path (Nginx handles routing)
```

---

## Useful Azure CLI Commands

```powershell
# List all resource groups
az group list --output table

# List all AKS clusters
az aks list --output table

# List all container registries
az acr list --output table

# Get AKS credentials again (if kubectl loses connection)
az aks get-credentials --resource-group DistributedProject --name DistributedCluster --overwrite-existing

# Show subscription info
az account show

# List all resources in subscription
az resource list --output table
```

---

## Security Best Practices

### 1. Change Default Passwords
Update the database password in production:
```yaml
# In backend.yaml
- name: DB_PASSWORD
  value: "your-strong-password-here"
```

### 2. Use Azure Key Vault
Store secrets in Azure Key Vault instead of plain text in YAML.

### 3. Enable HTTPS
Add TLS/SSL certificate to nginx-service:
```powershell
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### 4. Network Policies
Restrict pod-to-pod communication:
```powershell
# Enable network policies
az aks update --resource-group DistributedProject --name DistributedCluster --network-policy azure
```

### 5. Update JWT Secret
Change the JWT secret in [backend.yaml](k8s/backend.yaml):
```yaml
- name: JWT_SECRET
  value: "generate-a-strong-random-secret-here"
```

---

## Monitoring and Logging

### View All Logs

```powershell
# Stream logs from all backend pods
kubectl logs -f -l app=backend --all-containers=true

# Get logs from specific time
kubectl logs <pod-name> --since=1h

# Get logs from multiple pods
kubectl logs -l app=backend --prefix=true
```

### Set Up Azure Monitor (Optional)

```powershell
# Enable monitoring
az aks enable-addons --resource-group DistributedProject --name DistributedCluster --addons monitoring
```

---

## 🎊 Congratulations!

You've successfully deployed a production-ready Kubernetes application on Azure!

### What You've Achieved:
- ✅ Created cloud infrastructure on Azure
- ✅ Containerized a MERN stack application
- ✅ Deployed to Kubernetes with high availability
- ✅ Configured load balancing and networking
- ✅ Set up persistent storage for the database
- ✅ Made your app accessible via public IP

### Next Steps:
- Set up a custom domain name
- Enable HTTPS with SSL certificate
- Implement CI/CD pipeline with GitHub Actions
- Add monitoring and alerting
- Set up automated backups

---

**Documentation maintained by:** Distributed Notes Team  
**Last updated:** February 27, 2026  
**Version:** 1.0  

For support or issues, contact your project team or refer to the troubleshooting section above.
