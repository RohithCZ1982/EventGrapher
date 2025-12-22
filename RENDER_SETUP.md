# Complete Render Deployment Guide

This guide will walk you through deploying EventGrapher to Render step by step.

## 📋 Prerequisites

1. **GitHub/GitLab/Bitbucket account** with your code repository
2. **Render account** - Sign up at [render.com](https://render.com) (free tier available)
3. **Google Cloud account** (for cloud storage) - Optional but recommended

---

## 🚀 Part 1: Setup Google Cloud Storage (Recommended)

Since Render's filesystem is ephemeral, you need cloud storage for uploaded files.

### Step 1.1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Note your **Project ID**

### Step 1.2: Create Storage Bucket

1. Navigate to **Cloud Storage** → **Buckets**
2. Click **"Create Bucket"**
3. Configure:
   - **Name**: Choose a unique name (e.g., `eventgrapher-uploads`)
   - **Location**: Choose closest to your users
   - **Storage Class**: Standard
   - **Access Control**: Fine-grained (recommended)
   - **Public Access**: Not recommended for security
4. Click **"Create"**

### Step 1.3: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Fill in:
   - **Name**: `eventgrapher-storage`
   - **Description**: Service account for EventGrapher file storage
4. Click **"Create and Continue"**
5. Grant role: **Storage Object Admin** (or **Storage Admin** for full access)
6. Click **"Continue"** → **"Done"**

### Step 1.4: Create Service Account Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON** format
5. Click **"Create"** - This downloads a JSON file
6. **Save this file securely** - You'll need it for Render

---

## 🐍 Part 2: Deploy Backend to Render

### Step 2.1: Create Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your repository:
   - If first time: Connect your GitHub/GitLab/Bitbucket account
   - Select your `EventGrapher` repository
   - Choose the branch (usually `main` or `master`)

### Step 2.2: Configure Backend Service

Fill in the configuration:

- **Name**: `eventgrapher-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend` ⚠️ **Important!**
- **Runtime**: `Python 3`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 2.3: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add:

#### Required Variables:
```
PYTHON_VERSION=3.11.0
FRONTEND_URL=https://eventgrapher-frontend.onrender.com
```
*(Update FRONTEND_URL after deploying frontend)*

#### Google Cloud Storage Variables (if using GCS):
```
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name-here
```

#### Google Cloud Credentials (Service Account):

**Option A: Using Environment Variable (Recommended)**

1. Open the service account JSON file you downloaded
2. Copy the **entire JSON content**
3. In Render, add environment variable:
   - **Key**: `GOOGLE_CLOUD_CREDENTIALS_JSON`
   - **Value**: Paste the entire JSON content (one line)

Then add to your code or use as file (see Option B).

**Option B: Using File Path**

If you want to use the file path method, you'll need to:
1. Base64 encode the JSON file content
2. Or use Render's secret file feature
3. Set `GOOGLE_APPLICATION_CREDENTIALS` to the file path

**Recommended: Update storage.py to read from JSON env var**

#### Optional Variables:
```
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
DATABASE_URL=your-postgresql-url (if using database)
```

### Step 2.4: Create Service

Click **"Create Web Service"** and wait for deployment.

### Step 2.5: Note Your Backend URL

After deployment, note your backend URL:
- It will be: `https://eventgrapher-backend.onrender.com` (or your custom name)

---

## ⚛️ Part 3: Deploy Frontend to Render

### Step 3.1: Create Frontend Service

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect the same repository
3. Choose the same branch

### Step 3.2: Configure Frontend Service

Fill in the configuration:

- **Name**: `eventgrapher-frontend` (or your preferred name)
- **Region**: Same as backend (recommended)
- **Branch**: `main`
- **Root Directory**: `frontend` ⚠️ **Important!**
- **Runtime**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### Step 3.3: Add Environment Variables

Add these environment variables:

```
NODE_VERSION=18.17.0
NEXT_PUBLIC_API_URL=https://eventgrapher-backend.onrender.com
NODE_ENV=production
```

⚠️ **Important**: Update `NEXT_PUBLIC_API_URL` with your actual backend URL from Step 2.5

### Step 3.4: Create Service

Click **"Create Web Service"** and wait for deployment.

### Step 3.5: Note Your Frontend URL

After deployment, note your frontend URL:
- It will be: `https://eventgrapher-frontend.onrender.com` (or your custom name)

---

## 🔗 Part 4: Link Services Together

### Step 4.1: Update Backend CORS

1. Go to your **Backend** service in Render
2. Go to **"Environment"** tab
3. Update `FRONTEND_URL` with your actual frontend URL:
   ```
   FRONTEND_URL=https://eventgrapher-frontend.onrender.com
   ```
4. Click **"Save Changes"** - Service will automatically redeploy

### Step 4.2: Update Frontend API URL (if needed)

1. Go to your **Frontend** service in Render
2. Go to **"Environment"** tab
3. Verify `NEXT_PUBLIC_API_URL` matches your backend URL
4. Update if needed and save

---

## 🔐 Part 5: Handle Google Cloud Credentials

Since Render doesn't support file uploads directly, we need to handle GCS credentials via environment variable.

### Option 1: Update storage.py to read from JSON env var (Recommended)

Add this helper function to read credentials from environment variable:

```python
# In backend/app/storage.py, add this function:
import json

def _get_gcs_credentials():
    """Get GCS credentials from environment variable"""
    creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS_JSON")
    if creds_json:
        try:
            # Parse JSON string from environment variable
            creds_dict = json.loads(creds_json)
            # Return credentials object
            from google.oauth2 import service_account
            return service_account.Credentials.from_service_account_info(creds_dict)
        except Exception as e:
            print(f"[STORAGE] Error parsing credentials JSON: {e}")
            return None
    return None

# Then update the GCS client initialization:
if USE_GCS and GCS_AVAILABLE:
    try:
        credentials = _get_gcs_credentials()
        if credentials:
            _gcs_client = storage.Client(project=GCS_PROJECT_ID, credentials=credentials)
        else:
            _gcs_client = storage.Client(project=GCS_PROJECT_ID)  # Uses default credentials
        print(f"[STORAGE] Google Cloud Storage configured. Bucket: {GCS_BUCKET_NAME}")
    except Exception as e:
        print(f"[STORAGE] Warning: Failed to initialize GCS client: {e}")
        print(f"[STORAGE] Falling back to local storage")
        USE_GCS = False
        _gcs_client = None
```

Then in Render, set `GOOGLE_CLOUD_CREDENTIALS_JSON` to the entire JSON content as a string.

### Option 2: Use Application Default Credentials

If you configure Render with Application Default Credentials, the code will use them automatically.

---

## 🧪 Part 6: Test Your Deployment

### Test Backend

1. Visit: `https://your-backend-url.onrender.com/health`
   - Should return: `{"status":"ok"}`

2. Visit: `https://your-backend-url.onrender.com/docs`
   - Should show FastAPI documentation

3. Test storage mode: `https://your-backend-url.onrender.com/upload/test`
   - Should show storage configuration

### Test Frontend

1. Visit: `https://your-frontend-url.onrender.com`
   - Should load the home page

2. Try uploading a photo
3. Check the gallery
4. Test admin panel

---

## 🐛 Troubleshooting

### Backend Issues

**Problem: Build fails**
- Check build logs in Render dashboard
- Verify `requirements.txt` is in the `backend` directory
- Ensure Python version is correct

**Problem: Service crashes on start**
- Check logs for error messages
- Verify `Root Directory` is set to `backend`
- Check that all environment variables are set correctly

**Problem: Storage not working**
- Check that GCS credentials are correctly formatted in environment variable
- Verify bucket name and project ID are correct
- Check Render logs for storage errors

### Frontend Issues

**Problem: Build fails**
- Check build logs
- Verify `package.json` is in the `frontend` directory
- Check Node version compatibility

**Problem: API calls fail**
- Verify `NEXT_PUBLIC_API_URL` matches your backend URL
- Check browser console for CORS errors
- Verify backend `FRONTEND_URL` includes your frontend URL

**Problem: Images not loading**
- Check that storage is properly configured
- Verify GCS bucket permissions
- Check browser network tab for 404 errors

### CORS Issues

If you see CORS errors:
1. Verify `FRONTEND_URL` in backend matches your frontend URL exactly
2. Include protocol (`https://`) in the URL
3. No trailing slash

---

## 💡 Tips & Best Practices

1. **Use Render Blueprint (render.yaml)**
   - Push `render.yaml` to your repo
   - Use "New Blueprint" instead of manual setup
   - Easier to manage and version control

2. **Monitor Logs**
   - Always check Render logs when debugging
   - Use "View Logs" in the service dashboard

3. **Environment Variables**
   - Use Render's environment variable encryption
   - Never commit secrets to git

4. **Custom Domains**
   - Render free tier supports custom domains
   - Add your domain in service settings

5. **Auto-Deploy**
   - Render auto-deploys on git push
   - Disable if you want manual control

---

## 📝 Quick Reference: Environment Variables

### Backend
```
PYTHON_VERSION=3.11.0
FRONTEND_URL=https://your-frontend-url.onrender.com
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_CLOUD_CREDENTIALS_JSON={"type":"service_account",...} (entire JSON)
```

### Frontend
```
NODE_VERSION=18.17.0
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NODE_ENV=production
```

---

## 🆓 Free Tier Limitations

- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- Limited build minutes per month
- For production, consider upgrading to paid plan

---

## ✅ Checklist

- [ ] Google Cloud Storage bucket created
- [ ] Service account created with proper permissions
- [ ] Service account key downloaded
- [ ] Backend service created on Render
- [ ] Backend environment variables configured
- [ ] Backend deployed successfully
- [ ] Frontend service created on Render
- [ ] Frontend environment variables configured
- [ ] Frontend deployed successfully
- [ ] CORS configured correctly
- [ ] Storage working (test file upload)
- [ ] All features tested

---

Need help? Check Render's [documentation](https://render.com/docs) or your service logs!

