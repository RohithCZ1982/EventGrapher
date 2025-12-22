# Fix: TypeScript dependencies not found on Render

## Problem
Next.js detects TypeScript (via tsconfig.json) but TypeScript dependencies aren't installed during build.

## Solution

The TypeScript dependencies are already in `package.json`:
- `typescript@5.9.3`
- `@types/react@19.2.7`
- `@types/node@25.0.3`

### Step 1: Ensure package-lock.json is committed

Make sure `package-lock.json` is committed to git:

```bash
git add frontend/package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Step 2: Verify package.json

The `package.json` should have TypeScript in `devDependencies` (which it does).

### Step 3: Update Render Build Command (if needed)

If you're still having issues, you can explicitly ensure devDependencies are installed:

**In Render Dashboard** → Frontend Service → Settings:
- **Build Command**: `npm install && npm run build`

Or use:
- **Build Command**: `npm ci && npm run build` (uses package-lock.json, more reliable)

### Step 4: Check NODE_ENV

Make sure `NODE_ENV=production` is set **only in environment variables**, not in the build command.

The build command should be:
- ✅ `npm install && npm run build` 
- ❌ NOT `NODE_ENV=production npm install && npm run build` (this skips devDependencies)

---

## Alternative: Move TypeScript to dependencies

If the issue persists, you can move TypeScript to `dependencies` instead of `devDependencies`:

```json
{
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "typescript": "5.9.3",
    "@types/react": "19.2.7",
    "@types/node": "25.0.3"
  }
}
```

Then run locally:
```bash
cd frontend
npm install
git add package.json package-lock.json
git commit -m "Move TypeScript to dependencies"
git push
```

---

## Verify

After pushing, check Render build logs. You should see:
- ✅ Installing dependencies
- ✅ typescript, @types/react, @types/node being installed
- ✅ Building Next.js app successfully

