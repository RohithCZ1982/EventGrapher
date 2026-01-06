import { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { setAllowedNavigation } from '../utils/auth';
import Logo from '../components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EventData {
  event_name: string;
  welcome_message: string;
  image_filename: string | null;
  updated_at?: string;
}

// Get or create user ID (stored in localStorage)
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

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  
  // Sticky note states
  const [stickyName, setStickyName] = useState('');
  const [stickyMessage, setStickyMessage] = useState('');
  const [stickyColor, setStickyColor] = useState('#FFEB3B'); // Default yellow
  const [uploadingSticky, setUploadingSticky] = useState(false);

  useEffect(() => {
    fetchEventData();
  }, []);

  const fetchEventData = async () => {
    try {
      setLoadingEvent(true);
      const response = await fetch(`${API_URL}/events/`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setEventData(result.data);
        }
      }
    } catch (err) {
      console.error('Error loading event data:', err);
    } finally {
      setLoadingEvent(false);
    }
  };

  const getEventImageUrl = (imageFilename: string | null): string | null => {
    if (!imageFilename) return null;
    return `${API_URL}/events/image/${imageFilename}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadResults([]);

    try {
      const userId = getUserID();
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId);

        const response = await fetch(`${API_URL}/upload/`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ detail: response.statusText }));
          throw new Error(errorData.detail || `Failed to upload ${file.name}: ${response.statusText}`);
        }

        return response.json();
      });

      const results = await Promise.all(uploadPromises);
      setUploadResults(results);
      setFiles([]);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const loadHandwrittenFont = async (): Promise<void> => {
    return new Promise((resolve) => {
      // Check if font is already loaded
      if (document.fonts && document.fonts.check('24px Caveat')) {
        resolve();
        return;
      }

      // Wait for fonts to be ready
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // Give it a small delay to ensure font is fully loaded
          setTimeout(() => resolve(), 100);
        }).catch(() => {
          // If font loading fails, continue with fallback
          resolve();
        });
      } else {
        // Fallback: wait a bit for the font to load from the link tag
        setTimeout(() => resolve(), 500);
      }
    });
  };

  const generateStickyNoteImage = async (): Promise<File> => {
    return new Promise(async (resolve, reject) => {
      // Load handwritten font first
      await loadHandwrittenFont();

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Set canvas size (sticky note dimensions)
      const width = 400;
      const height = 300;
      canvas.width = width;
      canvas.height = height;

      // Draw sticky note background with color
      ctx.fillStyle = stickyColor;
      ctx.fillRect(0, 0, width, height);

      // Add subtle shadow effect
      ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Draw border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, width, height);

      // Reset shadow for text
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Configure text styles with handwritten font
      ctx.fillStyle = '#333';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      // Draw message text at the top with handwritten font
      const padding = 30;
      const maxWidth = width - (padding * 2);
      // Use handwritten font with fallback
      ctx.font = 'bold 22px "Caveat", "Comic Sans MS", "Brush Script MT", cursive';
      
      // Word wrap for message
      const words = stickyMessage.split(' ');
      let line = '';
      let y = padding;
      const lineHeight = 32;

      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, padding, y);
          line = words[i] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, padding, y);

      // Draw "from, Name" at bottom right with handwritten font
      // First measure the name to position "from, " correctly
      ctx.font = 'bold italic 18px "Caveat", "Comic Sans MS", "Brush Script MT", cursive';
      const nameWidth = ctx.measureText(stickyName).width;
      
      // Draw "from, " in italic (positioned before the name)
      ctx.font = 'italic 18px "Caveat", "Comic Sans MS", "Brush Script MT", cursive';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = '#666';
      const fromPrefix = 'from, ';
      const fromPrefixX = width - padding - nameWidth;
      ctx.fillText(fromPrefix, fromPrefixX, height - padding);
      
      // Draw Name in bold (positioned at the right edge)
      ctx.font = 'bold italic 18px "Caveat", "Comic Sans MS", "Brush Script MT", cursive';
      ctx.fillStyle = '#333';
      ctx.fillText(stickyName, width - padding, height - padding);

      // Convert canvas to blob and then to File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'sticky-note.png', { type: 'image/png' });
          resolve(file);
        } else {
          reject(new Error('Failed to generate image'));
        }
      }, 'image/png');
    });
  };

  const handleStickyNoteUpload = async () => {
    if (!stickyName.trim() || !stickyMessage.trim()) {
      setError('Please enter both Name and Message');
      return;
    }

    setUploadingSticky(true);
    setError(null);

    try {
      // Generate sticky note image
      const stickyImageFile = await generateStickyNoteImage();

      // Upload the image
      const userId = getUserID();
      const formData = new FormData();
      formData.append('file', stickyImageFile);
      formData.append('user_id', userId);

      const response = await fetch(`${API_URL}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || `Failed to upload sticky note: ${response.statusText}`);
      }

      const result = await response.json();
      setUploadResults([result]);
      
      // Reset form
      setStickyName('');
      setStickyMessage('');
      setStickyColor('#FFEB3B');
    } catch (err) {
      console.error('Sticky note upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setUploadingSticky(false);
    }
  };

  return (
    <>
      <Head>
        <title>EventGrapher - Capture Your Event Memories</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Logo Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Logo size={100} showText={true} />
          </Link>
        </div>
        
        {/* Event Header Section */}
        {!loadingEvent && eventData && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '40px',
            marginBottom: '30px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h1 style={{
              margin: '0 0 30px 0',
              fontSize: '42px',
              fontWeight: '700',
              color: '#C5BE77'
            }}>
              {eventData.event_name}
            </h1>
            {eventData.image_filename && getEventImageUrl(eventData.image_filename) && (
              <div style={{ marginBottom: '30px' }}>
                <img
                  src={getEventImageUrl(eventData.image_filename)!}
                  alt={eventData.event_name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '400px',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    objectFit: 'contain'
                  }}
                />
              </div>
            )}
            {eventData.welcome_message && (
              <p style={{
                margin: '0',
                fontSize: '20px',
                color: '#555',
                lineHeight: '1.6',
                fontStyle: 'italic'
              }}>
                {eventData.welcome_message}
              </p>
            )}
          </div>
        )}

        {/* Sticky Note Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          marginBottom: '30px'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#333' }}>Create Sticky Note</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
              Your Name
            </label>
            <input
              type="text"
              value={stickyName}
              onChange={(e) => setStickyName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
              Message
            </label>
            <textarea
              value={stickyMessage}
              onChange={(e) => setStickyMessage(e.target.value)}
              placeholder="Enter your message"
              rows={5}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#555' }}>
              Sticky Note Color
            </label>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => setStickyColor('#FFEB3B')}
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#FFEB3B',
                  border: stickyColor === '#FFEB3B' ? '4px solid #333' : '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: stickyColor === '#FFEB3B' ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
                title="Yellow"
              />
              <button
                onClick={() => setStickyColor('#FFC1CC')}
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#FFC1CC',
                  border: stickyColor === '#FFC1CC' ? '4px solid #333' : '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: stickyColor === '#FFC1CC' ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
                title="Pink"
              />
              <button
                onClick={() => setStickyColor('#B3E5FC')}
                style={{
                  width: '80px',
                  height: '80px',
                  backgroundColor: '#B3E5FC',
                  border: stickyColor === '#B3E5FC' ? '4px solid #333' : '2px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: stickyColor === '#B3E5FC' ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.2s'
                }}
                title="Blue"
              />
            </div>
          </div>

          <button
            onClick={handleStickyNoteUpload}
            disabled={!stickyName.trim() || !stickyMessage.trim() || uploadingSticky}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: (stickyName.trim() && stickyMessage.trim() && !uploadingSticky) ? '#C5BE77' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (stickyName.trim() && stickyMessage.trim() && !uploadingSticky) ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            {uploadingSticky ? 'Creating Sticky Note...' : 'Create Sticky Note'}
          </button>
        </div>

        {/* Upload Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Upload Photos & Videos</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Link 
                href="/slideshow" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    setAllowedNavigation('index');
                  }
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '5px',
                  fontWeight: '500',
                  fontSize: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
              >
                📺 Slideshow →
              </Link>
              <Link 
                href="/gallery" 
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
                  fontSize: '16px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b5ae67'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#C5BE77'}
              >
                View My Photos →
              </Link>
            </div>
          </div>

          <div style={{
            border: '2px dashed #ddd',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#fafafa',
            marginBottom: '20px'
          }}>
            <input
              id="file-input"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="file-input"
              style={{
                cursor: 'pointer',
                display: 'block'
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷🎥</div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '5px' }}>
                {files.length > 0 
                  ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                  : 'Click to select photos/videos or drag and drop'
                }
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Supports JPG, PNG, GIF, WebP, MP4, MOV, AVI, WebM
              </div>
            </label>
          </div>

          {files.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>Selected Files:</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {files.map((file, index) => (
                  <li key={index} style={{
                    padding: '8px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    marginBottom: '5px',
                    fontSize: '14px'
                  }}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <div style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #fcc'
            }}>
              {error}
            </div>
          )}

          {uploadResults.length > 0 && (
            <div style={{
              backgroundColor: '#efe',
              color: '#3c3',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #cfc'
            }}>
              Successfully uploaded {uploadResults.length} file{uploadResults.length > 1 ? 's' : ''}!
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              backgroundColor: files.length > 0 && !uploading ? '#C5BE77' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: files.length > 0 && !uploading ? 'pointer' : 'not-allowed',
              fontWeight: '500'
            }}
          >
            {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Files'}`}
          </button>
        </div>

        {/* Version Number */}
        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '20px',
          color: '#999',
          fontSize: '12px'
        }}>
          Version 1.0.4
        </div>
      </div>
    </div>
    </>
  );
}
