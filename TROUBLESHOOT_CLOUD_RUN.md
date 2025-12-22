# Troubleshooting Cloud Run Deployment Failures

## Quick Diagnostic Commands

### View Build Logs
```bash
# Replace BUILD_ID with the ID from your error message
gcloud builds log BUILD_ID

# View only the failed step (step 2 is deployment)
gcloud builds log BUILD_ID | grep -A 50 "Step #2"
```

### Check Cloud Build Permissions
```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

# Grant Cloud Run Admin role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/run.admin"

# Grant Service Account User role
gcloud projects add-iam-policy-binding $(gcloud config get-value project) \
    --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
    --role="roles/iam.serviceAccountUser"
```

### Windows Command Prompt
```cmd
REM Get project number
gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)"

REM Replace PROJECT_NUMBER with output above, then:
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/run.admin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
```

## Common Error Messages and Solutions

### "Permission denied" or "Access Denied"
**Solution**: Grant Cloud Build the necessary permissions (see commands above)

### "Invalid value for field 'service'"
**Solution**: The service name might have invalid characters or already exists. Try:
```bash
# Delete existing service
gcloud run services delete eventgrapher-frontend --region us-central1

# Or use a different service name
# Update cloudbuild-frontend.yaml: change 'eventgrapher-frontend' to a new name
```

### "Empty or invalid URL"
**Solution**: When deploying frontend, make sure `_BACKEND_URL` is provided:
```bash
gcloud builds submit --config=cloudbuild-frontend.yaml \
  --substitutions=_REGION=us-central1,_BACKEND_URL=https://eventgrapher-backend-XXXXX-XX.a.run.app
```

### "Image not found"
**Solution**: The Docker build might have failed in step 0 or 1. Check:
```bash
gcloud builds log BUILD_ID | grep -A 30 "Step #0"
gcloud builds log BUILD_ID | grep -A 30 "Step #1"
```

## Step-by-Step Debugging

1. **View the full build log:**
   ```bash
   gcloud builds log BUILD_ID > build-log.txt
   # Then read build-log.txt to see the full error
   ```

2. **Check if the Docker image was pushed successfully:**
   ```bash
   # List images in Container Registry
   gcloud container images list
   ```

3. **Verify the service exists:**
   ```bash
   gcloud run services list --region us-central1
   ```

4. **Test deployment manually:**
   ```bash
   # Deploy manually to see if it works
   gcloud run deploy eventgrapher-frontend \
     --image gcr.io/YOUR_PROJECT_ID/eventgrapher-frontend \
     --region us-central1 \
     --platform managed \
     --allow-unauthenticated \
     --port 8080
   ```

## Still Having Issues?

1. Check the [Cloud Build logs in Console](https://console.cloud.google.com/cloud-build/builds)
2. Check [Cloud Run logs](https://console.cloud.google.com/run)
3. Verify all environment variables are set correctly
4. Make sure you're in the correct project: `gcloud config get-value project`

