
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import os
import shutil
from pathlib import Path
from typing import List
import uuid
from datetime import datetime

router = APIRouter()

# Create uploads directory if it doesn't exist (relative to backend directory)
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}

@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    """Upload a photo file"""
    print(f"[UPLOAD] Received upload request for file: {file.filename}")
    print(f"[UPLOAD] Upload directory: {UPLOAD_DIR}")
    print(f"[UPLOAD] Upload directory exists: {UPLOAD_DIR.exists()}")
    
    # Check if filename exists
    if not file.filename:
        print("[UPLOAD] ERROR: No filename provided")
        raise HTTPException(status_code=400, detail="Filename is required")
    
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    print(f"[UPLOAD] File extension: {file_ext}")
    if not file_ext or file_ext not in ALLOWED_EXTENSIONS:
        print(f"[UPLOAD] ERROR: Invalid file extension: {file_ext}")
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )
    
    # Generate unique filename
    unique_id = str(uuid.uuid4())
    filename = f"{unique_id}{file_ext}"
    file_path = UPLOAD_DIR / filename
    print(f"[UPLOAD] Saving to: {file_path.absolute()}")
    
    # Save file
    try:
        # Read file content in chunks and write to disk
        print("[UPLOAD] Starting file write...")
        total_bytes = 0
        with open(file_path, "wb") as buffer:
            while True:
                chunk = await file.read(1024 * 1024)  # Read 1MB chunks
                if not chunk:
                    break
                buffer.write(chunk)
                total_bytes += len(chunk)
        
        print(f"[UPLOAD] Wrote {total_bytes} bytes")
        
        # Verify file was written
        if file_path.exists():
            file_size = file_path.stat().st_size
            print(f"[UPLOAD] SUCCESS: File saved successfully. Size: {file_size} bytes")
            if file_size == 0:
                print("[UPLOAD] WARNING: File size is 0 bytes!")
                raise HTTPException(status_code=500, detail="File was empty")
        else:
            print(f"[UPLOAD] ERROR: File was not created!")
            raise HTTPException(status_code=500, detail="File was not saved")
        
        return {
            "id": unique_id,
            "filename": filename,
            "original_filename": file.filename,
            "url": f"/upload/photos/{filename}",
            "uploaded_at": datetime.now().isoformat()
        }
    except Exception as e:
        # Log the full error for debugging
        import traceback
        error_trace = traceback.format_exc()
        print(f"[UPLOAD] ERROR: {str(e)}")
        print(f"[UPLOAD] Traceback: {error_trace}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/photos/{filename}")
async def get_photo(filename: str):
    """Serve a photo file"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Determine media type based on extension
    ext = Path(filename).suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp"
    }
    media_type = media_type_map.get(ext, "image/jpeg")
    
    return FileResponse(file_path, media_type=media_type)

@router.get("/photos")
async def list_photos():
    """List all uploaded photos"""
    photos = []
    
    if not UPLOAD_DIR.exists():
        return {"photos": []}
    
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            stat = file_path.stat()
            photos.append({
                "id": file_path.stem,
                "filename": file_path.name,
                "url": f"/upload/photos/{file_path.name}",
                "size": stat.st_size,
                "uploaded_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
    
    # Sort by upload time (newest first)
    photos.sort(key=lambda x: x["uploaded_at"], reverse=True)
    
    return {"photos": photos}

@router.post("/signed-url")
def generate_signed_url():
    return {"message": "generate GCS signed URL here"}

@router.get("/test")
def test_upload_dir():
    """Test endpoint to verify upload directory setup"""
    return {
        "upload_dir": str(UPLOAD_DIR),
        "exists": UPLOAD_DIR.exists(),
        "is_dir": UPLOAD_DIR.is_dir() if UPLOAD_DIR.exists() else False,
        "writable": os.access(UPLOAD_DIR, os.W_OK) if UPLOAD_DIR.exists() else False,
        "absolute_path": str(UPLOAD_DIR.absolute())
    }
