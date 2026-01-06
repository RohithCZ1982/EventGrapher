
import os
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

# Import GCS libraries - required
try:
    from google.cloud import storage
    from google.cloud.exceptions import GoogleCloudError
except ImportError:
    raise ImportError(
        "google-cloud-storage is required. Install it with: pip install google-cloud-storage"
    )

# Get GCS configuration from environment variables - required
GCS_BUCKET_NAME = os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET")
GCS_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID")

# Validate GCS configuration
if not GCS_BUCKET_NAME:
    raise ValueError(
        "GOOGLE_CLOUD_STORAGE_BUCKET environment variable is required. "
        "Set it to your GCS bucket name."
    )

if not GCS_PROJECT_ID:
    raise ValueError(
        "GOOGLE_CLOUD_PROJECT_ID environment variable is required. "
        "Set it to your Google Cloud project ID."
    )

# Initialize GCS client
_gcs_client = None

def _get_gcs_credentials():
    """Get GCS credentials from environment variable"""
    creds_json = os.getenv("GOOGLE_CLOUD_CREDENTIALS_JSON")
    if creds_json:
        try:
            import json
            # Parse JSON string from environment variable
            creds_dict = json.loads(creds_json)
            # Return credentials object
            from google.oauth2 import service_account
            return service_account.Credentials.from_service_account_info(creds_dict)
        except Exception as e:
            raise ValueError(f"Error parsing GOOGLE_CLOUD_CREDENTIALS_JSON: {e}")
    return None

# Initialize GCS client - required
try:
    # Try to get credentials from environment variable first
    credentials = _get_gcs_credentials()
    if credentials:
        _gcs_client = storage.Client(project=GCS_PROJECT_ID, credentials=credentials)
        print(f"[STORAGE] Google Cloud Storage configured with env credentials. Bucket: {GCS_BUCKET_NAME}")
    else:
        # Use default credentials (Application Default Credentials)
        _gcs_client = storage.Client(project=GCS_PROJECT_ID)
        print(f"[STORAGE] Google Cloud Storage configured with default credentials. Bucket: {GCS_BUCKET_NAME}")
except Exception as e:
    raise RuntimeError(
        f"Failed to initialize Google Cloud Storage client: {e}. "
        "Make sure you have valid credentials configured."
    )

def get_storage_mode() -> str:
    """Get current storage mode (always GCS)"""
    return "gcs"

def _get_content_type(filename: str) -> str:
    """Determine content type based on file extension"""
    ext = Path(filename).suffix.lower()
    content_type_map = {
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
        ".m4v": "video/x-m4v",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac"
    }
    return content_type_map.get(ext, "application/octet-stream")

def save_file(file_content: bytes, filename: str, folder: str = "uploads") -> Tuple[str, str]:
    """
    Save a file to Google Cloud Storage.
    Returns (storage_type, blob_name)
    """
    if not _gcs_client:
        raise RuntimeError("Google Cloud Storage client is not initialized")
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{folder}/{filename}"
        blob = bucket.blob(blob_name)
        content_type = _get_content_type(filename)
        blob.upload_from_string(file_content, content_type=content_type)
        print(f"[STORAGE] Saved to GCS: {blob_name} (content-type: {content_type})")
        return ("gcs", blob_name)
    except GoogleCloudError as e:
        raise RuntimeError(f"Failed to upload file to Google Cloud Storage: {e}")
    except Exception as e:
        raise RuntimeError(f"Error uploading file to Google Cloud Storage: {e}")

def get_file_url(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> str:
    """
    Get URL for a file in Google Cloud Storage.
    Returns a signed URL or public URL, or API endpoint if signed URL generation fails.
    """
    if not _gcs_client:
        raise RuntimeError("Google Cloud Storage client is not initialized")
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{folder}/{filename}"
        blob = bucket.blob(blob_name)
        
        # Try to generate signed URL (requires service account with signing capability)
        try:
            url = blob.generate_signed_url(
                expiration=3600,
                method="GET"
            )
            return url
        except Exception as sign_error:
            # If signed URL generation fails, try public URL
            print(f"[STORAGE] Signed URL generation failed: {sign_error}, trying public URL")
            # Check if bucket is public, if so return public URL
            try:
                if blob.exists():
                    # Return API endpoint path (will be served through API)
                    print(f"[STORAGE] Using API endpoint for GCS file (signed URL not available)")
                    if folder == "uploads":
                        return f"/upload/photos/{filename}"
                    elif folder == "events/images":
                        return f"/events/image/{filename}"
                    return f"/{folder}/{filename}"
            except Exception:
                pass
            
            # Fallback to API endpoint
            if folder == "uploads":
                return f"/upload/photos/{filename}"
            elif folder == "events/images":
                return f"/events/image/{filename}"
            return f"/{folder}/{filename}"
    except Exception as e:
        print(f"[STORAGE] Error generating GCS URL: {e}")
        # Return API endpoint as fallback
        if folder == "uploads":
            return f"/upload/photos/{filename}"
        elif folder == "events/images":
            return f"/events/image/{filename}"
        return f"/{folder}/{filename}"

def file_exists(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> bool:
    """Check if file exists in Google Cloud Storage"""
    if not _gcs_client:
        return False
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{folder}/{filename}"
        blob = bucket.blob(blob_name)
        return blob.exists()
    except Exception as e:
        print(f"[STORAGE] Error checking if file exists in GCS: {e}")
        return False

def list_files(folder: str = "uploads") -> list:
    """List all files in Google Cloud Storage"""
    files = []
    
    if not _gcs_client:
        return files
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        prefix = f"{folder}/"
        blobs = bucket.list_blobs(prefix=prefix)
        
        for blob in blobs:
            if blob.name != prefix:  # Skip the folder itself
                filename = blob.name.split("/")[-1]
                files.append({
                    "filename": filename,
                    "size": blob.size,
                    "updated_at": blob.updated.isoformat() if blob.updated else None,
                    "storage_type": "gcs"
                })
    except Exception as e:
        print(f"[STORAGE] Error listing GCS files: {e}")
        raise RuntimeError(f"Failed to list files from Google Cloud Storage: {e}")
    
    return files

def read_file_content(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> Optional[bytes]:
    """Read file content from Google Cloud Storage"""
    if not _gcs_client:
        return None
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{folder}/{filename}"
        blob = bucket.blob(blob_name)
        return blob.download_as_bytes()
    except Exception as e:
        print(f"[STORAGE] Error reading from GCS: {e}")
        return None

def delete_file(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> bool:
    """Delete a file from Google Cloud Storage. Returns True if successful, False otherwise."""
    if not _gcs_client:
        return False
    
    try:
        bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
        blob_name = f"{folder}/{filename}"
        blob = bucket.blob(blob_name)
        if blob.exists():
            blob.delete()
            print(f"[STORAGE] Deleted from GCS: {blob_name}")
            return True
        else:
            print(f"[STORAGE] File not found in GCS: {blob_name}")
            return False
    except Exception as e:
        print(f"[STORAGE] Error deleting from GCS: {e}")
        return False
