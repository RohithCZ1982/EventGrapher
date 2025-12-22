import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
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
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
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
                onClick={() => setSelectedPhoto(photo)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
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
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

