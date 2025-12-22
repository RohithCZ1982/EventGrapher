# Quick Start: Deploy to Render (5 Minutes)

## 🚀 Fast Track Setup

### 1. Push Code to GitHub
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### 2. Deploy Backend (2 minutes)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect repository → Select your repo
4. Configure:
   - **Name**: `eventgrapher-backend`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add Environment Variables:
   ```
   PYTHON_VERSION=3.11.0
   FRONTEND_URL=https://eventgrapher-frontend.onrender.com
   ```
6. Click **"Create Web Service"**
7. **Copy the backend URL** (e.g., `https://eventgrapher-backend.onrender.com`)

### 3. Deploy Frontend (2 minutes)

1. Click **"New +"** → **"Web Service"**
2. Connect same repository
3. Configure:
   - **Name**: `eventgrapher-frontend`
   - **Root Directory**: `frontend`
   - **Runtime**: `Node`
   - **Root Directory**: `frontend` ⚠️ **IMPORTANT!**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Add Environment Variables:
   ```
   NODE_VERSION=18.17.0
   NEXT_PUBLIC_API_URL=<paste-backend-url-here>
   NODE_ENV=production
   ```
5. Click **"Create Web Service"**
6. **Copy the frontend URL**

### 4. Link Services (1 minute)

1. Go back to **Backend** service
2. **Environment** tab → Update `FRONTEND_URL` with your frontend URL
3. Save → Auto-redeploys

### 5. Test

- Visit frontend URL → Should work!
- ⚠️ **Note**: Without GCS setup, files won't persist (expected on free tier)

---

## 🔐 Optional: Add Google Cloud Storage

### Quick GCS Setup:

1. **Create GCS Bucket** (5 min)
   - [Google Cloud Console](https://console.cloud.google.com/storage)
   - Create bucket
   - Note bucket name

2. **Create Service Account** (3 min)
   - IAM → Service Accounts → Create
   - Grant "Storage Object Admin" role
   - Create JSON key → Download

3. **Add to Render Backend** (2 min)
   - Backend → Environment → Add:
     ```
     GOOGLE_CLOUD_PROJECT_ID=your-project-id
     GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
     GOOGLE_CLOUD_CREDENTIALS_JSON=<paste-entire-json-content>
     ```
   - Save → Redeploys

---

## 📚 Full Guide

For detailed instructions, see [RENDER_SETUP.md](./RENDER_SETUP.md)

---

## ⚡ Pro Tips

- ✅ Use `render.yaml` for easier deployment (already in repo)
- ✅ Monitor logs in Render dashboard
- ✅ Free tier spins down after 15 min inactivity
- ✅ Custom domains work on free tier

