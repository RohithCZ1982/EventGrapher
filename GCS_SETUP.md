# Google Cloud Storage Setup Guide

This guide will help you configure Google Cloud Storage (GCS) for EventGrapher to store uploaded images and event data.

## Prerequisites

1. Google Cloud Project with billing enabled
2. Google Cloud SDK (gcloud) installed and configured
3. Your bucket name (e.g., `eventgrapherstorage`)

## Step 1: Verify Your Bucket Exists

```bash
# List all buckets
gcloud storage buckets list

# Or get bucket details
gsutil ls -L gs://YOUR_BUCKET_NAME
```

## Step 2: Grant Cloud Run Service Account Access to GCS

The Cloud Run service needs permissions to read/write to your GCS bucket.

### Get Your Project Number

```bash
# Get your project number
gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)"
```

### Grant Storage Permissions

Replace `YOUR_PROJECT_NUMBER` with the output from above:

```bash
# Grant Storage Object Admin role to Cloud Run service account
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"
```

**Windows PowerShell:**
```powershell
$PROJECT_NUMBER = gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)"
gcloud projects add-iam-policy-binding $(gcloud config get-value project) --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/storage.objectAdmin"
```

## Step 3: Deploy with GCS Configuration

Deploy your backend with the bucket name:

```bash
# From project root directory
gcloud builds submit --config=cloudbuild-backend.yaml \
    --substitutions=_REGION=us-central1,_STORAGE_BUCKET=eventgrapherstorage
```

**Important:** Replace `eventgrapherstorage` with your actual bucket name.

## Step 4: Verify GCS is Working

After deployment, check the logs:

```bash
# View backend logs
gcloud run services logs read eventgrapher-backend --region us-central1 --limit=50
```

Look for messages like:
- `[STORAGE] Google Cloud Storage configured with default credentials. Bucket: eventgrapherstorage`
- `[STORAGE] Saved to GCS: uploads/filename.jpg`

## Step 5: Test Upload

1. Go to your frontend URL
2. Try uploading an image
3. Check the backend logs to confirm it's saving to GCS

## Troubleshooting

### Issue: "Permission denied" or "Access denied"

**Solution:** Make sure you've granted the Storage Object Admin role to the Cloud Run service account (Step 2).

### Issue: "Bucket not found"

**Solution:** 
1. Verify the bucket name is correct: `gcloud storage buckets list`
2. Make sure you're using the bucket name without `gs://` prefix in the deployment command
3. Verify the bucket is in the same project as your Cloud Run service

### Issue: Files upload but can't be accessed

**Solution:** 
- The app will serve files through the API if signed URLs aren't available
- To enable signed URLs, you need a service account key (see Optional Setup below)

### Issue: Storage still using local mode

**Check:**
1. Environment variables are set: `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_CLOUD_STORAGE_BUCKET`
2. Check logs for: `[STORAGE] Using local storage (GCS not configured - missing env vars)`
3. Verify the deployment command included `_STORAGE_BUCKET=your-bucket-name`

## Optional: Enable Signed URLs (More Secure)

If you want to use signed URLs for direct access to files, you need a service account key:

### Create Service Account Key

```bash
# Create service account (if not exists)
gcloud iam service-accounts create eventgrapher-storage \
    --display-name="EventGrapher Storage Service Account"

# Grant Storage Admin role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:eventgrapher-storage@$(gcloud config get-value project).iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=eventgrapher-storage@$(gcloud config get-value project).iam.gserviceaccount.com
```

### Store in Secret Manager

```bash
# Create secret
gcloud secrets create eventgrapher-storage-key \
    --data-file=service-account-key.json \
    --replication-policy="automatic"

# Grant Cloud Run access
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding eventgrapher-storage-key \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

# Update Cloud Run service to use secret
gcloud run services update eventgrapher-backend \
    --region us-central1 \
    --update-secrets GOOGLE_CLOUD_CREDENTIALS_JSON=eventgrapher-storage-key:latest
```

### Update Code to Use Secret

The code already supports reading credentials from `GOOGLE_CLOUD_CREDENTIALS_JSON` environment variable. After setting the secret above, the app will automatically use it.

## Verify Configuration

You can test the storage configuration by calling the test endpoint:

```bash
# Get your backend URL
BACKEND_URL=$(gcloud run services describe eventgrapher-backend --region us-central1 --format="value(status.url)")

# Test storage mode
curl $BACKEND_URL/upload/test
```

Expected response:
```json
{
  "storage_mode": "gcs",
  "upload_dir": "/path/to/uploads",
  ...
}
```

## Current Configuration

- **Bucket Name:** `eventgrapherstorage` (update this in deployment command)
- **Region:** `us-central1`
- **Storage Mode:** Automatically uses GCS if configured, falls back to local

## Next Steps

1. Deploy with GCS bucket configured
2. Test file uploads
3. Verify files appear in your GCS bucket: `gsutil ls gs://eventgrapherstorage/uploads/`
4. (Optional) Set up signed URLs for better security

