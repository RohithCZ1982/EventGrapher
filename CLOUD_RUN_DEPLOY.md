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
```

### 2. Create Google Cloud Storage Bucket (for file storage)

```bash
# Create a bucket (replace YOUR_BUCKET_NAME with your desired name)
gsutil mb -p YOUR_PROJECT_ID -c STANDARD -l us-central1 gs://YOUR_BUCKET_NAME

# Make the bucket public (optional, if you want direct access to images)
# Or use signed URLs (recommended for security)
```

### 3. Create Service Account for Cloud Storage Access

```bash
# Create service account
gcloud iam service-accounts create eventgrapher-storage \
    --display-name="EventGrapher Storage Service Account"

# Grant Storage Admin role
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    --member="serviceAccount:eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Deployment Methods

### Method 1: Using Cloud Build (Recommended)

This method automatically builds and deploys your services using Cloud Build.

#### Deploy Backend

```bash
# From the project root directory
gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=us-central1
```

#### Deploy Frontend

```bash
# Deploy backend first, then note the backend URL
# Update cloudbuild-frontend.yaml with the backend URL, then:

gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1
```

**Important**: After deploying the backend, update the `NEXT_PUBLIC_API_URL` in `cloudbuild-frontend.yaml` with your actual backend URL.

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
3. **Build Failures**: Check Cloud Build logs for detailed error messages
4. **Connection Errors**: Verify the `NEXT_PUBLIC_API_URL` points to the correct backend URL

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

