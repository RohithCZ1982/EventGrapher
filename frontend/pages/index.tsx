import { useState, useEffect } from 'react';
import Link from 'next/link';

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

  const downloadImage = async (photoUrl: string, filename: string) => {
    try {
      const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${API_URL}${photoUrl}`;
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download photo:', err);
    }
  };

  const downloadAllUploaded = async () => {
    if (uploadResults.length === 0) return;
    
    for (const result of uploadResults) {
      await downloadImage(result.url, result.filename || result.original_filename);
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 100));
    }
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
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

        {/* Upload Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#333' }}>Upload Photos</h2>
            <Link href="/gallery" style={{
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
              accept="image/*"
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
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '5px' }}>
                {files.length > 0 
                  ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                  : 'Click to select photos or drag and drop'
                }
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Supports JPG, PNG, GIF, WebP
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
              padding: '15px',
              borderRadius: '4px',
              marginBottom: '20px',
              border: '1px solid #cfc'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontWeight: '600' }}>
                  ✓ Successfully uploaded {uploadResults.length} file{uploadResults.length > 1 ? 's' : ''}!
                </p>
                <button
                  onClick={downloadAllUploaded}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Download All
                </button>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {uploadResults.map((result, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: 'white',
                      padding: '6px 10px',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: '#666' }}>
                      {result.original_filename || result.filename}
                    </span>
                    <button
                      onClick={() => downloadImage(result.url, result.filename || result.original_filename)}
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                      title="Download this photo"
                    >
                      ⬇
                    </button>
                  </div>
                ))}
              </div>
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
            {uploading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Photos'}`}
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
          Version 1.0.1
        </div>
      </div>
    </div>
  );
}
