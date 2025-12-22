import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface EventData {
  event_name: string;
  welcome_message: string;
  image_filename: string | null;
  updated_at?: string;
}

export default function Admin() {
  const [eventName, setEventName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    loadExistingEvent();
  }, []);

  const loadExistingEvent = async () => {
    try {
      setLoadingExisting(true);
      const response = await fetch(`${API_URL}/events/`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setEventName(result.data.event_name || '');
          setWelcomeMessage(result.data.welcome_message || '');
          if (result.data.image_filename) {
            setExistingImageUrl(`${API_URL}/events/image/${result.data.image_filename}`);
          }
        }
      }
    } catch (err) {
      console.error('Error loading event:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setExistingImageUrl(null); // Clear existing image preview
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('event_name', eventName);
      formData.append('welcome_message', welcomeMessage);
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_URL}/events/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to save event');
      }

      const result = await response.json();
      setSuccess(true);
      setSelectedImage(null);
      setPreviewUrl(null);
      
      // Reload to get updated image URL
      await loadExistingEvent();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const displayImageUrl = previewUrl || existingImageUrl;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: 'white'
        }}>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            margin: '0 0 10px 0',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            Event Admin Panel
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>
            Manage your event information
          </p>
        </div>

        {/* Navigation */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <Link href="/" style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            marginRight: '10px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)',
            transition: 'all 0.3s'
          }}>
            ← Back to Home
          </Link>
          <Link href="/gallery" style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.3)'
          }}>
            View Gallery
          </Link>
        </div>

        {/* Form Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          {loadingExisting ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#666' }}>Loading event data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Event Name */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  placeholder="Enter event name..."
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              {/* Welcome Message */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Welcome Message *
                </label>
                <textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  required
                  placeholder="Enter a welcome message for your event..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '12px',
                    outline: 'none',
                    transition: 'all 0.3s',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              {/* Image Upload */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Event Image
                </label>
                <div style={{
                  border: '2px dashed #e0e0e0',
                  borderRadius: '12px',
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: '#fafafa',
                  transition: 'all 0.3s'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    id="image-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    {displayImageUrl ? (
                      <div>
                        <img
                          src={displayImageUrl}
                          alt="Event preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '12px',
                            marginBottom: '15px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                        <p style={{ color: '#666', margin: 0 }}>
                          Click to change image
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📷</div>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          Click to upload an image
                        </p>
                        <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  backgroundColor: '#fee',
                  color: '#c33',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  border: '1px solid #fcc'
                }}>
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div style={{
                  backgroundColor: '#efe',
                  color: '#3c3',
                  padding: '15px',
                  borderRadius: '10px',
                  marginBottom: '20px',
                  border: '1px solid #cfc'
                }}>
                  ✓ Event information saved successfully!
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  background: loading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {loading ? 'Saving...' : 'Save Event Information'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

