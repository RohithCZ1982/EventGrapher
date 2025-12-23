
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from fastapi.staticfiles import StaticFiles
import os
#from pathlib import Path
from .routes import upload, tasks, events



app = FastAPI(title="Event Media AI Backend")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [o.strip() for o in frontend_url.split(",")]

# Add Cloud Run frontend URL if it matches the backend pattern
# This handles cases where FRONTEND_URL might not be set but we can infer it
backend_url = os.getenv("BACKEND_URL", "")
if backend_url and "eventgrapher-backend" in backend_url:
    # Extract the project/region pattern and construct frontend URL
    # Example: https://eventgrapher-backend-xsgryb7toa-uc.a.run.app
    # Should allow: https://eventgrapher-frontend-xsgryb7toa-uc.a.run.app
    frontend_cloud_run_url = backend_url.replace("eventgrapher-backend", "eventgrapher-frontend")
    if frontend_cloud_run_url not in allowed_origins:
        allowed_origins.append(frontend_cloud_run_url)

# Also allow explicit Cloud Run frontend URL from environment
cloud_run_frontend = os.getenv("CLOUD_RUN_FRONTEND_URL", "")
if cloud_run_frontend and cloud_run_frontend not in allowed_origins:
    allowed_origins.append(cloud_run_frontend)

# Log CORS configuration for debugging
print(f"[CORS] Frontend URL: {frontend_url}")
print(f"[CORS] Allowed origins: {allowed_origins}")

# Use allow_origin_regex for Cloud Run patterns if needed
# This allows any Cloud Run frontend URL matching the pattern
origin_regex = r"https://eventgrapher-frontend-.*\.run\.app"

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/upload")
app.include_router(tasks.router, prefix="/tasks")
app.include_router(events.router, prefix="/events", tags=["events"])

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/cors-info")
def cors_info():
    """Debug endpoint to check CORS configuration"""
    return {
        "frontend_url": os.getenv("FRONTEND_URL", "http://localhost:3000"),
        "allowed_origins": allowed_origins
    }