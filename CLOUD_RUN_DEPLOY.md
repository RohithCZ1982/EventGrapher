# Deploying EventGrapher to Google Cloud Run

This guide will help you deploy EventGrapher to Google Cloud Run, a serverless container platform.

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **Google Cloud SDK (gcloud)**: Install from [cloud.google.com/sdk](https://cloud.google.com/sdk)
3. **Docker**: Install from [docker.com](https://www.docker.com/get-started)
4. **Google Cloud Project**: Create a new project or use an existing one

## Initial Setup

### 1. Install and Configure Google Cloud SDK

```bash
# Install gcloud CLI (if not already installed)
# Visit: https://cloud.google.com/sdk/docs/install

# Login to Google Cloud
gcloud auth login

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable storage-component.googleapis.com

# Grant Cloud Build service account permission to deploy to Cloud Run
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant Cloud Run Admin role to Cloud Build service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

# Grant Service Account User role (needed to deploy services)
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

**Windows Command Prompt (cmd.exe) - Run these separately:**
```cmd
REM Get project number
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"

REM Replace PROJECT_NUMBER with the output above, then run:
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
```

### 2. Create Google Cloud Storage Bucket (for file storage)

**Bucket Naming Requirements:**
- Must contain only **lowercase letters**, numbers, hyphens (-), and underscores (_)
- Must start and end with a letter or number
- Must be 3-63 characters long
- Must be globally unique across all Google Cloud Storage buckets
- **Cannot contain uppercase letters or spaces**

Examples of valid bucket names:
- `eventgrapher-storage`
- `eventgrapher_storage`
- `eventgrapher-storage-prod`
- `my-eventgrapher-bucket-123`

```bash
# Create a bucket (replace YOUR_BUCKET_NAME with your desired name)
# Note: The project is automatically used from gcloud config
# IMPORTANT: Use only lowercase letters, numbers, hyphens, and underscores
gsutil mb -c STANDARD -l us-central1 gs://YOUR_BUCKET_NAME

# Alternative: If you need to specify project explicitly
# gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://YOUR_BUCKET_NAME

# Make the bucket public (optional, if you want direct access to images)
# Or use signed URLs (recommended for security)
```

**Important**: Make sure you've set your project with `gcloud config set project YOUR_PROJECT_ID` before running this command, or use the alternative command with the `-p` flag.

### 3. Create Service Account for Cloud Storage Access

**Windows Command Prompt (cmd.exe):**
```cmd
REM First, verify your project ID
gcloud config get-value project

REM Create service account (use ^ for line continuation in cmd)
REM Replace YOUR_PROJECT_ID with your actual project ID from the command above
gcloud iam service-accounts create eventgrapher-storage --display-name="EventGrapher Storage Service Account"

REM Grant Storage Admin role (replace YOUR_PROJECT_ID with your actual project ID)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"

REM Create and download key (replace YOUR_PROJECT_ID with your actual project ID)
gcloud iam service-accounts keys create service-account-key.json --iam-account=eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Troubleshooting:** If you get "Unknown service account" error:
1. Check your project ID: `gcloud config get-value project`
2. List existing service accounts: `gcloud iam service-accounts list`
3. Make sure the service account email uses your actual project ID, not "eventgrapher"

**Windows PowerShell or Linux/macOS:**
```bash
# First, verify your project ID
gcloud config get-value project

# Create service account (replace YOUR_PROJECT_ID with your actual project ID)
gcloud iam service-accounts create eventgrapher-storage --display-name="EventGrapher Storage Service Account"

# Grant Storage Admin role (replace YOUR_PROJECT_ID with your actual project ID)
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"

# Create and download key (replace YOUR_PROJECT_ID with your actual project ID)
gcloud iam service-accounts keys create service-account-key.json --iam-account=eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

**Note:** 
- Replace `YOUR_PROJECT_ID` with your actual Google Cloud project ID (use `gcloud config get-value project` to find it)
- The service account email format is: `service-account-name@PROJECT_ID.iam.gserviceaccount.com`
- If you get "Unknown service account" error, verify the service account exists: `gcloud iam service-accounts list`

## Deployment Methods

### Method 1: Using Cloud Build (Recommended)

This method automatically builds and deploys your services using Cloud Build.

#### Deploy Backend

```bash
# From the project root directory (where cloudbuild-backend.yaml is located)
# Make sure you're in the EventGrapher directory (not backend or frontend subdirectory)

gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=us-central1,_STORAGE_BUCKET=YOUR_BUCKET_NAME
```

**Note:** Replace `YOUR_BUCKET_NAME` with your actual GCS bucket name (without the `gs://` prefix).

**If build fails:**
- Check the build logs: `gcloud builds log <BUILD_ID>` (use the ID from the error message)
- Verify you're in the project root directory (should contain both `backend/` and `frontend/` folders)
- Check that `backend/Dockerfile` and `backend/requirements.txt` exist

#### Deploy Frontend

**After deploying the backend, you'll get a URL in the output. The URL format looks like:**
```
https://eventgrapher-backend-XXXXX-XX.a.run.app
```
Where `XXXXX-XX` is a unique identifier assigned by Cloud Run (e.g., `abc123-uc`, `xyz789-ew`).

**To get your backend URL:**
1. It will be displayed in the output after deployment
2. Or run: `gcloud run services describe eventgrapher-backend --region us-central1 --format="value(status.url)"`
3. Or check in Cloud Console: Cloud Run → eventgrapher-backend → Details tab

**To get your frontend URL (after deploying frontend):**
1. It will be displayed in the output after deployment
2. Or run: `gcloud run services describe eventgrapher-frontend --region us-central1 --format="value(status.url)"`
3. Or check in Cloud Console: Cloud Run → eventgrapher-frontend → Details tab
4. Or list all services: `gcloud run services list --region us-central1`

**Then deploy the frontend with the backend URL:**
```bash
# Replace the URL below with your actual backend URL
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1,_BACKEND_URL=https://eventgrapher-backend-XXXXX-XX.a.run.app
```

**Example:** If your backend URL is `https://eventgrapher-backend-abc123-uc.a.run.app`, the command would be:
```bash
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1,_BACKEND_URL=https://eventgrapher-backend-abc123-uc.a.run.app
```

### Method 2: Manual Docker Build and Deploy

#### Build and Deploy Backend

```bash
# Navigate to backend directory
cd backend

# Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/eventgrapher-backend .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/eventgrapher-backend

# Deploy to Cloud Run
gcloud run deploy eventgrapher-backend \
    --image gcr.io/YOUR_PROJECT_ID/eventgrapher-backend \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars FRONTEND_URL=https://eventgrapher-frontend-XXXXX-XX.a.run.app \
    --set-env-vars GOOGLE_CLOUD_PROJECT_ID=YOUR_PROJECT_ID \
    --set-env-vars GOOGLE_CLOUD_STORAGE_BUCKET=YOUR_BUCKET_NAME \
    --set-secrets GOOGLE_CLOUD_CREDENTIALS_JSON=eventgrapher-storage-key:latest
```

**Note**: Replace `eventgrapher-frontend-XXXXX-XX.a.run.app` with your actual frontend URL after deploying it.

#### Build and Deploy Frontend

```bash
# Navigate to frontend directory
cd frontend

# Build the Docker image
docker build -t gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend .

# Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend

# Deploy to Cloud Run
gcloud run deploy eventgrapher-frontend \
    --image gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars NEXT_PUBLIC_API_URL=https://eventgrapher-backend-XXXXX-XX.a.run.app
```

**Note**: Replace the backend URL with your actual backend Cloud Run URL.

## Environment Variables

### Backend Environment Variables

Set these in Cloud Run (via console or CLI):

- `FRONTEND_URL`: URL of your frontend service (e.g., `https://eventgrapher-frontend-XXXXX-XX.a.run.app`)
- `GOOGLE_CLOUD_PROJECT_ID`: Your GCP project ID
- `GOOGLE_CLOUD_STORAGE_BUCKET`: Your GCS bucket name
- `GOOGLE_CLOUD_CREDENTIALS_JSON`: Service account credentials JSON (use Secret Manager for security)

### Frontend Environment Variables

- `NEXT_PUBLIC_API_URL`: URL of your backend service (e.g., `https://eventgrapher-backend-XXXXX-XX.a.run.app`)

## Using Secret Manager for Credentials (Recommended)

For better security, store sensitive credentials in Secret Manager:

```bash
# Create secret from service account key file
gcloud secrets create eventgrapher-storage-key \
    --data-file=service-account-key.json \
    --replication-policy="automatic"

# Grant Cloud Run access to the secret
gcloud secrets add-iam-policy-binding eventgrapher-storage-key \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Update Cloud Run service to use the secret
gcloud run services update eventgrapher-backend \
    --region us-central1 \
    --update-secrets GOOGLE_CLOUD_CREDENTIALS_JSON=eventgrapher-storage-key:latest
```

Then in your code, the secret will be available as an environment variable.

## Deployment Order

1. **Deploy Backend First**
   - Backend needs to be running to get its URL
   - Note the backend URL from the deployment output

2. **Update Frontend Configuration**
   - Update `NEXT_PUBLIC_API_URL` in frontend deployment with backend URL
   - Or update `cloudbuild-frontend.yaml` with the backend URL

3. **Deploy Frontend**
   - Frontend will connect to the backend using the URL

4. **Update Backend CORS**
   - Update `FRONTEND_URL` in backend with the frontend URL
   - This ensures CORS works correctly

## Updating Services

To update a service after making changes:

```bash
# Rebuild and redeploy using Cloud Build
gcloud builds submit --config=cloudbuild-backend.yaml

# Or manually rebuild and push
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/eventgrapher-backend .
docker push gcr.io/YOUR_PROJECT_ID/eventgrapher-backend
gcloud run deploy eventgrapher-backend --image gcr.io/YOUR_PROJECT_ID/eventgrapher-backend --region us-central1
```

## Important Notes

### File Storage on Cloud Run

- **Cloud Run has an ephemeral filesystem**: Files saved to local storage will be lost when the container stops
- **Use Google Cloud Storage**: Configure GCS in your environment variables
- The app automatically uses GCS if configured, otherwise falls back to local (ephemeral) storage

### CORS Configuration

- Make sure `FRONTEND_URL` in the backend matches your frontend URL exactly
- You can specify multiple origins by comma-separating them: `https://frontend1.com,https://frontend2.com`

### Port Configuration

- Cloud Run sets the `PORT` environment variable automatically
- Both Dockerfiles use `${PORT:-8080}` to use Cloud Run's PORT or default to 8080

### Service URLs

After deployment, Cloud Run will provide URLs like:
- Backend: `https://eventgrapher-backend-XXXXX-XX.a.run.app`
- Frontend: `https://eventgrapher-frontend-XXXXX-XX.a.run.app`

## Troubleshooting

### View Logs

```bash
# View backend logs
gcloud run services logs read eventgrapher-backend --region us-central1

# View frontend logs
gcloud run services logs read eventgrapher-frontend --region us-central1

# Follow logs in real-time
gcloud run services logs tail eventgrapher-backend --region us-central1
```

### Check Service Status

```bash
# List all services
gcloud run services list

# Get service details
gcloud run services describe eventgrapher-backend --region us-central1
```

### Common Issues

1. **CORS Errors**: Make sure `FRONTEND_URL` matches your frontend URL exactly
2. **Storage Not Working**: Verify GCS bucket name and credentials are correct
3. **Build Failures**: 
   - View detailed build logs: `gcloud builds log <BUILD_ID>` (get BUILD_ID from the error message)
   - Or view in Cloud Console: Cloud Build → History → Click on failed build
   - Common causes:
     - Dockerfile syntax errors
     - Missing dependencies in requirements.txt
     - Missing files that Dockerfile tries to copy
     - Build context issues (make sure you're in the correct directory)
   - **For backend build failures**, verify:
     - `backend/requirements.txt` exists and is valid
     - `backend/app/main.py` exists
     - All Python files are present
   - **For frontend build failures**, verify:
     - `frontend/package.json` exists and is valid
     - `frontend/pages/` directory exists
     - All dependencies are listed in package.json
4. **Connection Errors**: Verify the `NEXT_PUBLIC_API_URL` points to the correct backend URL

#### Debugging Build Failures

```bash
# List recent builds to find the build ID
gcloud builds list --limit=5

# View logs for a specific build (replace BUILD_ID with actual ID from error or list)
gcloud builds log BUILD_ID

# Or use the build ID from the error message
# Example: gcloud builds log 5d992fb3-4df0-4f2e-aa89-64d2a2238690

# View only the failed step (step 2 is usually the deployment step)
gcloud builds log BUILD_ID | grep -A 50 "Step #2"
```

**Common deployment step failures:**
- **Missing environment variables**: Check that `_BACKEND_URL` is set correctly
- **Permission issues**: Ensure Cloud Build has Cloud Run Admin role
- **Service already exists**: If service exists, it will update; if there's a conflict, delete and redeploy
- **Invalid region**: Verify the region is correct (e.g., `us-central1`)

## Cost Considerations

- **Cloud Run**: Pay per request (free tier: 2 million requests/month)
- **Cloud Storage**: Pay for storage and operations (free tier: 5GB storage)
- **Cloud Build**: Pay per build minute (free tier: 120 build-minutes/day)

For development/testing, you'll likely stay within free tier limits.

## Next Steps

1. Set up a custom domain (optional)
2. Configure CDN for faster static asset delivery
3. Set up monitoring and alerts
4. Configure auto-scaling based on traffic

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)

