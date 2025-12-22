
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
#from fastapi.staticfiles import StaticFiles
import os
#from pathlib import Path
from .routes import upload, tasks, events



app = FastAPI(title="Event Media AI Backend")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
allowed_origins = [o.strip() for o in frontend_url.split(",")]

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

@app.get("/")
def root():
    return {"status": "running"}

@app.get("/health")
def health():
    return {"status": "ok"}