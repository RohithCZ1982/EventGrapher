# Quick Start: Deploy to Google Cloud Run

This is a quick reference guide for deploying EventGrapher to Google Cloud Run.

## Prerequisites Checklist

- [ ] Google Cloud account created
- [ ] Google Cloud SDK (gcloud) installed
- [ ] Docker installed
- [ ] Project ID ready
- [ ] GCS bucket created (optional, for file storage)

## One-Time Setup

```bash
# 1. Login and set project
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Enable required APIs
gcloud services enable cloudbuild.googleapis.com run.googleapis.com storage-component.googleapis.com

# 3. Create GCS bucket (for file storage)
# Make sure project is set: gcloud config set project YOUR_PROJECT_ID
# IMPORTANT: Bucket name must be lowercase, use hyphens/underscores only
# Example: gs://eventgrapher-storage or gs://eventgrapher_storage
gsutil mb -c STANDARD -l us-central1 gs://YOUR_BUCKET_NAME

# 4. Verify your project ID first
gcloud config get-value project

# 5. Create service account and key (replace YOUR_PROJECT_ID with the project ID from step 4)
# Windows: Run each command on a single line (no backslash line continuation)
# PowerShell/Linux: You can use backslash for line continuation
gcloud iam service-accounts create eventgrapher-storage --display-name="EventGrapher Storage"
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"
gcloud iam service-accounts keys create service-account-key.json --iam-account=eventgrapher-storage@YOUR_PROJECT_ID.iam.gserviceaccount.com

# If you get "Unknown service account" error, check existing accounts:
# gcloud iam service-accounts list
```

## Deploy Backend

```bash
# Option 1: Using Cloud Build (recommended)
gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=us-central1

# Option 2: Manual deployment
cd backend
docker build -t gcr.io/YOUR_PROJECT_ID/eventgrapher-backend .
docker push gcr.io/YOUR_PROJECT_ID/eventgrapher-backend
gcloud run deploy eventgrapher-backend \
    --image gcr.io/YOUR_PROJECT_ID/eventgrapher-backend \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars GOOGLE_CLOUD_PROJECT_ID=YOUR_PROJECT_ID,GOOGLE_CLOUD_STORAGE_BUCKET=YOUR_BUCKET_NAME
```

**Note the backend URL** from the output (e.g., `https://eventgrapher-backend-XXXXX-XX.a.run.app`)

## Deploy Frontend

```bash
# Update cloudbuild-frontend.yaml with your backend URL first, then:

# Option 1: Using Cloud Build
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1

# Option 2: Manual deployment
cd frontend
docker build -t gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend .
docker push gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend
gcloud run deploy eventgrapher-frontend \
    --image gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --port 8080 \
    --set-env-vars NEXT_PUBLIC_API_URL=https://eventgrapher-backend-XXXXX-XX.a.run.app
```

**Note the frontend URL** from the output

## Update Backend CORS

After deploying frontend, update the backend's FRONTEND_URL:

```bash
gcloud run services update eventgrapher-backend \
    --region us-central1 \
    --update-env-vars FRONTEND_URL=https://eventgrapher-frontend-XXXXX-XX.a.run.app
```

## Set Up Storage Credentials (Optional but Recommended)

If using Google Cloud Storage:

```bash
# Store credentials in Secret Manager
gcloud secrets create eventgrapher-storage-key \
    --data-file=service-account-key.json

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding eventgrapher-storage-key \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Update backend to use secret
gcloud run services update eventgrapher-backend \
    --region us-central1 \
    --update-secrets GOOGLE_CLOUD_CREDENTIALS_JSON=eventgrapher-storage-key:latest
```

## Verify Deployment

```bash
# Check service status
gcloud run services list

# View logs
gcloud run services logs read eventgrapher-backend --region us-central1 --limit=50
gcloud run services logs read eventgrapher-frontend --region us-central1 --limit=50
```

## Update After Code Changes

```bash
# Rebuild and redeploy
gcloud builds submit --config=cloudbuild-backend.yaml
gcloud builds submit --config=cloudbuild-frontend.yaml
```

## Important Notes

- **Storage**: Cloud Run has ephemeral storage. Use GCS for persistent file storage.
- **CORS**: Make sure FRONTEND_URL matches your frontend URL exactly.
- **Secrets**: Store sensitive credentials in Secret Manager, not environment variables.
- **Port**: Cloud Run automatically sets PORT environment variable (defaults to 8080).

For detailed information, see [CLOUD_RUN_DEPLOY.md](./CLOUD_RUN_DEPLOY.md)

