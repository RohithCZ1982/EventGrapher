
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
from .routes import upload, tasks, events

app = FastAPI(title="Event Media AI Backend")

# CORS configuration
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Support multiple origins (comma-separated) for deployment flexibility
allowed_origins = [origin.strip() for origin in frontend_url.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/upload")
app.include_router(tasks.router, prefix="/tasks")
app.include_router(events.router, prefix="/events", tags=["events"])

@app.get("/health")
def health():
    return {"status": "ok"}
