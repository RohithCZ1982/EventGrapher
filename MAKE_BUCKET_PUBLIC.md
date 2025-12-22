# Making Google Cloud Storage Bucket Public for Direct Image Access

## Option 1: Make Entire Bucket Public (Easier but Less Secure)

```powershell
# Make all objects in the bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://eventgrapherstorage
```

**Warning:** This makes ALL files in the bucket publicly accessible. Anyone with the URL can access them.

## Option 2: Make Only Specific Folder Public (Recommended)

```powershell
# Make only the uploads folder public
gsutil iam ch allUsers:objectViewer gs://eventgrapherstorage/uploads
```

## Option 3: Use Signed URLs (Most Secure - Recommended)

This is already implemented in the code, but requires a service account key. The code will automatically generate signed URLs that expire after 1 hour.

### Setup Signed URLs:

1. **Create a service account key** (if you haven't already):
```powershell
# Create service account
gcloud iam service-accounts create eventgrapher-storage --display-name="EventGrapher Storage"

# Grant Storage Admin role
$PROJECT_ID = gcloud config get-value project
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:eventgrapher-storage@$PROJECT_ID.iam.gserviceaccount.com" --role="roles/storage.admin"

# Create and download key
gcloud iam service-accounts keys create service-account-key.json --iam-account=eventgrapher-storage@$PROJECT_ID.iam.gserviceaccount.com
```

2. **Store in Secret Manager**:
```powershell
# Create secret
gcloud secrets create eventgrapher-storage-key --data-file=service-account-key.json

# Grant Cloud Run access
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
gcloud secrets add-iam-policy-binding eventgrapher-storage-key --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"

# Update Cloud Run service
gcloud run services update eventgrapher-backend --region us-central1 --update-secrets GOOGLE_CLOUD_CREDENTIALS_JSON=eventgrapher-storage-key:latest
```

After this, the code will automatically generate signed URLs that work for 1 hour.

## Direct URLs After Making Public

Once the bucket is public, images will be accessible at:

```
https://storage.googleapis.com/eventgrapherstorage/uploads/{filename}
```

Example:
```
https://storage.googleapis.com/eventgrapherstorage/uploads/f04296f6-ed31-46d1-93ec-7191a69849bb.png
```

## Current Setup

Right now, images are:
- ✅ Stored in GCS: `gs://eventgrapherstorage/uploads/`
- ✅ Accessible through API: `https://eventgrapher-backend-xsgryb7toa-uc.a.run.app/upload/photos/{filename}`
- ❌ NOT directly accessible from GCS (bucket is private)
- ❌ Signed URLs not working (needs service account key)

## Recommendation

For now, use the API endpoint method (Method 1). If you want direct GCS URLs, either:
1. Make the bucket/folder public (quick but less secure)
2. Set up signed URLs (more secure, requires service account key)

