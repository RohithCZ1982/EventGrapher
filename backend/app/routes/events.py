
from fastapi import APIRouter, UploadFile, File, HTTPException, Form, Request
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
    background_music_filename: Optional[str] = None
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
        data_dict = event_data.dict()
        print(f"[SAVE-EVENT-DATA] Saving event data with music filename: {data_dict.get('background_music_filename')}")
        with open(EVENT_DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data_dict, f, indent=2, ensure_ascii=False)
        print(f"[SAVE-EVENT-DATA] Event data saved successfully to {EVENT_DATA_FILE}")
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
        # Preserve poster settings (background_image, poster_heading, and background_music)
        background_image_filename = existing_data.background_image_filename if existing_data else None
        poster_heading = existing_data.poster_heading if existing_data else None
        background_music_filename = existing_data.background_music_filename if existing_data else None
        
        # Create event data
        event_data = EventData(
            event_name=event_name,
            welcome_message=welcome_message,
            image_filename=image_filename,
            background_image_filename=background_image_filename,
            poster_heading=poster_heading,
            background_music_filename=background_music_filename,
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

@router.get("/audio/{filename}")
async def get_event_audio(filename: str):
    """Get event audio file from Google Cloud Storage"""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # Read from Google Cloud Storage
    file_content = read_file_content(filename, folder="events/audio")
    
    if file_content is None:
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    # Determine media type based on extension
    ext = Path(filename).suffix.lower()
    media_type_map = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac"
    }
    media_type = media_type_map.get(ext, "audio/mpeg")
    
    # Try to get GCS URL, if it's a signed URL, redirect to it
    gcs_url = get_file_url(filename, folder="events/audio", storage_type="gcs")
    if gcs_url.startswith("http"):
        return RedirectResponse(url=gcs_url)
    
    # Otherwise, serve file content directly
    return Response(content=file_content, media_type=media_type)

@router.post("/poster-settings")
async def update_poster_settings(
    poster_heading: Optional[str] = Form(None),
    background_image: Optional[UploadFile] = File(None),
    background_music: Optional[UploadFile] = File(None, alias="background_music")
):
    """Update poster settings (heading, background image, and background music)"""
    try:
        print(f"[POSTER-SETTINGS] Received request - poster_heading: {poster_heading}")
        print(f"[POSTER-SETTINGS] background_image: {background_image}, filename: {background_image.filename if background_image else None}")
        print(f"[POSTER-SETTINGS] background_music object: {background_music}")
        print(f"[POSTER-SETTINGS] background_music type: {type(background_music)}")
        if background_music:
            print(f"[POSTER-SETTINGS] background_music.filename: {background_music.filename}")
            print(f"[POSTER-SETTINGS] background_music.size: {background_music.size if hasattr(background_music, 'size') else 'N/A'}")
        else:
            print(f"[POSTER-SETTINGS] background_music is None or falsy")
        
        # Load existing event data
        existing_data = load_event_data()
        print(f"[POSTER-SETTINGS] Existing data: {existing_data.background_music_filename if existing_data else 'No existing data'}")
        
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
        
        # Handle background music upload if provided
        background_music_filename = None
        if existing_data:
            background_music_filename = existing_data.background_music_filename
            print(f"[POSTER-SETTINGS] Preserving existing music filename: {background_music_filename}")
        
        # Check if background_music was provided
        # FastAPI might pass an empty UploadFile object even when no file is sent
        has_music_file = False
        if background_music is not None:
            # Check if it's a valid UploadFile with a filename
            music_filename = getattr(background_music, 'filename', None)
            if music_filename and music_filename.strip():
                has_music_file = True
                print(f"[POSTER-SETTINGS] Music file detected: {music_filename}")
            else:
                print(f"[POSTER-SETTINGS] background_music object exists but filename is empty or None: '{music_filename}'")
        else:
            print(f"[POSTER-SETTINGS] background_music is None")
        
        if has_music_file:
            print(f"[POSTER-SETTINGS] Processing music upload: {background_music.filename}")
            # Validate audio file
            file_ext = Path(background_music.filename).suffix.lower()
            allowed_extensions = {".mp3", ".wav", ".ogg", ".m4a", ".aac"}
            if file_ext not in allowed_extensions:
                print(f"[POSTER-SETTINGS] Invalid file extension: {file_ext}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid audio file type. Allowed: {', '.join(allowed_extensions)}"
                )
            
            # Save background music
            background_music_filename = f"background_music{file_ext}"
            print(f"[POSTER-SETTINGS] Saving music as: {background_music_filename}")
            
            # Read music content
            contents = await background_music.read()
            print(f"[POSTER-SETTINGS] Read {len(contents)} bytes of music data")
            
            # Save to Google Cloud Storage
            storage_type, storage_path = save_file(contents, background_music_filename, folder="events/audio")
            print(f"[POSTER-SETTINGS] Music saved to: {storage_path}")
        else:
            print(f"[POSTER-SETTINGS] No music file provided - background_music: {background_music}")
        
        # Update or create event data with poster settings
        if existing_data:
            event_data = EventData(
                event_name=existing_data.event_name,
                welcome_message=existing_data.welcome_message,
                image_filename=existing_data.image_filename,
                background_image_filename=background_image_filename,
                poster_heading=poster_heading if poster_heading else existing_data.poster_heading,
                background_music_filename=background_music_filename,
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
                background_music_filename=background_music_filename,
                updated_at=datetime.now().isoformat()
            )
        
        # Save event data
        save_event_data(event_data)
        print(f"[POSTER-SETTINGS] Saved event data with music filename: {event_data.background_music_filename}")
        
        response_data = {
            "success": True,
            "message": "Poster settings updated successfully",
            "data": {
                "poster_heading": event_data.poster_heading,
                "background_image_filename": event_data.background_image_filename,
                "background_music_filename": event_data.background_music_filename
            }
        }
        print(f"[POSTER-SETTINGS] Returning response: {response_data}")
        return response_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating poster settings: {str(e)}")

@router.get("/poster-settings")
def get_poster_settings():
    """Get poster settings"""
    event_data = load_event_data()
    print(f"[POSTER-SETTINGS GET] Loaded event_data: {event_data}")
    if event_data:
        print(f"[POSTER-SETTINGS GET] Music filename in event_data: {event_data.background_music_filename}")
        response_data = {
            "success": True,
            "data": {
                "poster_heading": event_data.poster_heading,
                "background_image_filename": event_data.background_image_filename,
                "background_music_filename": event_data.background_music_filename
            }
        }
        print(f"[POSTER-SETTINGS GET] Returning: {response_data}")
        return response_data
    print("[POSTER-SETTINGS GET] No event data found")
    return {
        "success": True,
        "data": {
            "poster_heading": None,
            "background_image_filename": None,
            "background_music_filename": None
        },
        "message": "No poster settings found"
    }

