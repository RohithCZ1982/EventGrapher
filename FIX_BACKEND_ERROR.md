# Fix: Could not open requirements.txt

## Problem
Render is looking for `requirements.txt` in the root directory, but it's in the `backend` directory.

## Solution

### In Render Dashboard:

1. Go to your **Backend Service** in Render Dashboard
2. Click **"Settings"** tab
3. Scroll down to **"Root Directory"** field
4. Set it to: `backend`
5. Click **"Save Changes"**
6. Service will automatically redeploy

### Important:

- **Root Directory** must be exactly: `backend` (not `/backend` or `backend/`)
- **Build Command** should be: `pip install -r requirements.txt` (not `cd backend && pip install...`)
- **Start Command** should be: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (not `cd backend && uvicorn...`)

Because Root Directory is set to `backend`, commands run from that directory automatically.

---

## Verify Both Services

Make sure both services have Root Directory set:

✅ **Backend Service**: Root Directory = `backend`
✅ **Frontend Service**: Root Directory = `frontend`

---

## If Using render.yaml (Blueprint)

The `render.yaml` file already has `rootDir: backend` set. If you're using Blueprint deployment:

1. Make sure your latest code is pushed to GitHub
2. In Render, go to your Blueprint
3. Click **"Manual Deploy"** → **"Clear build cache & deploy"**

