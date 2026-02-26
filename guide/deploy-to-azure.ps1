# =====================================================
# Azure Deployment Script for Distributed Notes
# Phase 2 & 3: Build, Push, and Deploy
# =====================================================

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Phase 2: Build & Push Docker Images" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check Docker is running
Write-Host "`n[CHECK] Verifying Docker Desktop is running..." -ForegroundColor Yellow
try {
    docker ps | Out-Null
    Write-Host "[OK] Docker is running!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker Desktop is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    exit 1
}

# Log in to ACR
Write-Host "`n[1/9] Logging in to Azure Container Registry..." -ForegroundColor Yellow
az acr login --name distributedregistry
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] ACR login failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Logged in successfully" -ForegroundColor Green

# Build frontend
Write-Host "`n[2/9] Building frontend image (3-5 minutes)..." -ForegroundColor Yellow
docker build -t distributedregistry.azurecr.io/frontend:v1 -f ./frontend/Dockerfile ./frontend
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Frontend build failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Frontend built" -ForegroundColor Green

# Push frontend
Write-Host "`n[3/9] Pushing frontend image to ACR..." -ForegroundColor Yellow
docker push distributedregistry.azurecr.io/frontend:v1
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Frontend push failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Frontend pushed" -ForegroundColor Green

# Build backend
Write-Host "`n[4/9] Building backend image (3-5 minutes)..." -ForegroundColor Yellow
docker build -t distributedregistry.azurecr.io/backend:v1 -f ./backend/Dockerfile ./backend
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Backend build failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Backend built" -ForegroundColor Green

# Push backend
Write-Host "`n[5/9] Pushing backend image to ACR..." -ForegroundColor Yellow
docker push distributedregistry.azurecr.io/backend:v1
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Backend push failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Backend pushed" -ForegroundColor Green

# Verify images
Write-Host "`n[6/9] Verifying images in ACR..." -ForegroundColor Yellow
az acr repository list --name distributedregistry --output table

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Phase 3: Deploy to Kubernetes" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Apply Kubernetes configurations
Write-Host "`n[7/9] Applying Kubernetes configurations..." -ForegroundColor Yellow
kubectl apply -f k8s/
if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] kubectl apply failed!" -ForegroundColor Red; exit 1 }
Write-Host "[OK] Configurations applied" -ForegroundColor Green

# Wait for pods
Write-Host "`n[8/9] Waiting for pods to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Get status
Write-Host "`n[9/9] Checking deployment status..." -ForegroundColor Yellow
Write-Host "`nPods:" -ForegroundColor Cyan
kubectl get pods
Write-Host "`nServices:" -ForegroundColor Cyan
kubectl get services
Write-Host "`nDeployments:" -ForegroundColor Cyan
kubectl get deployments

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "Deployment Script Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "`n[NEXT] Phase 4: Initialize Database`n" -ForegroundColor Yellow
Write-Host "Step 1: Get postgres pod name" -ForegroundColor Cyan
Write-Host "  kubectl get pods" -ForegroundColor White
Write-Host "`nStep 2: Copy init script (replace <postgres-pod-name>)" -ForegroundColor Cyan
Write-Host "  kubectl cp ./database/init.sql <postgres-pod-name>:/tmp/init.sql" -ForegroundColor White
Write-Host "`nStep 3: Run init script" -ForegroundColor Cyan
Write-Host "  kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -f /tmp/init.sql" -ForegroundColor White
Write-Host "`nStep 4: Verify" -ForegroundColor Cyan
Write-Host "  kubectl exec -it <postgres-pod-name> -- psql -U user -d notes_db -c '\dt'" -ForegroundColor White
Write-Host "`nFull guide: AZURE_DEPLOYMENT_COMPLETE_GUIDE.md" -ForegroundColor Gray
