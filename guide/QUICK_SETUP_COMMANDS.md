# Quick Setup Commands for GitHub Actions CI

## 🔐 Step 1: Create Azure Service Principal

Run these commands in your terminal:

### Get Your Subscription ID
```bash
az account show --query id -o tsv
```
**Copy this ID - you'll need it!**

---

### Create Service Principal with ACR Push Permission

```bash
# Replace <SUBSCRIPTION_ID> with your actual subscription ID
az ad sp create-for-rbac \
  --name "DistributedNotesGitHubActions" \
  --role "AcrPush" \
  --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry \
  --sdk-auth
```

**Example with actual subscription ID:**
```bash
az ad sp create-for-rbac \
  --name "DistributedNotesGitHubActions" \
  --role "AcrPush" \
  --scopes /subscriptions/5a261b5d-4b2f-40fb-973c-18a9824c0eb4/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry \
  --sdk-auth
```

---

### Expected Output

You'll see JSON like this:

```json
{
  "clientId": "12345678-1234-1234-1234-123456789abc",
  "clientSecret": "abcdefgh-1234-5678-9012-abcdefghijkl",
  "subscriptionId": "5a261b5d-4b2f-40fb-973c-18a9824c0eb4",
  "tenantId": "aa232db2-7a78-4414-a529-33db9124cba7",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

**⚠️ IMPORTANT: Copy the ENTIRE JSON output!**

---

## 📝 Step 2: Add Secret to GitHub

### Via GitHub Web UI:

1. Go to your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Fill in:
   - **Name:** `AZURE_CREDENTIALS`
   - **Secret:** Paste the entire JSON from Step 1
6. Click **Add secret**

### Via GitHub CLI (alternative):

```bash
# Install GitHub CLI first: https://cli.github.com/

# Login to GitHub
gh auth login

# Add secret (replace with your JSON)
gh secret set AZURE_CREDENTIALS --body '{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  ...
}'
```

---

## ⚙️ Step 3: Configure Repository Permissions

1. Go to repository **Settings**
2. Click **Actions** → **General**
3. Scroll to **Workflow permissions**
4. Select **Read and write permissions**
5. Check **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

---

## 🧪 Step 4: Test the Workflow

### Trigger a Test Run:

```bash
# Make a small change
echo "# Test CI" >> README.md

# Commit and push
git add README.md
git commit -m "test: Trigger CI workflow"
git push origin main
```

### Monitor the Workflow:

1. Go to **Actions** tab in GitHub
2. You should see **CI - Build and Push to ACR** workflow running
3. Click on it to see live logs

---

## ✅ Verification Commands

### Verify Service Principal was Created:
```bash
az ad sp list --display-name "DistributedNotesGitHubActions" --output table
```

### Verify ACR Access:
```bash
# Get service principal app ID
APP_ID=$(az ad sp list --display-name "DistributedNotesGitHubActions" --query "[0].appId" -o tsv)

# Check role assignment
az role assignment list --assignee $APP_ID --output table
```

### Test ACR Login with Service Principal:
```bash
# Get credentials from the JSON you saved
CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"
TENANT_ID="your-tenant-id"

# Test login
az login --service-principal \
  --username $CLIENT_ID \
  --password $CLIENT_SECRET \
  --tenant $TENANT_ID

# Test ACR access
az acr login --name distributedregistry
```

---

## 🔄 Complete Setup Checklist

Run through this checklist:

### Azure Setup
- [ ] Logged in to Azure CLI (`az login`)
- [ ] Got subscription ID (`az account show`)
- [ ] Created service principal with `AcrPush` role
- [ ] Saved the JSON output securely

### GitHub Setup
- [ ] Added `AZURE_CREDENTIALS` secret to repository
- [ ] Set workflow permissions to "Read and write"
- [ ] Workflow file exists at `.github/workflows/ci.yml`

### Testing
- [ ] Made a test commit and pushed to main
- [ ] Workflow triggered automatically
- [ ] All steps completed successfully
- [ ] Images pushed to ACR
- [ ] YAML files updated with new tags
- [ ] Changes committed back to repository

---

## 🐛 Troubleshooting Quick Fixes

### Issue: "invalid_client" or authentication failed
```bash
# Delete old service principal
az ad sp delete --id $(az ad sp list --display-name "DistributedNotesGitHubActions" --query "[0].appId" -o tsv)

# Create new one
az ad sp create-for-rbac --name "DistributedNotesGitHubActionsNew" --role "AcrPush" --scopes /subscriptions/<SUBSCRIPTION_ID>/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry --sdk-auth

# Update GitHub secret with new JSON
```

### Issue: "Permission denied" to push to repository
```bash
# In GitHub: Settings → Actions → General → Workflow permissions
# Select: Read and write permissions
# Save
```

### Issue: Can't find ACR or resource group
```bash
# Verify resource group exists
az group show --name DistributedProject

# Verify ACR exists
az acr show --name distributedregistry --resource-group DistributedProject

# If not found, check the resource names in your deployment
az group list --output table
az acr list --output table
```

---

## 📋 Commands Summary

**Copy this entire block and replace placeholders:**

```bash
# Step 1: Get subscription ID
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
echo "Subscription ID: $SUBSCRIPTION_ID"

# Step 2: Create service principal and save output
az ad sp create-for-rbac \
  --name "DistributedNotesGitHubActions" \
  --role "AcrPush" \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/DistributedProject/providers/Microsoft.ContainerRegistry/registries/distributedregistry \
  --sdk-auth > azure-credentials.json

# Step 3: Display the credentials (COPY THIS ENTIRE OUTPUT)
cat azure-credentials.json

# Step 4: Clean up the file (don't commit it!)
rm azure-credentials.json

# Step 5: Verify it was created
az ad sp list --display-name "DistributedNotesGitHubActions" --output table
```

**Then:**
1. Copy the JSON output from step 3
2. Go to GitHub → Settings → Secrets → New secret
3. Name: `AZURE_CREDENTIALS`
4. Value: Paste the JSON
5. Add secret

**Done!** 🎉

---

## 🔐 Security Notes

- **Never commit** `azure-credentials.json` to Git
- **Never log** or print secrets in workflow
- **Rotate credentials** every 90 days for security
- **Use separate** service principals for dev/prod
- **Review** service principal permissions regularly

---

## 🎯 What Happens After Setup

Once configured, every push to `main` will:

1. ✅ Build 3 Docker images (frontend, backend, nginx)
2. ✅ Push images to ACR with commit SHA as tag
3. ✅ Update Kubernetes YAML files automatically
4. ✅ Commit changes back to Git
5. ✅ Trigger ArgoCD to sync (if configured)

**Zero manual intervention needed!** 🚀

---

## 📞 Need Help?

Check these if you're stuck:

1. **GitHub Actions logs** - See exactly where it failed
2. **Azure Portal** - Verify service principal exists
3. **ACR Access Keys** - Alternative auth method for testing
4. **This guide** - GITHUB_ACTIONS_SETUP.md has detailed troubleshooting

---

**Last Updated:** February 27, 2026  
**Tested With:** Azure CLI 2.57+, GitHub Actions  
**Status:** ✅ Production Ready
