
import json
from pathlib import Path
from typing import Optional, Dict, List
from datetime import datetime

# Storage for photo metadata (maps filename to user_id)
METADATA_FILE = Path(__file__).parent.parent.parent / "data" / "photos_metadata.json"
METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)

def load_metadata() -> Dict[str, Dict]:
    """Load photo metadata from file"""
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading metadata: {e}")
            return {}
    return {}

def save_metadata(metadata: Dict[str, Dict]):
    """Save photo metadata to file"""
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving metadata: {e}")
        raise

def add_photo_metadata(filename: str, user_id: str):
    """Add metadata for a photo"""
    metadata = load_metadata()
    metadata[filename] = {
        "user_id": user_id,
        "uploaded_at": datetime.now().isoformat()
    }
    save_metadata(metadata)

def get_photo_user_id(filename: str) -> Optional[str]:
    """Get user_id for a photo"""
    metadata = load_metadata()
    photo_data = metadata.get(filename)
    if photo_data:
        return photo_data.get("user_id")
    return None

def filter_photos_by_user(filenames: List[str], user_id: str) -> List[str]:
    """Filter photos by user_id"""
    metadata = load_metadata()
    filtered = []
    for filename in filenames:
        photo_data = metadata.get(filename)
        if photo_data and photo_data.get("user_id") == user_id:
            filtered.append(filename)
    return filtered

def delete_photo_metadata(filename: str):
    """Delete metadata for a photo"""
    metadata = load_metadata()
    if filename in metadata:
        del metadata[filename]
        save_metadata(metadata)
        return True
    return False

