# Quick Deployment Guide

This guide will help you quickly build and deploy EventGrapher with the new slideshow feature.

## Prerequisites

1. **Google Cloud Account** - Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud SDK (gcloud)** - Install from [cloud.google.com/sdk](https://cloud.google.com/sdk)
3. **Docker** - Install from [docker.com](https://www.docker.com/get-started)
4. **Google Cloud Project** - Create one at [console.cloud.google.com](https://console.cloud.google.com)

## One-Time Setup (First Time Only)

```bash
# 1. Login to Google Cloud
gcloud auth login

# 2. Set your project ID
gcloud config set project YOUR_PROJECT_ID

# 3. Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com storage-component.googleapis.com

# 4. Grant Cloud Build permissions (replace YOUR_PROJECT_ID)
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

**Windows (PowerShell):**
```powershell
$PROJECT_NUMBER = gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:$PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
```

## Deploy (Easy Way)

### Option 1: Use the Deployment Script

**Linux/macOS:**
```bash
./deploy.sh
```

**Windows:**
```cmd
deploy.bat
```

The script will:
- ✅ Build and deploy the backend
- ✅ Build and deploy the frontend (with the new slideshow page)
- ✅ Configure CORS automatically
- ✅ Show you the URLs when done

### Option 2: Manual Deployment

**1. Deploy Backend:**
```bash
gcloud builds submit --config=cloudbuild-backend.yaml \
    --substitutions=_REGION=us-central1,_STORAGE_BUCKET=your-bucket-name
```

**Note the backend URL** from the output (e.g., `https://eventgrapher-backend-XXXXX-XX.a.run.app`)

**2. Deploy Frontend:**
```bash
gcloud builds submit --config=cloudbuild-frontend.yaml \
    --substitutions=_REGION=us-central1,_BACKEND_URL=https://eventgrapher-backend-XXXXX-XX.a.run.app
```

**3. Update Backend CORS:**
```bash
# Get your frontend URL first
FRONTEND_URL=$(gcloud run services describe eventgrapher-frontend \
    --region=us-central1 \
    --format="value(status.url)")

# Update backend CORS
gcloud run services update eventgrapher-backend \
    --region=us-central1 \
    --update-env-vars FRONTEND_URL=$FRONTEND_URL
```

## What's New

The deployment includes:
- ✅ **New Slideshow Page** at `/slideshow`
- ✅ Auto-refreshes photos every 3 minutes
- ✅ Auto-advances slides every 5 seconds
- ✅ Full-screen slideshow experience
- ✅ Keyboard navigation support

## Access Your App

After deployment, you'll get URLs like:
- **Frontend**: `https://eventgrapher-frontend-XXXXX-XX.a.run.app`
- **Slideshow**: `https://eventgrapher-frontend-XXXXX-XX.a.run.app/slideshow`
- **Backend API**: `https://eventgrapher-backend-XXXXX-XX.a.run.app`

## Troubleshooting

### Build Fails
- Check that Docker is running: `docker ps`
- Verify gcloud is authenticated: `gcloud auth list`
- Check project is set: `gcloud config get-value project`

### Frontend Can't Connect to Backend
- Verify `NEXT_PUBLIC_API_URL` is set correctly in Cloud Run
- Check backend CORS settings include your frontend URL
- View logs: `gcloud run services logs read eventgrapher-backend --region=us-central1`

### Images Not Loading
- If using GCS, ensure bucket permissions are set correctly
- Check storage bucket name is correct in environment variables
- View backend logs for upload errors

## View Logs

```bash
# Backend logs
gcloud run services logs read eventgrapher-backend --region=us-central1 --limit=50

# Frontend logs
gcloud run services logs read eventgrapher-frontend --region=us-central1 --limit=50
```

## Update After Code Changes

Just run the deployment script again:
```bash
./deploy.sh
```

Or manually:
```bash
gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=us-central1
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1,_BACKEND_URL=YOUR_BACKEND_URL
```

## Need Help?

- See [QUICK_START_CLOUD_RUN.md](./QUICK_START_CLOUD_RUN.md) for detailed setup
- See [CLOUD_RUN_DEPLOY.md](./CLOUD_RUN_DEPLOY.md) for comprehensive guide
- See [GCS_SETUP.md](./GCS_SETUP.md) for storage configuration

