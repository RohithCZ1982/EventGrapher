# Setting Up GitHub Integration with Google Cloud Build

This guide shows you how to configure Cloud Build to automatically build and deploy from GitHub.

## Benefits

- ✅ Automatic deployments when you push to GitHub
- ✅ No need to run `gcloud builds submit` manually
- ✅ Build history and logs in Cloud Console
- ✅ Works with pull requests and branches

## Setup Steps

### Step 1: Connect GitHub Repository to Cloud Build

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"Connect Repository"**
3. Select **"GitHub (Cloud Build GitHub App)"**
4. Authenticate with GitHub
5. Select your repository: `EventGrapher`
6. Click **"Connect"**

### Step 2: Create Backend Trigger

1. Click **"Create Trigger"**
2. Fill in the details:
   - **Name**: `deploy-backend`
   - **Event**: `Push to a branch`
   - **Branch**: `^main$` (or your main branch name)
   - **Configuration**: `Cloud Build configuration file (yaml or json)`
   - **Location**: `Repository`
   - **Cloud Build configuration file location**: `cloudbuild-backend.yaml`

3. **Substitution variables** (click "Show included and ignored files"):
   - `_REGION`: `us-central1`
   - `_STORAGE_BUCKET`: `eventgrapherstorage`

4. Click **"Create"**

### Step 3: Create Frontend Trigger

1. Click **"Create Trigger"** again
2. Fill in the details:
   - **Name**: `deploy-frontend`
   - **Event**: `Push to a branch`
   - **Branch**: `^main$`
   - **Configuration**: `Cloud Build configuration file (yaml or json)`
   - **Location**: `Repository`
   - **Cloud Build configuration file location**: `cloudbuild-frontend.yaml`

3. **Substitution variables**:
   - `_REGION`: `us-central1`
   - `_BACKEND_URL`: `https://eventgrapher-backend-457355084030.us-central1.run.app`
     *(Update this with your actual backend URL)*

4. Click **"Create"**

## How It Works

After setup:
1. **Push code to GitHub** → Triggers Cloud Build automatically
2. **Cloud Build** → Pulls code from GitHub, builds Docker image
3. **Cloud Run** → Deploys the new version

## Manual Deployment (Current Method)

If you prefer to keep manual deployments, continue using:

```powershell
# Backend
gcloud builds submit --config=cloudbuild-backend.yaml --substitutions=_REGION=us-central1,_STORAGE_BUCKET=eventgrapherstorage

# Frontend
gcloud builds submit --config=cloudbuild-frontend.yaml --substitutions=_REGION=us-central1,_BACKEND_URL=https://your-backend-url.a.run.app
```

## Updating Substitution Variables

If you need to change substitution variables for GitHub triggers:

1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click on the trigger (e.g., `deploy-backend`)
3. Click **"Edit"**
4. Scroll to **"Substitution variables"**
5. Update the values
6. Click **"Save"**

## Testing GitHub Integration

1. Make a small change to your code
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Go to [Cloud Build History](https://console.cloud.google.com/cloud-build/builds)
4. You should see a new build automatically started

## Important Notes

- **First-time setup**: You need to grant Cloud Build permission to access your GitHub repository
- **Branch protection**: You can set up triggers for specific branches (e.g., only `main` branch)
- **Build logs**: All builds are logged in Cloud Console, even from GitHub
- **Environment variables**: Still need to be set in Cloud Run service (not in the trigger)

## Troubleshooting

### Build not triggering
- Check that the trigger is enabled
- Verify the branch name matches (case-sensitive)
- Check Cloud Build logs for errors

### Build fails
- Check build logs in Cloud Console
- Verify substitution variables are set correctly
- Ensure your GitHub repository is accessible

### Need to update backend URL
- Edit the frontend trigger
- Update `_BACKEND_URL` substitution variable
- Or manually redeploy frontend with new URL

