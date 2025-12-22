# Fix: npm ERR! code ENOENT - package.json not found

## Problem
Render is looking for `package.json` in the root directory (`/opt/render/project/src/`), but your frontend code is in the `frontend` directory.

**Also see**: [FIX_BACKEND_ERROR.md](./FIX_BACKEND_ERROR.md) for backend requirements.txt errors

## Solution

### Option 1: Fix in Render Dashboard (Quick Fix)

1. Go to your **Frontend Service** in Render Dashboard
2. Go to **"Settings"** tab
3. Scroll down to **"Root Directory"** field
4. Set it to: `frontend`
5. Click **"Save Changes"**
6. Service will automatically redeploy

### Option 2: Update render.yaml (If using Blueprint)

The `render.yaml` file has been updated with `rootDir: frontend`. 

If you're using the Blueprint method:
1. Make sure your latest code with updated `render.yaml` is pushed to GitHub
2. Go to your Blueprint in Render
3. Click **"Manual Deploy"** → **"Clear build cache & deploy"**

### Option 3: Manual Service Configuration

If creating the service manually:

When configuring the frontend service, make sure to set:
- **Root Directory**: `frontend` ⚠️ **This is critical!**

The build command should then be:
- **Build Command**: `npm install && npm run build` (not `cd frontend && npm install...`)
- **Start Command**: `npm start` (not `cd frontend && npm start`)

Because the root directory is set to `frontend`, npm commands run from that directory automatically.

---

## Verify the Fix

After updating, check the build logs. You should see:
- ✅ npm finding package.json
- ✅ Installing dependencies
- ✅ Building Next.js app

If you still see errors, check:
1. Root Directory is exactly `frontend` (no trailing slash)
2. The `frontend` directory exists in your repository
3. `package.json` exists in the `frontend` directory

