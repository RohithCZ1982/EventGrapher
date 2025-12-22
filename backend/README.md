# Backend – FastAPI (Google Cloud + Gemini)

## Prerequisites

- Python 3.7 or higher
- pip (Python package manager)

## Quick Setup

### Windows
Run the setup script:
```bash
setup.bat
```

### Linux/macOS
Run the setup script:
```bash
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/macOS: `source venv/bin/activate`

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables (optional for basic development):

```env
# Google Cloud Configuration (optional)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json

# Google Generative AI (Gemini) (optional)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key

# PostgreSQL Database (optional)
DATABASE_URL=postgresql://user:password@localhost:5432/eventgrapher

# Server Configuration
API_HOST=0.0.0.0
API_PORT=8000

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

Note: The API will run with placeholder endpoints even without these environment variables configured.

## Running the Server

After setup, run:
```bash
uvicorn app.main:app --reload
```

The API will be available at:
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Health Check: http://localhost:8000/health
