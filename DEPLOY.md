# Deploying to Render

This guide explains how to deploy EventGrapher to Render.

## ⚠️ Important Notes

1. **File Storage**: Render's filesystem is **ephemeral** (files are deleted when the service restarts). You **must** use cloud storage (Google Cloud Storage, AWS S3, etc.) for uploaded images.

2. **Two Services**: You'll need to deploy both:
   - Backend (FastAPI) - Python service
   - Frontend (Next.js) - Node.js service

## Prerequisites

1. A [Render account](https://render.com)
2. Google Cloud Storage account (or alternative cloud storage) for file uploads
3. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Step 1: Prepare for Cloud Storage

Since local file storage won't work on Render, you need to configure Google Cloud Storage (or another cloud provider).

### Option A: Use Google Cloud Storage (Recommended - already in requirements)

1. Create a Google Cloud Storage bucket
2. Generate a service account key JSON file
3. Store the JSON content as an environment variable in Render

### Option B: Use AWS S3 or other storage

You'll need to update the upload route to use your chosen storage provider.

## Step 2: Deploy Backend

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your repository
4. Configure the service:
   - **Name**: `eventgrapher-backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: `backend`

5. Add Environment Variables:
   ```
   PYTHON_VERSION=3.11.0
   FRONTEND_URL=https://eventgrapher-frontend.onrender.com
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
   GOOGLE_GENERATIVE_AI_API_KEY=your-api-key
   ```

6. Click **"Create Web Service"**

## Step 3: Deploy Frontend

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect the same repository
3. Configure the service:
   - **Name**: `eventgrapher-frontend`
   - **Runtime**: `Node`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && npm start`
   - **Root Directory**: `frontend`

4. Add Environment Variables:
   ```
   NODE_VERSION=18.17.0
   NEXT_PUBLIC_API_URL=https://eventgrapher-backend.onrender.com
   NODE_ENV=production
   ```

5. Click **"Create Web Service"**

## Step 4: Update CORS in Backend

After deploying, update the `FRONTEND_URL` environment variable in your backend service to match your frontend URL.

## Step 5: Update Frontend API URL

Update `NEXT_PUBLIC_API_URL` in your frontend service to match your backend URL.

## Using render.yaml (Alternative)

If you prefer using the `render.yaml` file:

1. Push `render.yaml` to your repository root
2. In Render Dashboard, click **"New +"** → **"Blueprint"**
3. Connect your repository
4. Render will automatically detect and use `render.yaml`

## Troubleshooting

### Backend Issues

- **Build fails**: Check that `requirements.txt` is correct and all dependencies are listed
- **Port error**: Make sure start command uses `$PORT` environment variable
- **Import errors**: Verify the root directory is set to `backend`

### Frontend Issues

- **Build fails**: Check Node version compatibility
- **API connection errors**: Verify `NEXT_PUBLIC_API_URL` points to your backend URL
- **CORS errors**: Update `FRONTEND_URL` in backend environment variables

### File Upload Issues

- **Files not persisting**: This is expected! You must use cloud storage (GCS, S3, etc.)
- **Upload fails**: Check cloud storage credentials and permissions

## Next Steps

1. Set up Google Cloud Storage bucket for file uploads
2. Update the upload route to use cloud storage instead of local filesystem
3. Configure environment variables in Render
4. Test the deployment

## Free Tier Limits

- Render free tier services **spin down after 15 minutes of inactivity**
- First request after spin-down may take 30-60 seconds to wake up
- For production, consider upgrading to a paid plan

