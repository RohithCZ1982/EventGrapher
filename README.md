# EventGrapher

An event media management system with AI-powered features, built with FastAPI backend and Next.js frontend.

## Project Structure

```
EventGrapher/
├── backend/          # FastAPI backend
│   ├── app/         # Application code
│   │   ├── routes/  # API routes
│   │   └── main.py  # FastAPI application
│   └── requirements.txt
└── frontend/        # Next.js frontend
    ├── pages/       # Next.js pages
    └── package.json
```

## Quick Start (Local Development)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Run the setup script:
   - **Windows**: `setup.bat`
   - **Linux/macOS**: `chmod +x setup.sh && ./setup.sh`

3. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend will run on http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Run the setup script:
   - **Windows**: `setup.bat`
   - **Linux/macOS**: `chmod +x setup.sh && ./setup.sh`

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will run on http://localhost:3000

## Features

- **Backend API**: FastAPI with Google Cloud Storage and Gemini AI integration
- **Frontend**: Next.js React application
- **File Upload**: Local file storage (for development) or cloud storage (for production)
- **Task Queue**: Cloud Tasks integration for background processing
- **Photo Gallery**: View and manage uploaded photos

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /upload/` - Upload a photo file
- `GET /upload/photos` - List all uploaded photos
- `GET /upload/photos/{filename}` - Get a specific photo
- `POST /upload/signed-url` - Generate signed URL for file upload (for cloud storage)
- `POST /tasks/enqueue` - Enqueue a background task

API documentation available at: http://localhost:8000/docs

## Deployment

### Deploy to Render

This application can be deployed to Render. See [RENDER_SETUP.md](./RENDER_SETUP.md) or [QUICK_START_RENDER.md](./QUICK_START_RENDER.md) for detailed deployment instructions.

**Important**: Render's filesystem is ephemeral, so you **must** use cloud storage (Google Cloud Storage, AWS S3, etc.) for file uploads in production.

### Deploy to Google Cloud Run

This application can also be deployed to Google Cloud Run. See [CLOUD_RUN_DEPLOY.md](./CLOUD_RUN_DEPLOY.md) for detailed deployment instructions, or [QUICK_START_CLOUD_RUN.md](./QUICK_START_CLOUD_RUN.md) for a quick reference.

**Note**: Cloud Run also has an ephemeral filesystem, so using Google Cloud Storage is recommended for production.

## Development

### Prerequisites

- **Backend**: Python 3.7+, pip
- **Frontend**: Node.js 14+, npm

### Environment Variables

See individual README files in `backend/README.md` and `frontend/README.md` for environment variable configuration.

## License

[Add your license here]
