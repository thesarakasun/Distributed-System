# GitHub Actions CI/CD Setup Guide

## 🚀 Overview

This GitHub Actions workflow implements the **Continuous Integration (CI)** phase of a GitOps pipeline for the Distributed Notes application. It automatically builds Docker images, pushes them to Azure Container Registry (ACR), and updates Kubernetes manifests with new image tags.

---

## 📋 Prerequisites

Before using this workflow, ensure you have:

1. ✅ GitHub repository with your code
2. ✅ Azure Container Registry (ACR) named `distributedregistry`
3. ✅ Azure Service Principal with ACR push permissions
4. ✅ Repository configured with required secrets

---

## 🔐 Required GitHub Secrets

### 1. Create Azure Service Principal

Run this command in Azure CLI:

```bash
az ad sp create-for-rbac \
  --name "DistributedNotesGitHubActions" \
  --role "AcrPush" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry \
  --sdk-auth
```

**This will output JSON like:**
```json
{
  "clientId": "xxxxx-xxxxx-xxxxx",
  "clientSecret": "xxxxx-xxxxx-xxxxx",
  "subscriptionId": "xxxxx-xxxxx-xxxxx",
  "tenantId": "xxxxx-xxxxx-xxxxx",
  ...
}
```

### 2. Add Secret to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AZURE_CREDENTIALS`
5. Value: **Paste the entire JSON output** from step 1
6. Click **Add secret**

---

## 🔧 How It Works

### Workflow Trigger
```yaml
on:
  push:
    branches:
      - main
```
The workflow triggers automatically on every push to the `main` branch.

### Step-by-Step Breakdown

#### **Step 1: Checkout Repository**
```yaml
- uses: actions/checkout@v4
```
- Clones the repository code
- Uses GitHub token for authentication
- Fetches full history for proper Git operations

#### **Step 2: Azure Login**
```yaml
- uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```
- Authenticates with Azure using service principal
- Required for ACR access

#### **Step 3: Login to ACR**
```bash
az acr login --name distributedregistry
```
- Authenticates Docker with Azure Container Registry
- Allows pushing images to ACR

#### **Steps 4-5: Build & Push Frontend**
```bash
docker build -t distributedregistry.azurecr.io/frontend:${{ github.sha }} -f ./frontend/Dockerfile ./frontend
docker push distributedregistry.azurecr.io/frontend:${{ github.sha }}
```
- Builds frontend image with commit SHA as tag
- Also tags as `:latest` for fallback
- Pushes both tags to ACR

#### **Steps 6-7: Build & Push Backend**
```bash
docker build -t distributedregistry.azurecr.io/backend:${{ github.sha }} -f ./backend/Dockerfile ./backend
docker push distributedregistry.azurecr.io/backend:${{ github.sha }}
```
- Same process for backend image
- Uses commit SHA for immutable, traceable deployments

#### **Steps 8-9: Build & Push Nginx**
```bash
docker build -t distributedregistry.azurecr.io/nginx:${{ github.sha }} -f ./nginx/Dockerfile ./nginx
docker push distributedregistry.azurecr.io/nginx:${{ github.sha }}
```
- Builds and pushes nginx reverse proxy image

#### **Step 10: Update Kubernetes Manifests**
```bash
sed -i "s|image: distributedregistry.azurecr.io/frontend:.*|image: distributedregistry.azurecr.io/frontend:${{ github.sha }}|g" k8s/frontend.yaml
```
- Uses `sed` to replace image tags in YAML files
- Updates `frontend.yaml`, `backend.yaml`, and `nginx.yaml`
- No external dependencies required

#### **Step 11-12: Commit & Push Changes**
```bash
git config --global user.name "github-actions[bot]"
git add k8s/*.yaml
git commit -m "🚀 CI: Update image tags to ${{ github.sha }}"
git push origin main
```
- Configures Git with bot credentials
- Commits updated YAML files
- Pushes back to `main` branch
- **This triggers ArgoCD to detect changes and sync!**

---

## 🎯 GitOps Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Developer pushes code to GitHub                             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ GitHub Actions CI Workflow Triggers                         │
│  • Builds Docker images (Frontend, Backend, Nginx)          │
│  • Tags with commit SHA (immutable, traceable)              │
│  • Pushes to Azure Container Registry                       │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Workflow Updates Kubernetes Manifests                       │
│  • Updates image tags in k8s/frontend.yaml                  │
│  • Updates image tags in k8s/backend.yaml                   │
│  • Updates image tags in k8s/nginx.yaml                     │
│  • Commits and pushes changes to main branch                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ ArgoCD Detects Changes (GitOps)                             │
│  • Polls Git repository for changes                         │
│  • Compares desired state (Git) vs actual state (K8s)       │
│  • Syncs cluster to match new image tags                    │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ Kubernetes Cluster Updated                                  │
│  • Pulls new images from ACR                                │
│  • Performs rolling update of pods                          │
│  • Zero-downtime deployment                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Workflow Output Example

When the workflow runs, you'll see output like:

```
✅ Successfully logged in to ACR: distributedregistry.azurecr.io
🔨 Building Frontend image with tag: a1b2c3d4...
✅ Frontend image built successfully
⬆️ Pushing Frontend image to ACR...
✅ Frontend image pushed: distributedregistry.azurecr.io/frontend:a1b2c3d4
🔨 Building Backend image with tag: a1b2c3d4...
✅ Backend image built successfully
⬆️ Pushing Backend image to ACR...
✅ Backend image pushed: distributedregistry.azurecr.io/backend:a1b2c3d4
📝 Updating Kubernetes manifests with commit SHA: a1b2c3d4
✅ Updated frontend.yaml
✅ Updated backend.yaml
✅ Updated nginx.yaml
✅ Changes committed and pushed to main branch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ CI Pipeline Completed Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 Images Built and Pushed:
  • Frontend: distributedregistry.azurecr.io/frontend:a1b2c3d4
  • Backend:  distributedregistry.azurecr.io/backend:a1b2c3d4
  • Nginx:    distributedregistry.azurecr.io/nginx:a1b2c3d4

📝 Kubernetes Manifests Updated:
  • k8s/frontend.yaml
  • k8s/backend.yaml
  • k8s/nginx.yaml

🔄 GitOps: ArgoCD will detect changes and sync automatically
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔍 Monitoring the Workflow

### View Workflow Runs
1. Go to your GitHub repository
2. Click on **Actions** tab
3. Select **CI - Build and Push to ACR** workflow
4. View individual run details

### Check Logs
- Each step has detailed logs
- Expand any step to see full output
- Errors will be highlighted in red

### Verify Images in ACR
```bash
# List repositories
az acr repository list --name distributedregistry --output table

# List tags for a repository
az acr repository show-tags --name distributedregistry --repository frontend --output table
```

---

## 🛠️ Customization

### Change ACR Name
Edit the environment variables at the top of `.github/workflows/ci.yml`:

```yaml
env:
  ACR_NAME: your-acr-name
  ACR_LOGIN_SERVER: your-acr-name.azurecr.io
  FRONTEND_IMAGE: your-acr-name.azurecr.io/frontend
  BACKEND_IMAGE: your-acr-name.azurecr.io/backend
  NGINX_IMAGE: your-acr-name.azurecr.io/nginx
```

### Add More Services
To build additional services, add steps following the same pattern:

```yaml
- name: Build MyService Image
  run: |
    docker build \
      -t ${{ env.ACR_LOGIN_SERVER }}/myservice:${{ github.sha }} \
      -t ${{ env.ACR_LOGIN_SERVER }}/myservice:latest \
      -f ./myservice/Dockerfile ./myservice

- name: Push MyService Image
  run: |
    docker push ${{ env.ACR_LOGIN_SERVER }}/myservice:${{ github.sha }}
    docker push ${{ env.ACR_LOGIN_SERVER }}/myservice:latest
```

### Change Trigger Branch
Edit the trigger section:

```yaml
on:
  push:
    branches:
      - main
      - develop  # Add more branches
```

---

## 🐛 Troubleshooting

### Issue: Authentication Failed
**Error:** `az acr login` fails

**Solution:**
- Verify `AZURE_CREDENTIALS` secret is correctly set
- Ensure service principal has `AcrPush` role
- Check subscription ID in credentials

```bash
# Re-create service principal
az ad sp create-for-rbac \
  --name "DistributedNotesGitHubActions" \
  --role "AcrPush" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry \
  --sdk-auth
```

---

### Issue: Docker Build Fails
**Error:** Build context or Dockerfile not found

**Solution:**
- Verify Dockerfile paths in workflow
- Ensure directory structure matches:
  ```
  ├── frontend/
  │   └── Dockerfile
  ├── backend/
  │   └── Dockerfile
  └── nginx/
      └── Dockerfile
  ```

---

### Issue: Git Push Fails
**Error:** `failed to push some refs`

**Solution:**
- Workflow uses `GITHUB_TOKEN` automatically
- Ensure repository settings allow GitHub Actions to write
- Go to **Settings** → **Actions** → **General**
- Set "Workflow permissions" to **Read and write permissions**

---

### Issue: ArgoCD Not Syncing
**Error:** Changes not detected by ArgoCD

**Solution:**
- Check ArgoCD sync interval (default: 3 minutes)
- Manually trigger sync in ArgoCD UI
- Verify ArgoCD is watching the correct branch and path

```bash
# Force sync via CLI
argocd app sync distributed-notes
```

---

## 📈 Best Practices

### 1. **Use Commit SHA for Tags**
- ✅ Immutable image tags
- ✅ Easy rollback to specific commits
- ✅ Traceability (image → commit → code)

### 2. **Tag as `:latest` Too**
- Useful for local development
- Fallback for testing
- Don't use `:latest` in production K8s manifests

### 3. **Git Commit Messages**
- Clear, descriptive messages
- Include commit SHA and workflow info
- Helps with audit trail

### 4. **Avoid Recursive Triggers**
- Use `[skip ci]` in commit messages if needed
- Workflow only updates YAML files, not code
- Won't trigger itself again

---

## 🔒 Security Best Practices

### 1. **Service Principal Permissions**
- Use **least privilege** principle
- Only grant `AcrPush` role
- Scope to specific registry

### 2. **Secret Management**
- Never commit secrets to Git
- Use GitHub Secrets for sensitive data
- Rotate service principal credentials regularly

### 3. **Image Scanning**
Add Trivy or other security scanning:

```yaml
- name: Scan Frontend Image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.FRONTEND_IMAGE }}:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'
```

---

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/)
- [ArgoCD Documentation](https://argo-cd.readthedocs.io/)
- [GitOps Principles](https://www.gitops.tech/)

---

## 🎓 Learning Points

This workflow demonstrates:
- ✅ **CI/CD automation** with GitHub Actions
- ✅ **GitOps principles** (Git as single source of truth)
- ✅ **Container image management** with ACR
- ✅ **Kubernetes manifest updates** via code
- ✅ **Immutable deployments** with commit SHAs
- ✅ **Zero-downtime deployments** via ArgoCD

---

## ✅ Checklist for Setup

Before your first run:

- [ ] GitHub repository created
- [ ] `.github/workflows/ci.yml` file added
- [ ] Azure Service Principal created with `AcrPush` role
- [ ] `AZURE_CREDENTIALS` secret added to GitHub
- [ ] Repository permissions set to "Read and write" for Actions
- [ ] ACR named `distributedregistry` exists
- [ ] Directory structure matches (frontend/, backend/, nginx/, k8s/)
- [ ] ArgoCD configured to watch this repository

---

## 🚀 Next Steps

After setting up CI:

1. **Set up ArgoCD** for Continuous Deployment (CD)
2. **Configure branch protection** rules
3. **Add tests** before building images
4. **Implement image scanning** for security
5. **Set up notifications** (Slack, email, etc.)

---

**Status:** ✅ Production-Ready  
**Last Updated:** February 27, 2026  
**Maintained By:** DevOps Team
