# Setup Guide - EventGrapher

This guide will help you set up and run EventGrapher locally on your system.

## System Requirements

- **Python 3.7+** - For the backend
- **Node.js 14+** - For the frontend
- **npm** - Comes with Node.js
- **pip** - Comes with Python (or use `python -m ensurepip`)

## Step-by-Step Setup

### 1. Backend Setup

#### Option A: Automated Setup (Recommended)

**Windows:**
```bash
cd backend
setup.bat
```

**Linux/macOS:**
```bash
cd backend
chmod +x setup.sh
./setup.sh
```

#### Option B: Manual Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Backend Configuration (Optional)

Create a `.env` file in the `backend` directory if you need Google Cloud or database features:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
DATABASE_URL=postgresql://user:password@localhost:5432/eventgrapher
FRONTEND_URL=http://localhost:3000
```

**Note:** The API will work with placeholder endpoints even without these variables.

### 3. Start Backend Server

```bash
cd backend

# Activate virtual environment (if not already active)
# Windows: venv\Scripts\activate
# Linux/macOS: source venv/bin/activate

uvicorn app.main:app --reload
```

Backend will run on: **http://localhost:8000**
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 4. Frontend Setup

#### Option A: Automated Setup (Recommended)

**Windows:**
```bash
cd frontend
setup.bat
```

**Linux/macOS:**
```bash
cd frontend
chmod +x setup.sh
./setup.sh
```

#### Option B: Manual Setup

```bash
cd frontend
npm install
```

### 5. Frontend Configuration (Optional)

Create a `.env.local` file in the `frontend` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Default is `http://localhost:8000` if not specified.

### 6. Start Frontend Server

Open a new terminal window:

```bash
cd frontend
npm run dev
```

Frontend will run on: **http://localhost:3000**

## Running Both Servers

You'll need two terminal windows:
1. **Terminal 1**: Backend server (`uvicorn app.main:app --reload`)
2. **Terminal 2**: Frontend server (`npm run dev`)

## Verification

1. Check backend: http://localhost:8000/health (should return `{"status": "ok"}`)
2. Check frontend: http://localhost:3000 (should show "Event Media Upload" page)
3. Check API docs: http://localhost:8000/docs (Swagger UI)

## Troubleshooting

### Python not found
- Install Python from https://www.python.org/
- Make sure to check "Add Python to PATH" during installation

### Node.js not found
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### Port already in use
- Backend (8000): Change port with `uvicorn app.main:app --reload --port 8001`
- Frontend (3000): Next.js will automatically try the next available port

### Module not found errors
- Backend: Make sure virtual environment is activated and run `pip install -r requirements.txt` again
- Frontend: Run `npm install` again

### CORS errors
- Make sure `FRONTEND_URL` in backend `.env` matches your frontend URL (default: http://localhost:3000)

## Next Steps

- Explore the API documentation at http://localhost:8000/docs
- Check the individual README files in `backend/README.md` and `frontend/README.md` for more details
- Start developing your features!

