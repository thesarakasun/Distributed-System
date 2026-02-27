# 🎉 COMPLETE GITOPS PIPELINE - MONITORING GUIDE

## ✅ Pipeline Status: FULLY OPERATIONAL

Your complete GitOps pipeline is working! Here's where to monitor everything:

---

## 🔍 MONITORING LOCATIONS

### 1️⃣ **GitHub Actions (CI Phase)**
Monitor code builds, image pushes, and manifest updates.

**URL:** https://github.com/thesarakasun/Distributed-_System/actions

**What to watch:**
- ✅ Build status (success/failure)
- ⏱️ Build duration (~5-10 minutes)
- 📦 Docker images being built and pushed
- 📝 Manifest files being updated with new image tags
- 🔄 Bot commits (GitHub Actions bot commits changes back)

**Key indicators:**
- Green checkmark ✅ = CI successful
- Red X ❌ = Build failed (check logs)
- Yellow dot 🟡 = Currently running

---

### 2️⃣ **ArgoCD UI (CD Phase)**
Monitor deployments, sync status, and cluster health.

**URL:** https://localhost:9090

**Login credentials:**
- **Username:** `admin`
- **Password:** `u-5bYOr-OgAb47BD`

**What to watch:**
- 🔄 Sync Status (Synced/OutOfSync)
- ❤️ Health Status (Healthy/Progressing/Degraded)
- 📊 Visual resource tree (pods, services, deployments)
- 🔔 Sync events and history
- ⏰ Last sync time

**Key indicators:**
- 🟢 **Synced + Healthy** = Perfect state
- 🟡 **OutOfSync** = Changes detected, about to sync
- 🔵 **Progressing** = Deployment in progress
- 🔴 **Degraded** = Pods failing (investigate)

---

### 3️⃣ **Kubernetes Cluster (Live State)**
Monitor actual running pods and services.

**Command Line:**
```powershell
# Check all pods
kubectl get pods -n default

# Watch pods in real-time
kubectl get pods -n default --watch

# Check ArgoCD application status
kubectl get application distributed-notes -n argocd

# Detailed application info
kubectl describe application distributed-notes -n argocd
```

**What to watch:**
- Pod status (Running/Pending/CrashLoopBackOff)
- Ready count (e.g., 1/1, 2/2)
- Restart count (should be 0 or low)
- Age (recent = just deployed)

---

### 4️⃣ **Application (End User)**
Verify the actual application is working.

**URL:** http://20.81.38.58

**Test:**
- Login page loads ✅
- Can login with: admin / password123
- Notes functionality works ✅

---

## 🔄 COMPLETE PIPELINE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│ 1️⃣ DEVELOPER                                               │
│    - Make code changes                                      │
│    - Commit and push to GitHub                             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2️⃣ GITHUB ACTIONS (CI) - Monitor at:                      │
│    https://github.com/thesarakasun/Distributed-_System/    │
│    actions                                                  │
│                                                             │
│    ✅ Build Docker images                                   │
│    ✅ Push to Azure Container Registry                      │
│    ✅ Update k8s/*.yaml with new image tags                 │
│    ✅ Commit changes back to Git                            │
│                                                             │
│    Duration: ~5-10 minutes                                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3️⃣ GIT REPOSITORY (Single Source of Truth)                │
│    - Manifests updated with new image tags                 │
│    - ArgoCD polls every 3 minutes                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 4️⃣ ARGOCD (CD) - Monitor at:                              │
│    https://localhost:9090                                   │
│                                                             │
│    ✅ Detects manifest changes                              │
│    ✅ Pulls new images from ACR                             │
│    ✅ Applies changes to cluster                            │
│    ✅ Performs rolling update                               │
│    ✅ Self-heals if manual changes occur                    │
│                                                             │
│    Duration: ~3 minutes (after detecting change)           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 5️⃣ KUBERNETES CLUSTER                                      │
│    - New pods deployed                                      │
│    - Old pods terminated gracefully                         │
│    - Zero downtime rolling update                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 6️⃣ PRODUCTION (End User)                                   │
│    http://20.81.38.58                                       │
│    - New version live                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TEST THE PIPELINE NOW

Run this to see the complete flow in action:

```powershell
# 1. Make a change
echo "// GitOps test $(Get-Date)" >> frontend/src/App.js

# 2. Commit and push
git add .
git commit -m "test: Verify GitOps pipeline"
git push origin main

# 3. Monitor GitHub Actions
start https://github.com/thesarakasun/Distributed-_System/actions

# 4. Monitor ArgoCD (already open at https://localhost:9090)
# Watch the application go: Synced → OutOfSync → Syncing → Synced

# 5. Watch pods update in real-time
kubectl get pods -n default --watch
```

**Expected timeline:**
- ⏱️ **0:00** - Push to GitHub
- ⏱️ **0:01** - GitHub Actions starts
- ⏱️ **5:00** - GitHub Actions completes, manifests updated
- ⏱️ **8:00** - ArgoCD detects changes (polls every 3 min)
- ⏱️ **9:00** - New pods deployed
- ⏱️ **10:00** - Old pods terminated
- ✅ **COMPLETE** - New version live!

---

## 📊 CURRENT STATUS

**As of now:**

| Component | Status | Details |
|-----------|--------|---------|
| **GitHub Actions** | ✅ Ready | Workflow active and working |
| **ArgoCD** | ✅ Running | Synced + Healthy |
| **Backend Pods** | ✅ 2/2 Running | Latest images deployed |
| **Frontend Pod** | ✅ 1/1 Running | Latest image deployed |
| **Nginx Pod** | ✅ 1/1 Running | Latest image deployed |
| **Postgres Pod** | ✅ 1/1 Running | Persistent storage |
| **Application** | ✅ Accessible | http://20.81.38.58 |
| **ArgoCD UI** | ✅ Accessible | https://localhost:9090 |

**Recent Activity:**
- ✅ GitHub Actions successfully pushed new images
- ✅ Bot committed updated manifests back to Git
- ✅ ArgoCD detected changes and synced automatically
- ✅ All pods updated with zero downtime

---

## 🎯 QUICK MONITORING COMMANDS

```powershell
# Check ArgoCD application status
kubectl get application distributed-notes -n argocd

# View detailed sync info
kubectl describe application distributed-notes -n argocd | Select-String -Pattern "Status|Message|Health"

# Watch pods updating in real-time
kubectl get pods -n default --watch

# Check ArgoCD logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller --tail=50

# Check repo server logs (Git sync)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50

# View last GitHub Actions run
gh run list -R thesarakasun/Distributed-_System --limit 5

# View specific run details
gh run view -R thesarakasun/Distributed-_System
```

---

## 🔔 WHAT TO LOOK FOR

### **In GitHub Actions:**
✅ "Build and Push to ACR" workflow completes
✅ All steps show green checkmarks
✅ "Update Kubernetes Manifests" step succeeds
✅ Bot commits changes to k8s/*.yaml files

### **In ArgoCD UI:**
✅ Application card shows "Synced" (green)
✅ Application card shows "Healthy" (green)
✅ Resource tree shows all green nodes
✅ Sync history shows recent successful syncs
✅ No red warnings or errors

### **In Kubernetes:**
✅ Pods show "Running" status
✅ Ready column shows full count (1/1, 2/2)
✅ Restart count is 0 or low
✅ Recent "Age" indicates new deployment

---

## 🚨 TROUBLESHOOTING

### If ArgoCD shows "OutOfSync" for too long:
```powershell
# Force manual sync
kubectl patch application distributed-notes -n argocd -p '{"operation":{"sync":{"revision":"main"}}}' --type merge
```

### If ArgoCD UI is not accessible:
```powershell
# Restart port forwarding
kubectl port-forward svc/argocd-server -n argocd 9090:443
```

### If pods are stuck in "Pending":
```powershell
# Check pod details
kubectl describe pod <pod-name> -n default

# Check node resources
kubectl top nodes
```

### If GitHub Actions fails:
1. Check workflow logs at https://github.com/thesarakasun/Distributed-_System/actions
2. Verify AZURE_CREDENTIALS secret is set
3. Check Azure Container Registry is accessible
4. Verify service principal permissions

---

## 📱 MONITORING DASHBOARD LINKS

**Bookmark these:**

1. **GitHub Actions Dashboard**
   https://github.com/thesarakasun/Distributed-_System/actions

2. **ArgoCD UI**
   https://localhost:9090
   (Username: admin | Password: u-5bYOr-OgAb47BD)

3. **Application**
   http://20.81.38.58

4. **Azure Portal - AKS Cluster**
   https://portal.azure.com/#resource/subscriptions/5a261b5d-4b2f-40fb-973c-18a9824c0eb4/resourceGroups/DistributedProject/providers/Microsoft.ContainerService/managedClusters/DistributedCluster/overview

5. **Azure Portal - Container Registry**
   https://portal.azure.com/#resource/subscriptions/5a261b5d-4b2f-40fb-973c-18a9824c0eb4/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry/overview

---

## 🎓 FOR YOUR INTERVIEW

**Question: "Where do you monitor your GitOps pipeline?"**

**Answer:**

> "I monitor the pipeline at two key locations:
>
> **1. GitHub Actions** for the CI phase - I can see build status, image creation, and manifest updates at the Actions tab in my repository. This shows me if the build succeeded and if the manifests were updated correctly.
>
> **2. ArgoCD UI** for the CD phase - I access it via port forwarding at localhost:9090. Here I get a visual representation of all my Kubernetes resources, their sync status, and health. I can see exactly when ArgoCD detects changes from Git and applies them to the cluster. The UI shows a resource tree with all deployments, services, and pods, color-coded by health status.
>
> Additionally, I use `kubectl` commands to verify the actual cluster state and can see deployment history directly in Git commits. Every deployment is traceable to a specific commit SHA, giving me complete auditability."

---

## ✅ VERIFICATION CHECKLIST

- [x] GitHub Actions CI workflow active
- [x] ArgoCD installed and running
- [x] ArgoCD application created (distributed-notes)
- [x] Auto-sync enabled (prune + self-heal)
- [x] ArgoCD UI accessible (https://localhost:9090)
- [x] All pods healthy (5/5 running)
- [x] Application accessible (http://20.81.38.58)
- [x] Complete GitOps flow verified

---

**🎉 Your GitOps pipeline is FULLY OPERATIONAL!**

**Setup Date:** February 27-28, 2026  
**Status:** Production Ready ✅  
**Monitoring:** Active ✅  

---

**Pro Tip:** Keep the ArgoCD UI open in a browser tab while working. You'll see changes sync automatically within 3 minutes of any Git push!
