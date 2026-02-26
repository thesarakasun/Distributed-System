# ArgoCD Setup Guide - Continuous Deployment (CD) Phase
## Complete GitOps Pipeline for Distributed Notes

**Date:** February 27, 2026  
**Project:** Distributed Shared Note-Taking System  
**Infrastructure:** Azure Kubernetes Service (AKS)  
**Repository:** GitHub (main branch)

---

## 📋 Prerequisites Checklist

Before proceeding, verify:
- ✅ AKS cluster is running with 2 nodes
- ✅ kubectl is connected to your cluster (`kubectl get nodes`)
- ✅ GitHub Actions CI workflow is working (builds & pushes images)
- ✅ Kubernetes manifests are in `k8s/` directory
- ✅ Current External IP: `20.81.38.58` (from nginx-public service)

---

## Phase 2: ArgoCD Installation and Configuration

---

## Step 1: Create ArgoCD Namespace

```powershell
kubectl create namespace argocd
```

**Expected Output:**
```
namespace/argocd created
```

**Verify:**
```powershell
kubectl get namespaces
```

You should see `argocd` in the list.

---

## Step 2: Install ArgoCD

Install the latest stable ArgoCD release:

```powershell
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

**Expected Output:**
```
customresourcedefinition.apiextensions.k8s.io/applications.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/applicationsets.argoproj.io created
customresourcedefinition.apiextensions.k8s.io/appprojects.argoproj.io created
serviceaccount/argocd-application-controller created
serviceaccount/argocd-applicationset-controller created
serviceaccount/argocd-dex-server created
serviceaccount/argocd-notifications-controller created
serviceaccount/argocd-redis created
serviceaccount/argocd-repo-server created
serviceaccount/argocd-server created
...
service/argocd-server created
deployment.apps/argocd-applicationset-controller created
deployment.apps/argocd-dex-server created
deployment.apps/argocd-notifications-controller created
deployment.apps/argocd-redis created
deployment.apps/argocd-repo-server created
deployment.apps/argocd-server created
statefulset.apps/argocd-application-controller created
```

**Wait for all pods to be ready (this takes 2-3 minutes):**

```powershell
kubectl get pods -n argocd --watch
```

**Wait until all pods show `Running` and `1/1` or `2/2` READY:**
```
NAME                                               READY   STATUS    RESTARTS   AGE
argocd-application-controller-0                    1/1     Running   0          2m
argocd-applicationset-controller-xxx-yyy           1/1     Running   0          2m
argocd-dex-server-xxx-yyy                          1/1     Running   0          2m
argocd-notifications-controller-xxx-yyy            1/1     Running   0          2m
argocd-redis-xxx-yyy                               1/1     Running   0          2m
argocd-repo-server-xxx-yyy                         1/1     Running   0          2m
argocd-server-xxx-yyy                              1/1     Running   0          2m
```

Press `Ctrl+C` when all pods are Running.

---

## Step 3: Retrieve ArgoCD Admin Password

The initial admin password is auto-generated and stored as a Kubernetes secret.

### Method 1: Using PowerShell (Recommended)

```powershell
# Get the base64-encoded password
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}"
```

**This outputs base64-encoded text like:**
```
YTFiMmMzZDRlNWY2Zzc4OQ==
```

**Decode it in PowerShell:**
```powershell
$base64Password = kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}"
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($base64Password))
```

**Or use this one-liner:**
```powershell
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}")))
```

**Expected Output (your actual password):**
```
a1b2c3d4e5f6g789
```

**💾 Save this password - you'll need it to login!**

---

### Method 2: Using ArgoCD CLI (Alternative)

If you have ArgoCD CLI installed:

```powershell
argocd admin initial-password -n argocd
```

---

## Step 4: Access ArgoCD UI via Port Forwarding

Since we're on Azure and don't have a public LoadBalancer for ArgoCD yet, use port forwarding:

```powershell
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

**Expected Output:**
```
Forwarding from 127.0.0.1:8080 -> 8080
Forwarding from [::1]:8080 -> 8080
```

**⚠️ Important:** 
- Keep this terminal window open
- Port forwarding runs in the foreground
- Open a new terminal for additional commands

**Access ArgoCD UI:**
- Open browser to: **https://localhost:8080**
- You'll see a security warning (self-signed certificate) - proceed anyway
- **Username:** `admin`
- **Password:** Use the password from Step 3

---

## Step 5: Create ArgoCD Application (Method 1 - Using UI)

### 5.1 Login to ArgoCD UI

1. Navigate to **https://localhost:8080**
2. Login with:
   - Username: `admin`
   - Password: `<password from Step 3>`

### 5.2 Create New Application

1. Click **"+ New App"** button (top left)

2. **Fill in General Details:**
   - **Application Name:** `distributed-notes`
   - **Project:** `default`
   - **Sync Policy:** `Automatic`
   - **Sync Options:**
     - ☑️ **Prune Resources** (enable)
     - ☑️ **Self Heal** (enable)
     - ☑️ **Auto-Create Namespace** (optional)

3. **Source Configuration:**
   - **Repository URL:** `https://github.com/<YOUR-USERNAME>/Distributed-Notes.git`
     - Replace `<YOUR-USERNAME>` with your GitHub username
     - Example: `https://github.com/JohnDoe/Distributed-Notes.git`
   - **Revision:** `main` (or `HEAD`)
   - **Path:** `k8s`

4. **Destination Configuration:**
   - **Cluster URL:** `https://kubernetes.default.svc`
   - **Namespace:** `default`

5. Click **"Create"** at the top

---

## Step 5: Create ArgoCD Application (Method 2 - Using YAML Manifest)

### Recommended Approach for Production

Create an application manifest file:

```powershell
# Create the manifest
@"
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: distributed-notes
  namespace: argocd
  finalizers:
    - resources-finalizer.argocd.argoproj.io
spec:
  project: default
  
  # Source: Your GitHub repository
  source:
    repoURL: https://github.com/<YOUR-USERNAME>/Distributed-Notes.git
    targetRevision: main
    path: k8s
  
  # Destination: Your AKS cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: default
  
  # Sync Policy: Automatic with Prune and Self Heal
  syncPolicy:
    automated:
      prune: true      # Delete resources that are no longer in Git
      selfHeal: true   # Force desired state even if manually changed
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
"@ | Out-File -FilePath argocd-application.yaml -Encoding UTF8
```

**Apply the manifest:**

```powershell
kubectl apply -f argocd-application.yaml
```

**Expected Output:**
```
application.argoproj.io/distributed-notes created
```

---

## Step 6: Verify ArgoCD Application

### Check Application Status

```powershell
kubectl get applications -n argocd
```

**Expected Output:**
```
NAME                SYNC STATUS   HEALTH STATUS
distributed-notes   Synced        Healthy
```

**Get detailed application info:**

```powershell
kubectl describe application distributed-notes -n argocd
```

---

## Step 7: Monitor Sync in ArgoCD UI

1. Go back to **https://localhost:8080**
2. You should see your **distributed-notes** application
3. Click on it to see the visual representation

**Application States:**

- 🟢 **Synced + Healthy** = Everything deployed correctly
- 🟡 **OutOfSync** = Changes detected in Git, syncing in progress
- 🔴 **Degraded** = Pods failing, check logs

**Visual Representation:**
- You'll see all your Kubernetes resources (Deployments, Services, Pods)
- Connected with arrows showing relationships
- Color-coded by health status

---

## Step 8: Verify End-to-End GitOps Flow

### Test the Complete Pipeline

1. **Make a code change** (e.g., update frontend)
   ```powershell
   # Edit any frontend file
   echo "// Updated on $(Get-Date)" >> frontend/src/App.js
   ```

2. **Commit and push to GitHub**
   ```powershell
   git add .
   git commit -m "feat: Test GitOps pipeline"
   git push origin main
   ```

3. **GitHub Actions triggers automatically** (CI Phase)
   - Builds new Docker images
   - Tags with commit SHA
   - Pushes to ACR
   - Updates `k8s/*.yaml` with new image tags
   - Commits changes back to Git

4. **ArgoCD detects changes** (CD Phase - within 3 minutes)
   - Polls GitHub repository every 3 minutes
   - Detects changes in `k8s/` directory
   - Syncs cluster state to match Git
   - Performs rolling update of pods

5. **Verify in ArgoCD UI**
   - Application shows "OutOfSync" briefly
   - Then syncs automatically
   - New pods replace old ones
   - Application returns to "Synced + Healthy"

---

## 🔄 GitOps Architecture Explained (For Interview)

### How the Complete Pipeline Works

```
┌─────────────────────────────────────────────────────────────────┐
│ DEVELOPER WORKFLOW                                              │
│                                                                 │
│  Developer → Commits Code → Pushes to GitHub (main branch)     │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ CI PHASE (GitHub Actions) - "PUSH" Model                       │
│                                                                 │
│  ✓ Triggered on push to main                                   │
│  ✓ Builds Docker images (Frontend, Backend, Nginx)             │
│  ✓ Tags with commit SHA (immutable, traceable)                 │
│  ✓ Pushes images to Azure Container Registry (ACR)             │
│  ✓ Updates k8s/*.yaml manifests with new image tags            │
│  ✓ Commits manifest changes back to Git                        │
│                                                                 │
│  Duration: ~5-10 minutes                                        │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
                    [Git Repository]
                    (Single Source of Truth)
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ CD PHASE (ArgoCD) - "PULL" Model                               │
│                                                                 │
│  ✓ ArgoCD polls Git repository every 3 minutes                 │
│  ✓ Compares Git state vs Cluster state                         │
│  ✓ Detects manifest changes (new image tags)                   │
│  ✓ Pulls new images from ACR                                   │
│  ✓ Applies changes to Kubernetes cluster                       │
│  ✓ Performs rolling update (zero downtime)                     │
│  ✓ Self-heals if manual changes are made to cluster            │
│                                                                 │
│  Sync Interval: 3 minutes (configurable)                       │
└─────────────────────────┬───────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ PRODUCTION CLUSTER (AKS)                                        │
│                                                                 │
│  ✓ Always matches Git state (declarative)                      │
│  ✓ Version controlled (can rollback to any commit)             │
│  ✓ Auditable (all changes tracked in Git)                      │
│  ✓ Self-healing (ArgoCD enforces desired state)                │
└─────────────────────────────────────────────────────────────────┘
```

---

### Key Differences: Push vs Pull

| Aspect | CI (GitHub Actions) | CD (ArgoCD) |
|--------|---------------------|-------------|
| **Model** | Push (proactive) | Pull (reactive) |
| **Triggers** | Git commit/push | Polling + webhooks |
| **Direction** | Pushes images to ACR | Pulls state from Git |
| **Authentication** | Service Principal | SSH/HTTPS to Git |
| **Scope** | Build & publish artifacts | Deploy to cluster |
| **Execution** | Outside cluster | Inside cluster |

---

### Interview Talking Points

**"How does your GitOps pipeline work?"**

> "We implement a two-phase GitOps architecture:
>
> **CI Phase (Push):** When I push code to GitHub, GitHub Actions automatically builds Docker images tagged with the commit SHA for immutability, pushes them to Azure Container Registry, and updates our Kubernetes manifests with the new image tags. These manifest changes are committed back to Git.
>
> **CD Phase (Pull):** ArgoCD, running inside our AKS cluster, continuously polls the Git repository every 3 minutes. When it detects changes in the manifests, it automatically syncs the cluster state to match Git—the single source of truth. This creates a declarative, self-healing system where the cluster always reflects what's defined in Git.
>
> **Key Benefits:**
> - **Traceability:** Every deployment is tied to a Git commit
> - **Rollback:** Simply revert a Git commit to roll back
> - **Security:** ArgoCD pulls from Git; no external push access to cluster
> - **Self-healing:** Manual changes are automatically reverted
> - **Auditability:** Complete deployment history in Git"

---

## 📊 Monitoring and Management

### View Application Status

```powershell
# Get application status
kubectl get application distributed-notes -n argocd

# Get detailed info
kubectl describe application distributed-notes -n argocd

# View sync status
kubectl get application distributed-notes -n argocd -o jsonpath='{.status.sync.status}'
```

---

### View Application History

```powershell
# Get application history
kubectl get application distributed-notes -n argocd -o jsonpath='{.status.history}'
```

---

### Manual Sync (if needed)

```powershell
# Force sync via kubectl
kubectl patch application distributed-notes -n argocd --type merge -p '{"operation":{"sync":{"revision":"main"}}}'
```

---

### View ArgoCD Logs

```powershell
# Application controller logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller -f

# Repo server logs (Git operations)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server -f

# Server logs (UI/API)
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server -f
```

---

## 🔧 Configuration Adjustments

### Change Sync Interval (Default: 3 minutes)

Edit ArgoCD ConfigMap:

```powershell
kubectl edit configmap argocd-cm -n argocd
```

Add this under `data`:

```yaml
data:
  timeout.reconciliation: 60s  # Sync every 60 seconds
```

Save and restart ArgoCD server:

```powershell
kubectl rollout restart deployment argocd-server -n argocd
```

---

### Enable Webhook (Instant Sync)

For instant sync instead of polling, configure a GitHub webhook:

1. In ArgoCD UI → **Settings** → **Repositories**
2. Click on your repository
3. Copy the webhook URL
4. In GitHub: **Settings** → **Webhooks** → **Add webhook**
5. Paste URL and set content type to `application/json`

---

## 🛡️ Security Best Practices

### 1. Change Admin Password

```powershell
# Login to ArgoCD
argocd login localhost:8080

# Update password
argocd account update-password
```

---

### 2. Delete Initial Admin Secret (after changing password)

```powershell
kubectl delete secret argocd-initial-admin-secret -n argocd
```

---

### 3. Use Private Repository with SSH Key

If your repository is private, add SSH credentials:

```powershell
# Generate SSH key
ssh-keygen -t ed25519 -C "argocd@distributed-notes"

# Add public key to GitHub: Settings → Deploy Keys

# Add private key to ArgoCD
kubectl create secret generic repo-ssh-key \
  --from-file=sshPrivateKey=$HOME/.ssh/id_ed25519 \
  -n argocd
```

Update application manifest to use SSH URL:
```yaml
source:
  repoURL: git@github.com:<USERNAME>/Distributed-Notes.git
```

---

## 🔍 Troubleshooting

### Issue 1: Application Stuck in "OutOfSync"

**Check:**
```powershell
kubectl get application distributed-notes -n argocd -o yaml
```

**Look for errors in status.conditions**

**Solution:**
- Check if manifests are valid: `kubectl apply --dry-run=client -f k8s/`
- Verify Git repository accessibility
- Check ArgoCD repo-server logs

---

### Issue 2: "Unable to Connect to Repository"

**Check repo-server logs:**
```powershell
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=50
```

**Solutions:**
- Verify repository URL is correct
- Check if repository is public
- If private, verify SSH key or access token

---

### Issue 3: Self-Heal Not Working

**Verify sync policy:**
```powershell
kubectl get application distributed-notes -n argocd -o jsonpath='{.spec.syncPolicy.automated}'
```

Should show:
```json
{"prune":true,"selfHeal":true}
```

**Fix if needed:**
```powershell
kubectl patch application distributed-notes -n argocd --type merge -p '{"spec":{"syncPolicy":{"automated":{"selfHeal":true,"prune":true}}}}'
```

---

### Issue 4: Port Forward Connection Lost

If port forwarding stops:

```powershell
# Kill existing port-forward
Get-Process | Where-Object {$_.ProcessName -eq "kubectl"} | Stop-Process

# Restart port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

---

## 📈 Advanced Features

### 1. Expose ArgoCD via LoadBalancer (Production)

Instead of port-forwarding, expose ArgoCD publicly:

```powershell
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'
```

**Get external IP:**
```powershell
kubectl get svc argocd-server -n argocd
```

**Access via:** `https://<EXTERNAL-IP>`

---

### 2. Multi-Environment Setup

Create separate applications for dev/staging/prod:

```yaml
# argocd-app-dev.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: distributed-notes-dev
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/<USERNAME>/Distributed-Notes.git
    targetRevision: develop
    path: k8s/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: dev
```

---

### 3. Blue-Green Deployments

Use ArgoCD Rollouts for advanced deployment strategies:

```powershell
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

---

## ✅ Complete Setup Verification Checklist

### Infrastructure Verification

- [ ] ArgoCD namespace created
- [ ] All ArgoCD pods are Running
- [ ] Initial admin password retrieved and saved
- [ ] ArgoCD UI accessible via port-forward
- [ ] Successfully logged in to ArgoCD UI

### Application Configuration

- [ ] `distributed-notes` application created
- [ ] Repository URL is correct
- [ ] Path set to `k8s`
- [ ] Branch set to `main`
- [ ] Automatic sync enabled
- [ ] Prune enabled
- [ ] Self-heal enabled

### GitOps Flow Verification

- [ ] Application shows "Synced" status
- [ ] Application shows "Healthy" status
- [ ] All resources visible in ArgoCD UI
- [ ] Test commit triggers GitHub Actions
- [ ] GitHub Actions completes successfully
- [ ] ArgoCD detects changes within 3 minutes
- [ ] Cluster syncs automatically
- [ ] New pods deployed with new image tags

---

## 🎯 Quick Command Reference

```powershell
# Check ArgoCD pods
kubectl get pods -n argocd

# Get admin password
[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String((kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}")))

# Port forward
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Check application
kubectl get application distributed-notes -n argocd

# View sync status
kubectl get application distributed-notes -n argocd -o jsonpath='{.status.sync.status}'

# View health status
kubectl get application distributed-notes -n argocd -o jsonpath='{.status.health.status}'

# Force sync
kubectl patch application distributed-notes -n argocd -p '{"operation":{"sync":{"revision":"main"}}}' --type merge

# View logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller -f
```

---

## 🎓 Summary: Complete GitOps Pipeline

**You now have a production-ready GitOps pipeline:**

1. ✅ **Code Change** → Developer pushes to GitHub
2. ✅ **CI (GitHub Actions)** → Builds images, updates manifests
3. ✅ **Git** → Single source of truth updated
4. ✅ **CD (ArgoCD)** → Detects changes, syncs cluster
5. ✅ **Production** → Always matches Git state

**Key Achievements:**
- 🔒 Secure (no direct cluster access needed)
- 📊 Auditable (all changes in Git history)
- 🔄 Self-healing (ArgoCD enforces desired state)
- ⏮️ Rollback-capable (revert Git commit)
- 🎯 Declarative (cluster state defined in code)

---

## 📞 Support Resources

- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [ArgoCD GitHub](https://github.com/argoproj/argo-cd)
- [ArgoCD Best Practices](https://argo-cd.readthedocs.io/en/stable/user-guide/best_practices/)

---

**Status:** ✅ Ready for Production  
**Last Updated:** February 27, 2026  
**Setup Time:** ~15 minutes  
**Interview Ready:** ✅ Yes

---

**🎉 Congratulations! Your GitOps pipeline is complete and production-ready!**
