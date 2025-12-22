
import os
from pathlib import Path
from typing import Optional, Tuple
from datetime import datetime

# Try to import GCS libraries, but don't fail if not available
try:
    from google.cloud import storage
    from google.cloud.exceptions import GoogleCloudError
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    print("[STORAGE] google-cloud-storage not available, using local storage only")

# Check if GCS is configured
GCS_BUCKET_NAME = os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET")
GCS_PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT_ID")
GCS_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

# Determine storage mode
USE_GCS = bool(GCS_AVAILABLE and GCS_BUCKET_NAME and GCS_PROJECT_ID)

# Initialize GCS client if configured
_gcs_client = None

def _get_gcs_credentials():
    """Get GCS credentials from environment variable (for Render deployment)"""
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
            print(f"[STORAGE] Error parsing credentials JSON: {e}")
            return None
    return None

if USE_GCS and GCS_AVAILABLE:
    try:
        # Try to get credentials from environment variable first (for Render)
        credentials = _get_gcs_credentials()
        if credentials:
            _gcs_client = storage.Client(project=GCS_PROJECT_ID, credentials=credentials)
            print(f"[STORAGE] Google Cloud Storage configured with env credentials. Bucket: {GCS_BUCKET_NAME}")
        else:
            # Fall back to default credentials (for local development with service account file)
            _gcs_client = storage.Client(project=GCS_PROJECT_ID)
            print(f"[STORAGE] Google Cloud Storage configured with default credentials. Bucket: {GCS_BUCKET_NAME}")
    except Exception as e:
        print(f"[STORAGE] Warning: Failed to initialize GCS client: {e}")
        print(f"[STORAGE] Falling back to local storage")
        USE_GCS = False
        _gcs_client = None
else:
    if not GCS_BUCKET_NAME or not GCS_PROJECT_ID:
        print(f"[STORAGE] Using local storage (GCS not configured - missing env vars)")
    else:
        print(f"[STORAGE] Using local storage (GCS library not available)")

def get_storage_mode() -> str:
    """Get current storage mode"""
    return "gcs" if USE_GCS else "local"

def _get_content_type(filename: str) -> str:
    """Determine content type based on file extension"""
    ext = Path(filename).suffix.lower()
    content_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp"
    }
    return content_type_map.get(ext, "application/octet-stream")

def save_file(file_content: bytes, filename: str, folder: str = "uploads") -> Tuple[str, str]:
    """
    Save a file either to GCS or local storage.
    Returns (storage_type, file_path_or_blob_name)
    """
    if USE_GCS and _gcs_client:
        try:
            bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
            blob_name = f"{folder}/{filename}"
            blob = bucket.blob(blob_name)
            content_type = _get_content_type(filename)
            blob.upload_from_string(file_content, content_type=content_type)
            print(f"[STORAGE] Saved to GCS: {blob_name} (content-type: {content_type})")
            return ("gcs", blob_name)
        except GoogleCloudError as e:
            print(f"[STORAGE] GCS upload failed: {e}, falling back to local")
            # Fall through to local storage
        except Exception as e:
            print(f"[STORAGE] Error uploading to GCS: {e}, falling back to local")
            # Fall through to local storage
    
    # Local storage fallback
    local_dir = Path(__file__).parent.parent.parent / folder
    local_dir.mkdir(parents=True, exist_ok=True)
    file_path = local_dir / filename
    
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    print(f"[STORAGE] Saved to local storage: {file_path}")
    return ("local", str(file_path))

def get_file_url(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> str:
    """
    Get URL or path for a file.
    For GCS, returns a signed URL or public URL.
    For local, returns a relative path for the API endpoint.
    """
    if storage_type == "gcs" or (USE_GCS and storage_type is None):
        if USE_GCS and _gcs_client:
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
                    if blob.public_url:
                        return blob.public_url
                    # Otherwise, return API endpoint path (will be served through API)
                    print(f"[STORAGE] Using API endpoint for GCS file (signed URL not available)")
                    if folder == "uploads":
                        return f"/upload/photos/{filename}"
                    elif folder == "events/images":
                        return f"/events/image/{filename}"
                    return f"/{folder}/{filename}"
            except Exception as e:
                print(f"[STORAGE] Error generating GCS URL: {e}")
                # Fall through to local path
    
    # Local storage - return relative path for API endpoint
    if folder == "uploads":
        return f"/upload/photos/{filename}"
    elif folder == "events/images":
        return f"/events/image/{filename}"
    return f"/{folder}/{filename}"

def file_exists(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> bool:
    """Check if file exists in storage"""
    if storage_type == "gcs" or (USE_GCS and storage_type is None):
        if USE_GCS and _gcs_client:
            try:
                bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
                blob_name = f"{folder}/{filename}"
                blob = bucket.blob(blob_name)
                return blob.exists()
            except Exception:
                return False
    
    # Local storage
    local_dir = Path(__file__).parent.parent.parent / folder
    file_path = local_dir / filename
    return file_path.exists()

def list_files(folder: str = "uploads") -> list:
    """List all files in storage"""
    files = []
    
    if USE_GCS and _gcs_client:
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
            return files
        except Exception as e:
            print(f"[STORAGE] Error listing GCS files: {e}, trying local")
    
    # Local storage
    local_dir = Path(__file__).parent.parent.parent / folder
    if local_dir.exists():
        for file_path in local_dir.iterdir():
            if file_path.is_file():
                stat = file_path.stat()
                files.append({
                    "filename": file_path.name,
                    "size": stat.st_size,
                    "updated_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "storage_type": "local"
                })
    
    return files

def read_file_content(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> Optional[bytes]:
    """Read file content from storage"""
    if storage_type == "gcs" or (USE_GCS and storage_type is None):
        if USE_GCS and _gcs_client:
            try:
                bucket = _gcs_client.bucket(GCS_BUCKET_NAME)
                blob_name = f"{folder}/{filename}"
                blob = bucket.blob(blob_name)
                return blob.download_as_bytes()
            except Exception as e:
                print(f"[STORAGE] Error reading from GCS: {e}")
                return None
    
    # Local storage
    local_dir = Path(__file__).parent.parent.parent / folder
    file_path = local_dir / filename
    if file_path.exists():
        with open(file_path, "rb") as f:
            return f.read()
    return None

def delete_file(filename: str, folder: str = "uploads", storage_type: Optional[str] = None) -> bool:
    """Delete a file from storage. Returns True if successful, False otherwise."""
    if storage_type == "gcs" or (USE_GCS and storage_type is None):
        if USE_GCS and _gcs_client:
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
    
    # Local storage
    local_dir = Path(__file__).parent.parent.parent / folder
    file_path = local_dir / filename
    if file_path.exists():
        try:
            file_path.unlink()
            print(f"[STORAGE] Deleted from local storage: {file_path}")
            return True
        except Exception as e:
            print(f"[STORAGE] Error deleting local file: {e}")
            return False
    else:
        print(f"[STORAGE] File not found in local storage: {file_path}")
        return False

