
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import RedirectResponse, Response
import os
import json
from pathlib import Path
from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.storage import save_file, get_file_url, file_exists, read_file_content

router = APIRouter()

# Storage for event data (in production, use a database)
EVENTS_DIR = Path(__file__).parent.parent.parent / "data" / "events"
EVENTS_DIR.mkdir(parents=True, exist_ok=True)
EVENT_DATA_FILE = EVENTS_DIR / "event_data.json"

# Image storage for event
EVENT_IMAGES_DIR = EVENTS_DIR / "images"
EVENT_IMAGES_DIR.mkdir(exist_ok=True)

class EventData(BaseModel):
    event_name: str
    welcome_message: str
    image_filename: Optional[str] = None
    background_image_filename: Optional[str] = None
    poster_heading: Optional[str] = None
    updated_at: Optional[str] = None

def load_event_data() -> Optional[EventData]:
    """Load event data from file"""
    if EVENT_DATA_FILE.exists():
        try:
            with open(EVENT_DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                return EventData(**data)
        except Exception as e:
            print(f"Error loading event data: {e}")
            return None
    return None

def save_event_data(event_data: EventData):
    """Save event data to file"""
    try:
        with open(EVENT_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(event_data.dict(), f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving event data: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save event data: {str(e)}")

@router.post("/")
async def create_or_update_event(
    event_name: str = Form(...),
    welcome_message: str = Form(...),
    image: Optional[UploadFile] = File(None)
):
    """Create or update event information"""
    try:
        # Handle image upload if provided
        image_filename = None
        if image and image.filename:
            # Validate image
            file_ext = Path(image.filename).suffix.lower()
            allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
            if file_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid image type. Allowed: {', '.join(allowed_extensions)}"
                )
            
            # Save image
            image_filename = f"event_image{file_ext}"
            
            # Read image content
            contents = await image.read()
            
            # Save to Google Cloud Storage
            storage_type, storage_path = save_file(contents, image_filename, folder="events/images")
        
        # Load existing data to preserve images and poster settings if new ones not uploaded
        existing_data = load_event_data()
        if not image_filename and existing_data:
            image_filename = existing_data.image_filename
        # Preserve poster settings (background_image and poster_heading)
        background_image_filename = existing_data.background_image_filename if existing_data else None
        poster_heading = existing_data.poster_heading if existing_data else None
        
        # Create event data
        event_data = EventData(
            event_name=event_name,
            welcome_message=welcome_message,
            image_filename=image_filename,
            background_image_filename=background_image_filename,
            poster_heading=poster_heading,
            updated_at=datetime.now().isoformat()
        )
        
        # Save event data
        save_event_data(event_data)
        
        return {
            "success": True,
            "message": "Event updated successfully",
            "data": event_data.dict()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating event: {str(e)}")

@router.get("/")
def get_event():
    """Get current event information"""
    event_data = load_event_data()
    if event_data:
        return {
            "success": True,
            "data": event_data.dict()
        }
    return {
        "success": True,
        "data": None,
        "message": "No event data found"
    }

@router.get("/image/{filename}")
async def get_event_image(filename: str):
    """Get event image from Google Cloud Storage"""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Read from Google Cloud Storage
    file_content = read_file_content(filename, folder="events/images")
    
    if file_content is None:
        raise HTTPException(status_code=404, detail="Image not found")
    
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
    
    # Try to get GCS URL, if it's a signed URL, redirect to it
    gcs_url = get_file_url(filename, folder="events/images", storage_type="gcs")
    if gcs_url.startswith("http"):
        return RedirectResponse(url=gcs_url)
    
    # Otherwise, serve file content directly
    return Response(content=file_content, media_type=media_type)

@router.post("/poster-settings")
async def update_poster_settings(
    poster_heading: Optional[str] = Form(None),
    background_image: Optional[UploadFile] = File(None)
):
    """Update poster settings (heading and background image)"""
    try:
        # Load existing event data
        existing_data = load_event_data()
        
        # Handle background image upload if provided
        background_image_filename = None
        if existing_data:
            background_image_filename = existing_data.background_image_filename
        
        if background_image and background_image.filename:
            # Validate image
            file_ext = Path(background_image.filename).suffix.lower()
            allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"}
            if file_ext not in allowed_extensions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid background image type. Allowed: {', '.join(allowed_extensions)}"
                )
            
            # Save background image
            background_image_filename = f"background_image{file_ext}"
            
            # Read image content
            contents = await background_image.read()
            
            # Save to Google Cloud Storage
            storage_type, storage_path = save_file(contents, background_image_filename, folder="events/images")
        
        # Update or create event data with poster settings
        if existing_data:
            event_data = EventData(
                event_name=existing_data.event_name,
                welcome_message=existing_data.welcome_message,
                image_filename=existing_data.image_filename,
                background_image_filename=background_image_filename,
                poster_heading=poster_heading if poster_heading else existing_data.poster_heading,
                updated_at=datetime.now().isoformat()
            )
        else:
            # Create minimal event data if it doesn't exist
            event_data = EventData(
                event_name="Default Event",
                welcome_message="Welcome",
                image_filename=None,
                background_image_filename=background_image_filename,
                poster_heading=poster_heading if poster_heading else "Our Memories",
                updated_at=datetime.now().isoformat()
            )
        
        # Save event data
        save_event_data(event_data)
        
        return {
            "success": True,
            "message": "Poster settings updated successfully",
            "data": {
                "poster_heading": event_data.poster_heading,
                "background_image_filename": event_data.background_image_filename
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating poster settings: {str(e)}")

@router.get("/poster-settings")
def get_poster_settings():
    """Get poster settings"""
    event_data = load_event_data()
    if event_data:
        return {
            "success": True,
            "data": {
                "poster_heading": event_data.poster_heading,
                "background_image_filename": event_data.background_image_filename
            }
        }
    return {
        "success": True,
        "data": {
            "poster_heading": None,
            "background_image_filename": None
        },
        "message": "No poster settings found"
    }

