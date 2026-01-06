import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isNavigationAllowed, setAllowedNavigation } from '../utils/auth';
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
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);

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
        // Limit to 10 images
        if (newSet.size >= 10) {
          alert('You can select up to 10 images for the poster.');
          return prev;
        }
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const selectAllPhotos = () => {
    // Limit to first 10 photos
    const photosToSelect = photos.slice(0, 10).map(p => p.id);
    setSelectedPhotoIds(new Set(photosToSelect));
  };

  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  const createPoster = async () => {
    if (selectedPhotoIds.size === 0 || selectedPhotoIds.size > 10) {
      alert('Please select 1-10 images to create a poster.');
      return;
    }

    setIsGeneratingPoster(true);
    try {
      const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));
      
      // Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas size (standard poster size)
      canvas.width = 2000;
      canvas.height = 2400;

      // Fetch poster settings to get background image and heading
      let backgroundImage: HTMLImageElement | null = null;
      let posterHeading = 'Our Memories'; // Default heading
      try {
        const settingsResponse = await fetch(`${API_URL}/events/poster-settings`);
        if (settingsResponse.ok) {
          const settingsResult = await settingsResponse.json();
          if (settingsResult.data) {
            posterHeading = settingsResult.data.poster_heading || 'Our Memories';
            if (settingsResult.data.background_image_filename) {
              const bgImg = new Image();
              bgImg.crossOrigin = 'anonymous';
              await new Promise((resolve, reject) => {
                bgImg.onload = resolve;
                bgImg.onerror = reject;
                bgImg.src = `${API_URL}/events/image/${settingsResult.data.background_image_filename}`;
              });
              backgroundImage = bgImg;
            }
          }
        }
      } catch (err) {
        console.log('Could not load poster settings, using defaults:', err);
      }

      // Draw background (image or solid color)
      if (backgroundImage) {
        // Draw background image to fill canvas
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        // Add slight overlay for better text visibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        // Default background color (warm orange/brown)
        ctx.fillStyle = '#E8A87C';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Add title with elegant script-like style (darker and bolder)
      // Use a darker color for better visibility
      ctx.fillStyle = '#1a1a1a'; // Very dark gray, almost black
      // Try to use a script font, fallback to available fonts with extra bold weight
      ctx.font = '900 130px "Brush Script MT", "Lucida Handwriting", "Comic Sans MS", "Marker Felt", cursive, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Stronger shadow for better contrast
      ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillText(posterHeading, canvas.width / 2, 140);
      // Draw text again with slight offset for extra boldness
      ctx.fillStyle = '#000000'; // Pure black for the second pass
      ctx.fillText(posterHeading, canvas.width / 2, 140);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Load and draw images
      const imagePromises = selectedPhotos.map((photo, index) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = (err) => {
            console.error('Error loading image:', photo.filename, err);
            // Create a placeholder image if loading fails
            const placeholder = new Image();
            placeholder.onload = () => resolve(placeholder);
            placeholder.onerror = reject;
            // Create a simple colored placeholder
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#CCCCCC';
              ctx.fillRect(0, 0, 400, 400);
              ctx.fillStyle = '#666666';
              ctx.font = '30px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Image', 200, 200);
              placeholder.src = canvas.toDataURL();
            } else {
              reject(new Error('Could not create placeholder'));
            }
          };
          img.src = getImageUrl(photo);
        });
      });

      const loadedImages = await Promise.all(imagePromises);

      // Calculate grid layout based on number of images
      const numImages = loadedImages.length;
      let cols = 2;
      let rows = 2;
      
      if (numImages <= 4) {
        cols = 2;
        rows = 2;
      } else if (numImages <= 6) {
        cols = 3;
        rows = 2;
      } else if (numImages <= 9) {
        cols = 3;
        rows = 3;
      } else {
        cols = 4;
        rows = 3;
      }

      const polaroidWidth = (canvas.width - 300) / cols;
      const polaroidHeight = polaroidWidth * 1.25; // Polaroid aspect ratio
      const spacing = 60;
      const startY = 250;
      const startX = (canvas.width - (cols * polaroidWidth + (cols - 1) * spacing)) / 2;

      // Draw polaroid photos with random rotations
      loadedImages.forEach((img, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        
        // Base position
        const baseX = startX + col * (polaroidWidth + spacing);
        const baseY = startY + row * (polaroidHeight + spacing);
        
        // Random rotation angle (between -15 and 15 degrees)
        const rotation = (Math.random() - 0.5) * 30 * (Math.PI / 180);
        
        // Center point for rotation
        const centerX = baseX + polaroidWidth / 2;
        const centerY = baseY + polaroidHeight / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.translate(-polaroidWidth / 2, -polaroidHeight / 2);
        
        const x = 0;
        const y = 0;

        // Draw shadow effect first (behind, with rotation)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(x + 10, y + 10, polaroidWidth, polaroidHeight);

        // Draw white polaroid frame
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, polaroidWidth, polaroidHeight);
        
        // Add subtle border
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, polaroidWidth, polaroidHeight);

        // Calculate image area (with padding)
        const imagePadding = 20;
        const imageAreaWidth = polaroidWidth - imagePadding * 2;
        const imageAreaHeight = polaroidHeight - imagePadding * 2 - 60; // Space for bottom border

        // Calculate scaling to fit image in polaroid
        const imgAspect = img.width / img.height;
        const areaAspect = imageAreaWidth / imageAreaHeight;
        
        let drawWidth = imageAreaWidth;
        let drawHeight = imageAreaHeight;
        let drawX = x + imagePadding;
        let drawY = y + imagePadding;

        if (imgAspect > areaAspect) {
          // Image is wider - fit to width
          drawHeight = imageAreaWidth / imgAspect;
          drawY = y + imagePadding + (imageAreaHeight - drawHeight) / 2;
        } else {
          // Image is taller - fit to height
          drawWidth = imageAreaHeight * imgAspect;
          drawX = x + imagePadding + (imageAreaWidth - drawWidth) / 2;
        }

        // Draw image
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        // Draw decorative paperclip on some polaroids
        if (index % 3 === 0) {
          ctx.save();
          ctx.translate(x + polaroidWidth - 25, y + 15);
          ctx.strokeStyle = '#CCCCCC';
          ctx.fillStyle = '#CCCCCC';
          ctx.lineWidth = 2;
          // Draw paperclip shape
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(8, 0);
          ctx.arc(8, 4, 4, -Math.PI / 2, Math.PI / 2);
          ctx.lineTo(12, 8);
          ctx.arc(8, 12, 4, Math.PI / 2, -Math.PI / 2);
          ctx.lineTo(0, 16);
          ctx.stroke();
          ctx.restore();
        }
        
        ctx.restore();
      });

      // Add decorative elements scattered around
      // Hearts
      ctx.fillStyle = '#FFB6C1';
      drawHeart(ctx, 120, 600, 35);
      drawHeart(ctx, canvas.width - 120, 900, 30);
      drawHeart(ctx, 180, canvas.height - 180, 25);
      drawHeart(ctx, canvas.width - 200, 1400, 28);

      // Flowers (simple circles with petals)
      drawFlower(ctx, 80, 400, 45, '#FF69B4');
      drawFlower(ctx, canvas.width - 80, 700, 40, '#FF1493');
      drawFlower(ctx, 100, canvas.height - 250, 35, '#FF69B4');
      drawFlower(ctx, canvas.width - 120, 1200, 38, '#FFB6C1');

      // Sticky note
      ctx.save();
      ctx.translate(60, 500);
      ctx.rotate(-0.1); // Slight rotation
      ctx.fillStyle = '#FFFF99';
      ctx.fillRect(0, 0, 130, 110);
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 130, 110);
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Thank', 15, 40);
      ctx.fillText('You!', 15, 70);
      ctx.restore();

      // Books stack
      ctx.save();
      ctx.translate(70, canvas.height - 220);
      ctx.rotate(0.05);
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(0, 0, 65, 85);
      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(5, 5, 65, 85);
      ctx.fillStyle = '#FFE66D';
      ctx.fillRect(10, 10, 65, 85);
      ctx.restore();

      // Pencil
      ctx.save();
      ctx.translate(canvas.width - 150, 400);
      ctx.rotate(0.3);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(0, 0, 8, 60);
      ctx.fillStyle = '#FFA500';
      ctx.fillRect(0, 0, 8, 15);
      ctx.fillStyle = '#C0C0C0';
      ctx.fillRect(0, 55, 8, 5);
      ctx.restore();

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to create poster image');
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `poster-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error creating poster:', error);
      alert('Failed to create poster. Please try again.');
    } finally {
      setIsGeneratingPoster(false);
    }
  };

  // Helper function to draw a heart
  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, size / 4);
    ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, size / 4);
    ctx.bezierCurveTo(-size / 2, size / 2, 0, size, 0, size);
    ctx.bezierCurveTo(0, size, size / 2, size / 2, size / 2, size / 4);
    ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, size / 4);
    ctx.fill();
    ctx.restore();
  };

  // Helper function to draw a flower
  const drawFlower = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    
    // Petals
    ctx.fillStyle = color;
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 8);
      ctx.beginPath();
      ctx.ellipse(0, -size / 2, size / 3, size / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    // Center
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  };

  const handleDownloadSelected = async () => {
    if (selectedPhotoIds.size === 0) return;

    const selectedPhotos = photos.filter(p => selectedPhotoIds.has(p.id));
    
    try {
      // Download each selected image
      for (const photo of selectedPhotos) {
        // Skip videos, only download images
        if (photo.is_video) continue;

        try {
          const imageUrl = getImageUrl(photo);
          const response = await fetch(imageUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch ${photo.filename}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = photo.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error downloading ${photo.filename}:`, err);
          alert(`Failed to download ${photo.filename}. Please try again.`);
        }
      }
    } catch (err) {
      console.error('Error downloading images:', err);
      alert('An error occurred while downloading images. Please try again.');
    }
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
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size={80} showText={true} />
          </Link>
        </div>
        
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
          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center'
          }}>
            {isSelectionMode ? (
              <>
                {selectedPhotoIds.size > 0 && (
                  <button
                    onClick={handleDownloadSelected}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    📥 Download Selected ({selectedPhotoIds.size})
                  </button>
                )}
                {selectedPhotoIds.size > 0 && selectedPhotoIds.size <= 10 && (
                  <button
                    onClick={createPoster}
                    disabled={isGeneratingPoster}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: isGeneratingPoster ? '#ccc' : '#FF6B6B',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: '500',
                      cursor: isGeneratingPoster ? 'not-allowed' : 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    {isGeneratingPoster ? 'Creating Poster...' : `Create Poster (${selectedPhotoIds.size})`}
                  </button>
                )}
                {selectedPhotoIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={deletingPhotoIds.size > 0}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: deletingPhotoIds.size > 0 ? '#ccc' : '#C5BE77',
                      color: 'white',
                      border: 'none',
                      borderRadius: '5px',
                      fontWeight: '500',
                      cursor: deletingPhotoIds.size > 0 ? 'not-allowed' : 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    {deletingPhotoIds.size > 0 ? 'Deleting...' : `Delete Selected (${selectedPhotoIds.size})`}
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedPhotoIds(new Set());
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#C5BE77',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
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
                    padding: '10px 20px',
                    backgroundColor: '#C5BE77',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Select Photos
                </button>
                <Link 
                  href="/slideshow"
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      setAllowedNavigation('index');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#C5BE77',
                    color: 'white',
                    textDecoration: 'none',
                    borderRadius: '5px',
                    fontWeight: '500',
                    marginRight: '10px'
                  }}
                >
                  View Slideshow
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
                {selectedPhotoIds.size} of {Math.min(photos.length, 10)} selected (max 10 for poster)
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
                      disabled={!selectedPhotoIds.has(photo.id) && selectedPhotoIds.size >= 10}
                      style={{
                        width: '24px',
                        height: '24px',
                        cursor: (!selectedPhotoIds.has(photo.id) && selectedPhotoIds.size >= 10) ? 'not-allowed' : 'pointer',
                        accentColor: '#C5BE77',
                        opacity: (!selectedPhotoIds.has(photo.id) && selectedPhotoIds.size >= 10) ? 0.5 : 1
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
  );
}

