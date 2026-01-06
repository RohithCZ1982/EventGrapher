import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Photo {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
}

export default function Slideshow() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const slideIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch all photos (no user_id filter)
  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/upload/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      const fetchedPhotos = data.photos || [];
      setPhotos(fetchedPhotos);
      setError(null);
      
      // If we had photos before and new photos were added, keep current index if possible
      // Otherwise reset to 0 if current index is out of bounds
      if (fetchedPhotos.length > 0 && currentIndex >= fetchedPhotos.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPhotos([]);
    } finally {
      setLoading(false);
      setImageLoading(false);
    }
  };

  // Initial fetch and setup refresh interval (every 3 minutes)
  useEffect(() => {
    fetchPhotos();
    
    // Set up auto-refresh every 3 minutes (180000 ms)
    refreshIntervalRef.current = setInterval(() => {
      fetchPhotos();
    }, 180000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Auto-advance slideshow
  useEffect(() => {
    if (photos.length === 0 || !isPlaying) {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
        slideIntervalRef.current = null;
      }
      return;
    }

    // Auto-advance every 5 seconds
    slideIntervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      setImageLoading(true);
    }, 5000);

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
    };
  }, [photos.length, isPlaying]);

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

  const goToNext = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    setImageLoading(true);
  };

  const goToPrevious = () => {
    if (photos.length === 0) return;
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    setImageLoading(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToSlide = (index: number) => {
    if (index >= 0 && index < photos.length) {
      setCurrentIndex(index);
      setImageLoading(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    // Skip to next image if current one fails to load
    if (photos.length > 0) {
      setTimeout(() => {
        goToNext();
      }, 1000);
    }
  };

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000', 
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '24px', 
            color: '#fff',
            fontWeight: '600'
          }}>
            Photo Slideshow
          </h1>
          {photos.length > 0 && (
            <p style={{ 
              margin: '5px 0 0 0', 
              fontSize: '14px', 
              color: '#ccc' 
            }}>
              {currentIndex + 1} of {photos.length}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link href="/" style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(197, 190, 119, 0.9)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Home
          </Link>
          <Link href="/gallery" style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(197, 190, 119, 0.9)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '5px',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            Gallery
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && photos.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📷</div>
            <p style={{ fontSize: '18px' }}>Loading photos...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && photos.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          textAlign: 'center',
          padding: '40px'
        }}>
          <div>
            <p style={{ fontSize: '18px', marginBottom: '20px' }}>
              <strong>Error:</strong> {error}
            </p>
            <button
              onClick={fetchPhotos}
              style={{
                padding: '12px 24px',
                backgroundColor: '#C5BE77',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && photos.length === 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          textAlign: 'center',
          padding: '40px'
        }}>
          <div>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>📸</div>
            <p style={{ fontSize: '20px', marginBottom: '20px' }}>
              No photos available yet.
            </p>
            <Link href="/" style={{
              padding: '12px 24px',
              backgroundColor: '#C5BE77',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '5px',
              display: 'inline-block',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Upload Photos
            </Link>
          </div>
        </div>
      )}

      {/* Slideshow Content */}
      {!loading && photos.length > 0 && currentPhoto && (
        <>
          {/* Main Image */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: '80px 20px 120px 20px'
          }}>
            {imageLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff',
                fontSize: '18px',
                zIndex: 10
              }}>
                Loading...
              </div>
            )}
            <img
              src={getImageUrl(currentPhoto)}
              alt={currentPhoto.filename}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                opacity: imageLoading ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
              }}
            />
          </div>

          {/* Navigation Controls */}
          <div style={{
            position: 'absolute',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: '15px 25px',
            borderRadius: '50px',
            zIndex: 100
          }}>
            <button
              onClick={goToPrevious}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              title="Previous"
            >
              ‹
            </button>
            
            <button
              onClick={togglePlayPause}
              style={{
                backgroundColor: 'rgba(197, 190, 119, 0.9)',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(197, 190, 119, 1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(197, 190, 119, 0.9)'}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            
            {currentPhoto && (
              <button
                onClick={() => downloadImage(currentPhoto)}
                style={{
                  backgroundColor: 'rgba(76, 175, 80, 0.9)',
                  border: 'none',
                  color: '#fff',
                  fontSize: '18px',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.9)'}
                title="Download current photo"
              >
                ⬇
              </button>
            )}
            
            <button
              onClick={goToNext}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              title="Next"
            >
              ›
            </button>
          </div>

          {/* Thumbnail Strip */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '15px',
            overflowX: 'auto',
            zIndex: 100
          }}>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'center',
              minWidth: 'max-content'
            }}>
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => goToSlide(index)}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: index === currentIndex ? '3px solid #C5BE77' : '3px solid transparent',
                    opacity: index === currentIndex ? 1 : 0.7,
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (index !== currentIndex) {
                      e.currentTarget.style.opacity = '0.7';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <img
                    src={getImageUrl(photo)}
                    alt={photo.filename}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Photo Info */}
          {currentPhoto && (
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              padding: '15px 20px',
              borderRadius: '8px',
              color: '#fff',
              maxWidth: '300px',
              zIndex: 100
            }}>
              <p style={{ margin: '0 0 5px 0', fontSize: '14px', fontWeight: '600' }}>
                {currentPhoto.filename}
              </p>
              <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#ccc' }}>
                {new Date(currentPhoto.uploaded_at).toLocaleString()}
              </p>
              <button
                onClick={() => downloadImage(currentPhoto)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
              >
                Download Photo
              </button>
            </div>
          )}
        </>
      )}

      {/* Keyboard Navigation */}
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') goToPrevious();
          if (e.key === 'ArrowRight') goToNext();
          if (e.key === ' ') {
            e.preventDefault();
            togglePlayPause();
          }
        }}
        style={{ outline: 'none', position: 'absolute', width: '100%', height: '100%', top: 0, left: 0 }}
      />
    </div>
  );
}

