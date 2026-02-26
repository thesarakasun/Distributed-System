# ✅ Phase 1 Complete - Azure Infrastructure Ready!

## What's Been Completed

### ✅ Azure Resources Created
- **Resource Group:** `DistributedProject` (East US)
- **Container Registry:** `distributedregistry.azurecr.io`
- **AKS Cluster:** `DistributedCluster` (2 nodes, Standard_B2s VMs)
- **kubectl:** Connected to your cluster

### ✅ Kubernetes YAML Files Updated
Your `k8s/` files now reference the correct registry:
- `distributedregistry.azurecr.io/frontend:v1`
- `distributedregistry.azurecr.io/backend:v1`

### ✅ Deployment Scripts Created
- `deploy-to-azure.ps1` - Automated deployment script
- `AZURE_DEPLOYMENT_COMPLETE_GUIDE.md` - Full documentation

---

## Next Steps

### 🔴 You Need to Complete Phase 2 & 3

**REQUIREMENT:** Start Docker Desktop first!

### Option 1: Use the Automated Script (Recommended)

```powershell
.\deploy-to-azure.ps1
```

This script will:
1. Check Docker is running
2. Log in to ACR
3. Build and push frontend image
4. Build and push backend image
5. Deploy everything to Kubernetes
6. Show you the status

### Option 2: Run Commands Manually

If you prefer manual control, run these commands one by one:

```powershell
# Phase 2: Build & Push Images
az acr login --name distributedregistry
docker build -t distributedregistry.azurecr.io/frontend:v1 -f ./frontend/Dockerfile ./frontend
docker push distributedregistry.azurecr.io/frontend:v1
docker build -t distributedregistry.azurecr.io/backend:v1 -f ./backend/Dockerfile ./backend
docker push distributedregistry.azurecr.io/backend:v1

# Phase 3: Deploy to Kubernetes
kubectl apply -f k8s/
kubectl get pods --watch  # Wait until all are Running (Ctrl+C to stop)
kubectl get services  # Get your EXTERNAL-IP
```

---

## After Deployment: Phase 4 - Initialize Database

Once your pods are running, you MUST initialize the database:

```powershell
# 1. Get postgres pod name
kubectl get pods

# 2. Copy init script (replace <postgres-pod-name> with actual name)
kubectl cp ./database/init.sql <postgres-pod-name>:/tmp/init.sql

# 3. Run init script
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -f /tmp/init.sql

# 4. Verify
kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c "\dt"
```

---

## Quick Verification Commands

```powershell
# Check cluster nodes
kubectl get nodes

# Check all pods
kubectl get pods

# Check services and get EXTERNAL-IP
kubectl get services

# Watch for EXTERNAL-IP to appear
kubectl get services --watch
```

---

## Important Information

### Your Azure Resources:
- **Subscription:** Azure for Students
- **Resource Group:** DistributedProject
- **Location:** East US
- **ACR Login Server:** distributedregistry.azurecr.io
- **AKS Cluster:** DistributedCluster

### Cost Saving Tip:
When not using the cluster, stop it to save credits:
```powershell
az aks stop --name DistributedCluster --resource-group DistributedProject
```

Start it again later:
```powershell
az aks start --name DistributedCluster --resource-group DistributedProject
```

---

## Troubleshooting

### Docker Desktop Not Running
**Error:** "DOCKER_COMMAND_ERROR"  
**Solution:** Start Docker Desktop and wait for it to fully load

### ImagePullBackOff Error
**Error:** Pods can't pull images  
**Solution:** Verify ACR is attached:
```powershell
az aks check-acr --resource-group DistributedProject --name DistributedCluster --acr distributedregistry.azurecr.io
```

### External IP Stays Pending
**Issue:** nginx-service shows `<pending>` for EXTERNAL-IP  
**Solution:** Wait 5-10 minutes. Azure needs time to provision the load balancer.

---

## Documentation

- **Full Guide:** [AZURE_DEPLOYMENT_COMPLETE_GUIDE.md](AZURE_DEPLOYMENT_COMPLETE_GUIDE.md)
- **Deployment Script:** [deploy-to-azure.ps1](deploy-to-azure.ps1)

---

## Summary

**Phase 1:** ✅ Complete (Infrastructure created)  
**Phase 2:** ⏳ Ready to run (Build & push images)  
**Phase 3:** ⏳ Ready to run (Deploy to K8s)  
**Phase 4:** ⏳ Pending (Initialize database)  

**Start Docker Desktop, then run:** `.\deploy-to-azure.ps1`

Good luck! 🚀
