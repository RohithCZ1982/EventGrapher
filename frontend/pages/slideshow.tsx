import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isNavigationAllowed, setAllowedNavigation, isAdminAuthenticated } from '../utils/auth';
import Logo from '../components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Photo {
  id: string;
  filename: string;
  url: string;
  size: number;
  uploaded_at: string;
  is_video?: boolean;
}

export default function Slideshow() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [backgroundMusicUrl, setBackgroundMusicUrl] = useState<string | null>(null);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Check if navigation is allowed
    if (typeof window !== 'undefined') {
      if (!isNavigationAllowed()) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }
      // Check if user is admin
      setIsAdmin(isAdminAuthenticated());
      fetchAllPhotos();
      fetchBackgroundMusic();
    }
  }, []);

  // Force refresh music on window focus (in case it was uploaded in another tab)
  useEffect(() => {
    const handleFocus = () => {
      fetchBackgroundMusic();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const fetchBackgroundMusic = async () => {
    try {
      const response = await fetch(`${API_URL}/events/poster-settings`);
      if (response.ok) {
        const result = await response.json();
        console.log('Poster settings response:', result);
        console.log('Result data:', result.data);
        
        // Check both possible locations for the music filename
        const musicFilename = result.data?.background_music_filename;
        
        if (musicFilename) {
          const musicUrl = `${API_URL}/events/audio/${musicFilename}`;
          console.log('Setting background music URL:', musicUrl);
          setBackgroundMusicUrl(musicUrl);
        } else {
          console.log('No background music filename found in settings');
          console.log('Available keys in result.data:', result.data ? Object.keys(result.data) : 'result.data is null');
          setBackgroundMusicUrl(null);
        }
      } else {
        console.error('Failed to fetch poster settings:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (err) {
      console.error('Error loading background music:', err);
      setBackgroundMusicUrl(null);
    }
  };

  useEffect(() => {
    // Set up auto-refresh every 3 minutes (180000 ms)
    refreshIntervalRef.current = setInterval(() => {
      fetchAllPhotos();
      fetchBackgroundMusic();
    }, 180000); // 3 minutes

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Handle audio playback when music URL changes
    if (audioRef.current && backgroundMusicUrl) {
      audioRef.current.load(); // Reload the audio source
      if (!isMusicMuted) {
        // Try to play, but handle autoplay restrictions
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Error playing background music (autoplay may be blocked):', err);
            // If autoplay is blocked, we'll need user interaction
          });
        }
      }
    }
  }, [backgroundMusicUrl]);

  useEffect(() => {
    // Handle mute/unmute
    if (audioRef.current) {
      if (isMusicMuted) {
        audioRef.current.pause();
      } else if (backgroundMusicUrl && !isPaused) {
        // Only play if not muted, music is available, and slideshow is not paused
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Error playing background music:', err);
          });
        }
      }
    }
  }, [isMusicMuted, backgroundMusicUrl, isPaused]);

  useEffect(() => {
    // Sync music with slideshow pause/resume
    if (audioRef.current && backgroundMusicUrl && !isMusicMuted) {
      if (isPaused) {
        // Pause music when slideshow is paused
        audioRef.current.pause();
      } else {
        // Resume music when slideshow is resumed
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.error('Error resuming background music:', err);
          });
        }
      }
    }
  }, [isPaused, backgroundMusicUrl, isMusicMuted]);

  useEffect(() => {
    // Auto-advance slideshow every 5 seconds if not paused and photos exist
    if (!isPaused && photos.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      }, 5000); // 5 seconds per image
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, photos.length]);

  const fetchAllPhotos = async () => {
    try {
      setLoading(true);
      // Fetch all photos without user_id filter, filter only images
      const response = await fetch(`${API_URL}/upload/photos`);
      if (!response.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await response.json();
      // Filter out videos, only show images
      const imagePhotos = (data.photos || []).filter((photo: Photo) => !photo.is_video);
      setPhotos(imagePhotos);
      
      // Reset to first image if current index is out of bounds
      if (currentIndex >= imagePhotos.length) {
        setCurrentIndex(0);
      }
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (photo: Photo): string => {
    return `${API_URL}${photo.url}`;
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);
    
    // Sync music with slideshow pause/resume
    if (audioRef.current && backgroundMusicUrl && !isMusicMuted) {
      if (newPausedState) {
        // Pause music when slideshow is paused
        audioRef.current.pause();
      } else {
        // Resume music when slideshow is resumed
        audioRef.current.play().catch(err => {
          console.log('Music play on resume:', err);
        });
      }
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).mozRequestFullScreen) {
          await (containerRef.current as any).mozRequestFullScreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          await (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      goToNext();
    } else if (e.key === ' ') {
      e.preventDefault();
      togglePause();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [photos.length]);

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

  if (loading && photos.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '24px', marginBottom: '20px' }}>Loading slideshow...</p>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error && photos.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>Error Loading Slideshow</h1>
          <p style={{ fontSize: '18px', marginBottom: '30px', color: '#ccc' }}>{error}</p>
          <button 
            onClick={fetchAllPhotos}
            style={{
              padding: '12px 24px',
              backgroundColor: '#C5BE77',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '20px' }}>No Images Available</h1>
          <p style={{ fontSize: '18px', color: '#ccc', marginBottom: '30px' }}>
            Upload some images to start the slideshow
          </p>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: '#C5BE77',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Go to Home Page
          </Link>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div 
      ref={containerRef}
      style={{ 
        minHeight: '100vh', 
        backgroundColor: '#000', 
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Header with controls - hidden in fullscreen */}
      {!isFullscreen && (
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {!isAdmin && (
            <Link 
              href="/"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  setAllowedNavigation('index');
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: '14px',
                backdropFilter: 'blur(10px)',
                fontWeight: '500'
              }}
            >
              ← Back to Home
            </Link>
          )}
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size={60} showText={true} style={{ filter: 'brightness(0) invert(1)' }} />
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ color: 'white', fontSize: '14px' }}>
            {currentIndex + 1} / {photos.length}
          </span>
          <button
            onClick={togglePause}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
              fontWeight: '500'
            }}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>
          <button
            onClick={() => {
              if (backgroundMusicUrl) {
                setIsMusicMuted(!isMusicMuted);
                // Try to play on click (user interaction)
                if (audioRef.current) {
                  if (isMusicMuted) {
                    // Unmuting - try to play
                    audioRef.current.play().catch(err => {
                      console.error('Error playing music on unmute:', err);
                    });
                  } else {
                    // Muting - pause
                    audioRef.current.pause();
                  }
                }
              } else {
                // Refresh music and show alert
                fetchBackgroundMusic();
                alert('No background music detected. If you just uploaded music, it may take a moment to load. Click this button again to refresh.');
              }
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: backgroundMusicUrl 
                ? (isMusicMuted ? 'rgba(255,0,0,0.3)' : 'rgba(0,255,0,0.3)')
                : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
              fontWeight: '500',
              minWidth: '140px'
            }}
            title={backgroundMusicUrl ? (isMusicMuted ? 'Click to unmute music' : 'Click to mute music') : 'No music uploaded - go to Poster Settings to upload. Click to refresh.'}
          >
            {backgroundMusicUrl 
              ? (isMusicMuted ? '🔇 Unmute Music' : '🔊 Mute Music')
              : '🎵 No Music'}
          </button>
          <button
            onClick={toggleFullscreen}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              backdropFilter: 'blur(10px)',
              fontWeight: '500'
            }}
          >
            {isFullscreen ? '⤓ Exit Fullscreen' : '⛶ Fullscreen'}
          </button>
          {isAdmin && (
            <Link 
              href="/all-photos"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  setAllowedNavigation('index');
                }
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                fontSize: '14px',
                backdropFilter: 'blur(10px)',
                fontWeight: '500'
              }}
            >
              View All Photos
            </Link>
          )}
        </div>
      </div>
      )}

      {/* Main image display */}
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <img
          ref={imageRef}
          key={currentPhoto.id}
          src={getImageUrl(currentPhoto)}
          alt={currentPhoto.filename}
          style={{
            maxWidth: '95%',
            maxHeight: '95vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            opacity: loading ? 0 : 1,
            transition: 'opacity 0.5s ease-in-out'
          }}
          onLoad={() => setLoading(false)}
          onError={(e) => {
            console.error('Error loading image:', currentPhoto.filename);
            // Skip to next image on error
            setTimeout(() => goToNext(), 1000);
          }}
        />
      </div>

      {/* Navigation arrows - hidden in fullscreen */}
      {!isFullscreen && (
        <>
          <button
            onClick={goToPrevious}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              zIndex: 50,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
          >
            ‹
          </button>
          <button
            onClick={goToNext}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              fontSize: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              zIndex: 50,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)';
            }}
          >
            ›
          </button>
        </>
      )}

      {/* Bottom controls and thumbnail strip - hidden in fullscreen */}
      {!isFullscreen && (
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
        padding: '20px'
      }}>
        {/* Thumbnail strip */}
        <div style={{
          display: 'flex',
          gap: '10px',
          overflowX: 'auto',
          padding: '10px 0',
          justifyContent: 'center',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.3) transparent'
        }}>
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              onClick={() => goToSlide(index)}
              style={{
                minWidth: '80px',
                height: '60px',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: index === currentIndex ? '3px solid #C5BE77' : '2px solid transparent',
                opacity: index === currentIndex ? 1 : 0.7,
                transition: 'all 0.3s',
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

        {/* Image info */}
        <div style={{
          textAlign: 'center',
          color: 'white',
          marginTop: '15px'
        }}>
          <p style={{ 
            margin: '5px 0', 
            fontSize: '16px',
            fontWeight: '500'
          }}>
            {currentPhoto.filename}
          </p>
          <p style={{ 
            margin: '5px 0', 
            fontSize: '12px',
            opacity: 0.8
          }}>
            Auto-refreshing every 3 minutes • Use arrow keys to navigate • Space to pause/resume • F for fullscreen
          </p>
        </div>
      </div>
      )}

      {/* Progress indicator - hidden in fullscreen */}
      {!isPaused && !isFullscreen && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          height: '4px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          zIndex: 101
        }}>
          <div style={{
            height: '100%',
            width: '100%',
            backgroundColor: '#C5BE77',
            animation: 'progress 5s linear',
            transformOrigin: 'left'
          }}></div>
        </div>
      )}

      {/* Background Music Player (hidden) */}
      {backgroundMusicUrl && (
        <audio
          ref={audioRef}
          src={backgroundMusicUrl}
          loop
          preload="auto"
          style={{ display: 'none' }}
          onError={(e) => {
            console.error('Error loading background music:', e);
            console.error('Music URL was:', backgroundMusicUrl);
            alert('Error loading background music. Please check the file in Poster Settings.');
            setBackgroundMusicUrl(null);
          }}
          onLoadedData={() => {
            console.log('Audio loaded, attempting to play');
            // Try to play when audio is loaded
            if (audioRef.current && !isMusicMuted) {
              audioRef.current.play().catch(err => {
                console.log('Autoplay blocked, waiting for user interaction:', err);
              });
            }
          }}
          onCanPlay={() => {
            console.log('Audio can play, attempting to play');
            // Also try on canPlay event
            if (audioRef.current && !isMusicMuted) {
              audioRef.current.play().catch(err => {
                console.log('Autoplay blocked:', err);
              });
            }
          }}
          onPlay={() => {
            console.log('Music is now playing');
          }}
          onPause={() => {
            console.log('Music is paused');
          }}
        />
      )}

      <style jsx>{`
        @keyframes progress {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}

