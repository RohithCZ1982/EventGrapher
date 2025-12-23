
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Query
from fastapi.responses import RedirectResponse, Response
from pathlib import Path
from typing import Optional
import uuid
from datetime import datetime
from app.storage import save_file, get_file_url, file_exists, list_files, read_file_content, get_storage_mode, delete_file
from .photos_metadata import add_photo_metadata, filter_photos_by_user, delete_photo_metadata, get_photo_user_id

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".mp4", ".mov", ".avi", ".webm", ".mkv", ".flv", ".wmv", ".m4v"}

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    user_id: Optional[str] = Form(None)
):
    """Upload a photo or video file to Google Cloud Storage"""
    print(f"[UPLOAD] Received upload request for file: {file.filename}, user_id: {user_id}")
    
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
    
    print(f"[UPLOAD] Storage mode: {get_storage_mode()}")
    
    # Save file
    try:
        # Read file content
        print("[UPLOAD] Reading file content...")
        contents = await file.read()
        
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="File is empty")
        
        print(f"[UPLOAD] Read {len(contents)} bytes")
        
        # Save to Google Cloud Storage
        storage_type, storage_path = save_file(contents, filename, folder="uploads")
        
        # Get URL for the file
        file_url = get_file_url(filename, folder="uploads", storage_type=storage_type)
        
        print(f"[UPLOAD] SUCCESS: File saved to GCS. Storage: {storage_type}, URL: {file_url}")
        
        # Store metadata with user_id if provided
        if user_id:
            add_photo_metadata(filename, user_id)
            print(f"[UPLOAD] Associated photo with user_id: {user_id}")
        
        return {
            "id": unique_id,
            "filename": filename,
            "original_filename": file.filename,
            "url": file_url,
            "storage_type": storage_type,
            "uploaded_at": datetime.now().isoformat(),
            "user_id": user_id
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
    """Serve a photo or video file from Google Cloud Storage"""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Read from Google Cloud Storage
    file_content = read_file_content(filename, folder="uploads")
    
    if file_content is None:
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Determine media type based on extension
    ext = Path(filename).suffix.lower()
    media_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".avi": "video/x-msvideo",
        ".webm": "video/webm",
        ".mkv": "video/x-matroska",
        ".flv": "video/x-flv",
        ".wmv": "video/x-ms-wmv",
        ".m4v": "video/x-m4v"
    }
    media_type = media_type_map.get(ext, "application/octet-stream")
    
    # Try to get GCS URL, if it's a signed URL, redirect to it
    gcs_url = get_file_url(filename, folder="uploads", storage_type="gcs")
    if gcs_url.startswith("http"):
        return RedirectResponse(url=gcs_url)
    
    # Otherwise, serve file content directly
    return Response(content=file_content, media_type=media_type)

@router.get("/photos")
async def list_photos(user_id: Optional[str] = Query(None)):
    """List uploaded photos and videos from Google Cloud Storage, optionally filtered by user_id"""
    photos = []
    
    # Get files from Google Cloud Storage
    files = list_files(folder="uploads")
    
    # Filter by user_id if provided
    if user_id:
        filenames_to_include = filter_photos_by_user([f["filename"] for f in files], user_id)
        files = [f for f in files if f["filename"] in filenames_to_include]
    
    for file_info in files:
        filename = file_info["filename"]
        if Path(filename).suffix.lower() in ALLOWED_EXTENSIONS:
            storage_type = file_info.get("storage_type", "gcs")
            file_url = get_file_url(filename, folder="uploads", storage_type=storage_type)
            
            # Determine if file is a video
            ext = Path(filename).suffix.lower()
            video_extensions = {".mp4", ".mov", ".avi", ".webm", ".mkv", ".flv", ".wmv", ".m4v"}
            is_video = ext in video_extensions
            
            photos.append({
                "id": Path(filename).stem,
                "filename": filename,
                "url": file_url,
                "size": file_info.get("size", 0),
                "uploaded_at": file_info.get("updated_at", datetime.now().isoformat()),
                "storage_type": storage_type,
                "is_video": is_video
            })
    
    # Sort by upload time (newest first)
    photos.sort(key=lambda x: x["uploaded_at"], reverse=True)
    
    return {"photos": photos}

@router.delete("/photos/{filename}")
async def delete_photo(filename: str, user_id: Optional[str] = Query(None)):
    """Delete a photo (only if it belongs to the user, or if no user_id is set for the photo)"""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Get photo's user_id if it exists
    photo_user_id = get_photo_user_id(filename)
    
    # If photo has a user_id, require matching user_id to delete
    if photo_user_id:
        if not user_id or user_id != photo_user_id:
            raise HTTPException(status_code=403, detail="You don't have permission to delete this photo")
    
    # Check if file exists in Google Cloud Storage
    if not file_exists(filename, folder="uploads", storage_type="gcs"):
        raise HTTPException(status_code=404, detail="Photo not found")
    
    # Delete the file from Google Cloud Storage
    success = delete_file(filename, folder="uploads", storage_type="gcs")
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete photo")
    
    # Delete metadata
    delete_photo_metadata(filename)
    
    return {"success": True, "message": "Photo deleted successfully"}

@router.post("/signed-url")
def generate_signed_url():
    return {"message": "generate GCS signed URL here"}

@router.get("/test")
def test_storage():
    """Test endpoint to verify Google Cloud Storage setup"""
    from app.storage import get_storage_mode
    import os
    return {
        "storage_mode": get_storage_mode(),
        "gcs_bucket": os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET"),
        "gcs_project_id": os.getenv("GOOGLE_CLOUD_PROJECT_ID"),
        "gcs_configured": bool(os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET") and os.getenv("GOOGLE_CLOUD_PROJECT_ID"))
    }
