import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Get user ID from localStorage
const getUserID = (): string => {
  if (typeof window !== 'undefined') {
    let userId = localStorage.getItem('eventgrapher_user_id');
    if (!userId) {
      userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('eventgrapher_user_id', userId);
    }
    return userId;
  }
  return '';
};

interface Photo {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
}

export default function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const userId = getUserID();
      const response = await fetch(`${API_URL}/upload/photos?user_id=${encodeURIComponent(userId)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      setPhotos(data.photos || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getImageUrl = (photo: Photo): string => {
    return `${API_URL}${photo.url}`;
  };

  const downloadImage = async (photo: Photo) => {
    try {
      const imageUrl = getImageUrl(photo);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download photo');
    }
  };

  const downloadSelectedPhotos = async () => {
    if (selectedPhotos.size === 0) return;
    
    setDownloading(true);
    try {
      const photosToDownload = photos.filter(p => selectedPhotos.has(p.id));
      
      for (const photo of photosToDownload) {
        await downloadImage(photo);
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      setSelectedPhotos(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download photos');
    } finally {
      setDownloading(false);
    }
  };

  const togglePhotoSelection = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const selectAllPhotos = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map(p => p.id)));
    }
  };

  const handleDeletePhoto = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the modal
    if (!confirm('Are you sure you want to delete this photo?')) {
      return;
    }

    try {
      setDeletingPhotoId(photo.id);
      const userId = getUserID();
      const response = await fetch(
        `${API_URL}/upload/photos/${photo.filename}?user_id=${encodeURIComponent(userId)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to delete photo');
      }

      // Remove photo from list
      setPhotos(photos.filter(p => p.id !== photo.id));
      
      // Close modal if the deleted photo was selected
      if (selectedPhoto && selectedPhoto.id === photo.id) {
        setSelectedPhoto(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '30px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>Photo Gallery</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
              {selectedPhotos.size > 0 && ` • ${selectedPhotos.size} selected`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {photos.length > 0 && (
              <>
                <button
                  onClick={selectAllPhotos}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: selectedPhotos.size === photos.length ? '#666' : '#C5BE77',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {selectedPhotos.size === photos.length ? 'Deselect All' : 'Select All'}
                </button>
                {selectedPhotos.size > 0 && (
                  <button
                    onClick={downloadSelectedPhotos}
                    disabled={downloading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: downloading ? '#ccc' : '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: '500',
                      cursor: downloading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {downloading ? 'Downloading...' : `Download (${selectedPhotos.size})`}
                  </button>
                )}
              </>
            )}
            <Link href="/" style={{
              padding: '10px 20px',
              backgroundColor: '#C5BE77',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: '500'
            }}>
              ← Upload Photos
            </Link>
            <Link href="/admin" style={{
              padding: '10px 20px',
              backgroundColor: '#C5BE77',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              fontWeight: '500'
            }}>
              Admin Panel
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '18px', color: '#666' }}>Loading photos...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div style={{ 
            backgroundColor: '#fee',
            color: '#c33',
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #fcc'
          }}>
            <p><strong>Error:</strong> {error}</p>
            <button 
              onClick={fetchPhotos}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#C5BE77',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && photos.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '20px' }}>
              No photos uploaded yet.
            </p>
            <Link href="/" style={{
              padding: '12px 24px',
              backgroundColor: '#C5BE77',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              display: 'inline-block',
              fontWeight: '500'
            }}>
              Upload Your First Photo
            </Link>
          </div>
        )}

        {/* Photo Grid */}
        {!loading && photos.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            {photos.map((photo) => (
              <div
                key={photo.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: selectedPhotos.has(photo.id) ? '0 4px 12px rgba(76, 175, 80, 0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  border: selectedPhotos.has(photo.id) ? '3px solid #4CAF50' : '3px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = selectedPhotos.has(photo.id) 
                    ? '0 6px 16px rgba(76, 175, 80, 0.6)' 
                    : '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = selectedPhotos.has(photo.id)
                    ? '0 4px 12px rgba(76, 175, 80, 0.5)'
                    : '0 2px 8px rgba(0,0,0,0.1)';
                }}
              >
                <div 
                  onClick={() => setSelectedPhoto(photo)}
                  style={{
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f0f0f0' }}>
                    <img
                      src={getImageUrl(photo)}
                      alt={photo.filename}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {deletingPhotoId === photo.id && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold'
                      }}>
                        Deleting...
                      </div>
                    )}
                    {/* Selection Checkbox */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePhotoSelection(photo.id);
                      }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        width: '24px',
                        height: '24px',
                        backgroundColor: selectedPhotos.has(photo.id) ? '#4CAF50' : 'rgba(255, 255, 255, 0.9)',
                        border: '2px solid ' + (selectedPhotos.has(photo.id) ? '#4CAF50' : '#ccc'),
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        transition: 'all 0.2s'
                      }}
                    >
                      {selectedPhotos.has(photo.id) && (
                        <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                  </div>
                  <div style={{ padding: '12px' }}>
                    <p style={{ 
                      margin: '0 0 8px 0', 
                      fontSize: '12px', 
                      color: '#666',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {photo.filename}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#999' }}>
                      <span>{formatFileSize(photo.size)}</span>
                      <span>{formatDate(photo.uploaded_at).split(',')[0]}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeletePhoto(photo, e)}
                  disabled={deletingPhotoId === photo.id}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: deletingPhotoId === photo.id ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: '#c33',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s',
                    opacity: deletingPhotoId === photo.id ? 0.6 : 1,
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    if (deletingPhotoId !== photo.id) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="Delete photo"
                >
                  ×
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(photo);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(76, 175, 80, 0.9)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'all 0.2s',
                    zIndex: 10
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 1)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.9)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="Download photo"
                >
                  ⬇
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modal for full-size photo */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px',
              cursor: 'pointer'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                position: 'relative'
              }}
            >
              <button
                onClick={() => setSelectedPhoto(null)}
                style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'white',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '5px 10px',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
              <img
                src={getImageUrl(selectedPhoto)}
                alt={selectedPhoto.filename}
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '4px'
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: '-50px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'white',
                textAlign: 'center',
                fontSize: '14px'
              }}>
                <p style={{ margin: '5px 0' }}>{selectedPhoto.filename}</p>
                <p style={{ margin: '5px 0', opacity: 0.8 }}>
                  {formatFileSize(selectedPhoto.size)} • {formatDate(selectedPhoto.uploaded_at)}
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadImage(selectedPhoto);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Download Photo
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(selectedPhoto, e);
                    }}
                    disabled={deletingPhotoId === selectedPhoto.id}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#c33',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      cursor: deletingPhotoId === selectedPhoto.id ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: deletingPhotoId === selectedPhoto.id ? 0.6 : 1
                    }}
                  >
                    {deletingPhotoId === selectedPhoto.id ? 'Deleting...' : 'Delete Photo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

