import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isNavigationAllowed, setAllowedNavigation } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Photo {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
  is_video?: boolean;
}

export default function AllPhotos() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deletingPhotoIds, setDeletingPhotoIds] = useState<Set<string>>(new Set());
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    // Check if navigation is allowed
    if (typeof window !== 'undefined') {
      if (!isNavigationAllowed()) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      fetchAllPhotos();
    }
  }, []);

  const fetchAllPhotos = async () => {
    try {
      setLoading(true);
      // Fetch all photos without user_id filter
      const response = await fetch(`${API_URL}/upload/photos`);
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

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAllPhotos = () => {
    setSelectedPhotoIds(new Set(photos.map(p => p.id)));
  };

  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedPhotoIds.size} file${selectedPhotoIds.size > 1 ? 's' : ''}?`)) {
      return;
    }

    const photosToDelete = photos.filter(p => selectedPhotoIds.has(p.id));
    setDeletingPhotoIds(new Set(selectedPhotoIds));
    setError(null);

    try {
      const deletePromises = photosToDelete.map(async (photo) => {
        try {
          // Try to delete without user_id first (for photos without user_id)
          const response = await fetch(
            `${API_URL}/upload/photos/${photo.filename}`,
            {
              method: 'DELETE',
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(errorData.detail || `Failed to delete ${photo.filename}`);
          }
          return { success: true, id: photo.id };
        } catch (err) {
          console.error(`Error deleting ${photo.filename}:`, err);
          return { success: false, id: photo.id, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      });

      const results = await Promise.all(deletePromises);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      // Remove successfully deleted photos
      setPhotos(prev => prev.filter(p => !selectedPhotoIds.has(p.id) || !results.find(r => r.id === p.id && r.success)));
      
      // Clear selection
      setSelectedPhotoIds(new Set());
      setIsSelectionMode(false);

      // Close modal if deleted photo was selected
      if (selectedPhoto && selectedPhotoIds.has(selectedPhoto.id)) {
        setSelectedPhoto(null);
      }

      if (failed.length > 0) {
        setError(`Successfully deleted ${successful.length} file${successful.length > 1 ? 's' : ''}. ${failed.length} file${failed.length > 1 ? 's' : ''} could not be deleted (may require owner permission).`);
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during bulk delete');
    } finally {
      setDeletingPhotoIds(new Set());
    }
  };

  // Show access denied if not allowed
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          maxWidth: '500px'
        }}>
          <h1 style={{ fontSize: '32px', color: '#333', marginBottom: '20px' }}>Access Denied</h1>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '30px' }}>
            This page can only be accessed through the links provided on the home or admin page.
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#C5BE77',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500',
            marginRight: '10px'
          }}>
            Go to Home Page
          </Link>
          <Link href="/admin" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#C5BE77',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: '500'
          }}>
            Go to Admin Page
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <style>{`
          @media (max-width: 768px) {
            .button-container {
              flex-direction: column !important;
            }
            .button-container button,
            .button-container a {
              width: 100% !important;
            }
          }
        `}</style>
      </Head>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '15px',
          marginBottom: '30px',
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#333' }}>All Uploaded Photos & Videos</h1>
            <p style={{ margin: '5px 0 0 0', color: '#666' }}>
              {photos.length} {photos.length === 1 ? 'file' : 'files'} total
              {isSelectionMode && selectedPhotoIds.size > 0 && (
                <span style={{ marginLeft: '10px', color: '#C5BE77', fontWeight: 'bold' }}>
                  • {selectedPhotoIds.size} selected
                </span>
              )}
            </p>
          </div>
          <div className="button-container" style={{ 
            display: 'flex', 
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '8px', 
            alignItems: 'stretch',
            width: '100%'
          }}>
            {isSelectionMode ? (
              <>
                {selectedPhotoIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deletingPhotoIds.size > 0}
                    style={{
                      padding: '8px 16px',
                      minWidth: '120px',
                      flex: '1 1 auto',
                      backgroundColor: deletingPhotoIds.size > 0 ? '#ccc' : '#c33',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: '500',
                      fontSize: '14px',
                      cursor: deletingPhotoIds.size > 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {deletingPhotoIds.size > 0 ? 'Deleting...' : `Delete (${selectedPhotoIds.size})`}
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedPhotoIds(new Set());
                  }}
                  style={{
                    padding: '8px 16px',
                    minWidth: '120px',
                    flex: '1 1 auto',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsSelectionMode(true)}
                  style={{
                    padding: '8px 16px',
                    minWidth: '120px',
                    flex: '1 1 auto',
                    backgroundColor: '#C5BE77',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Select Photos
                </button>
                <Link href="/admin" style={{
                  padding: '8px 16px',
                  minWidth: '120px',
                  flex: '1 1 auto',
                  backgroundColor: '#C5BE77',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: '500',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
                }}>
                  Admin Panel
                </Link>
              </>
            )}
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
              onClick={fetchAllPhotos}
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

        {/* Selection Mode Controls */}
        {!loading && photos.length > 0 && isSelectionMode && (
          <div style={{
            backgroundColor: 'white',
            padding: '15px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button
                onClick={selectedPhotoIds.size === photos.length ? deselectAllPhotos : selectAllPhotos}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#C5BE77',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {selectedPhotoIds.size === photos.length ? 'Deselect All' : 'Select All'}
              </button>
              <span style={{ color: '#666', fontSize: '14px' }}>
                {selectedPhotoIds.size} of {photos.length} selected
              </span>
            </div>
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
                  boxShadow: selectedPhotoIds.has(photo.id) ? '0 4px 12px rgba(197, 190, 119, 0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  border: selectedPhotoIds.has(photo.id) ? '3px solid #C5BE77' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!isSelectionMode) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelectionMode) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = selectedPhotoIds.has(photo.id) ? '0 4px 12px rgba(197, 190, 119, 0.5)' : '0 2px 8px rgba(0,0,0,0.1)';
                  }
                }}
              >
                {/* Checkbox for selection mode */}
                {isSelectionMode && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedPhotoIds.has(photo.id)}
                      onChange={() => togglePhotoSelection(photo.id)}
                      style={{
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        accentColor: '#C5BE77'
                      }}
                    />
                  </div>
                )}
                
                {/* Delete overlay when deleting */}
                {deletingPhotoIds.has(photo.id) && (
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
                    zIndex: 5,
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    Deleting...
                  </div>
                )}

                <div 
                  onClick={() => !isSelectionMode && setSelectedPhoto(photo)}
                  style={{
                    cursor: isSelectionMode ? 'default' : 'pointer'
                  }}
                >
                  <div style={{ position: 'relative', paddingTop: '100%', backgroundColor: '#f0f0f0' }}>
                    {photo.is_video ? (
                      <video
                        src={getImageUrl(photo)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                        muted
                        playsInline
                      />
                    ) : (
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
                    )}
                    {photo.is_video && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        ▶ VIDEO
                      </div>
                    )}
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
              {selectedPhoto.is_video ? (
                <video
                  src={getImageUrl(selectedPhoto)}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: '90vh',
                    borderRadius: '4px'
                  }}
                />
              ) : (
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
              )}
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}

