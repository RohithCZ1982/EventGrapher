import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { isAdminAuthenticated, authenticateAdmin, setAllowedNavigation } from '../utils/auth';
import Logo from '../components/Logo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PosterSettings {
  poster_heading: string | null;
  background_image_filename: string | null;
  background_music_filename: string | null;
}

export default function PosterSettings() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [posterHeading, setPosterHeading] = useState('');
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<File | null>(null);
  const [backgroundPreviewUrl, setBackgroundPreviewUrl] = useState<string | null>(null);
  const [existingBackgroundImageUrl, setExistingBackgroundImageUrl] = useState<string | null>(null);
  const [selectedBackgroundMusic, setSelectedBackgroundMusic] = useState<File | null>(null);
  const [existingBackgroundMusicUrl, setExistingBackgroundMusicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    if (typeof window !== 'undefined') {
      const authStatus = isAdminAuthenticated();
      setIsAuthenticated(authStatus);
      if (authStatus) {
        loadExistingSettings();
      }
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    
    if (authenticateAdmin(password)) {
      setIsAuthenticated(true);
      loadExistingSettings();
    } else {
      setPasswordError('Incorrect password. Please try again.');
      setPassword('');
    }
  };

  const loadExistingSettings = async () => {
    try {
      setLoadingExisting(true);
      const response = await fetch(`${API_URL}/events/poster-settings`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setPosterHeading(result.data.poster_heading || 'Our Memories');
          if (result.data.background_image_filename) {
            setExistingBackgroundImageUrl(`${API_URL}/events/image/${result.data.background_image_filename}`);
          }
          if (result.data.background_music_filename) {
            setExistingBackgroundMusicUrl(`${API_URL}/events/audio/${result.data.background_music_filename}`);
          }
        }
      }
    } catch (err) {
      console.error('Error loading poster settings:', err);
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleBackgroundImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedBackgroundImage(file);
      setExistingBackgroundImageUrl(null); // Clear existing image preview
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundMusicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log('Music file selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      setSelectedBackgroundMusic(file);
      setExistingBackgroundMusicUrl(null); // Clear existing music URL
    } else {
      console.log('No music file selected');
      setSelectedBackgroundMusic(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('poster_heading', posterHeading || 'Our Memories');
      if (selectedBackgroundImage) {
        formData.append('background_image', selectedBackgroundImage);
        console.log('Adding background image to form:', selectedBackgroundImage.name);
      }
      if (selectedBackgroundMusic) {
        formData.append('background_music', selectedBackgroundMusic);
        console.log('Adding background music to form:', selectedBackgroundMusic.name, 'Size:', selectedBackgroundMusic.size, 'bytes');
      } else {
        console.log('No background music file selected');
      }

      // Log form data contents (for debugging)
      console.log('FormData contents:');
      console.log('  poster_heading:', posterHeading || 'Our Memories');
      console.log('  background_image:', selectedBackgroundImage ? `File(${selectedBackgroundImage.name}, ${selectedBackgroundImage.size} bytes)` : 'none');
      console.log('  background_music:', selectedBackgroundMusic ? `File(${selectedBackgroundMusic.name}, ${selectedBackgroundMusic.size} bytes)` : 'none');

      const response = await fetch(`${API_URL}/events/poster-settings`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to save poster settings');
      }

      const result = await response.json();
      console.log('Poster settings save response:', result);
      setSuccess(true);
      setSelectedBackgroundImage(null);
      setBackgroundPreviewUrl(null);
      setSelectedBackgroundMusic(null);
      
      // Reload to get updated image and music URLs
      await loadExistingSettings();
      
      // Log the loaded settings to verify music was saved
      const verifyResponse = await fetch(`${API_URL}/events/poster-settings`);
      if (verifyResponse.ok) {
        const verifyResult = await verifyResponse.json();
        console.log('Verification - Poster settings after save:', verifyResult);
        if (verifyResult.data) {
          console.log('Music filename in saved data:', verifyResult.data.background_music_filename);
        }
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const displayImageUrl = backgroundPreviewUrl || existingBackgroundImageUrl;

  // Show password form if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#C5BE77',
        padding: '40px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          maxWidth: '400px', 
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#333',
            marginBottom: '10px',
            textAlign: 'center'
          }}>
            Poster Settings
          </h1>
          <p style={{ 
            fontSize: '14px', 
            color: '#666',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            Please enter the admin password to access poster settings
          </p>
          
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..."
              required
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '16px',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                outline: 'none',
                transition: 'all 0.3s',
                boxSizing: 'border-box',
                marginBottom: '20px'
              }}
              onFocus={(e) => e.target.style.borderColor = '#C5BE77'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
            
            {passwordError && (
              <div style={{
                backgroundColor: '#fee',
                color: '#c33',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '14px'
              }}>
                {passwordError}
              </div>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                backgroundColor: '#C5BE77',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              Access Poster Settings
            </button>
          </form>
          
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#C5BE77',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
          color: 'white'
        }}>
          <div style={{ marginBottom: '20px' }}>
            <Logo size={100} showText={true} style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }} />
          </div>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: '700', 
            margin: '0 0 10px 0',
            textShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            Poster Settings
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9 }}>
            Customize your poster appearance
          </p>
        </div>

        {/* Navigation */}
        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <Link 
            href="/admin" 
            onClick={() => {
              if (typeof window !== 'undefined') {
                setAllowedNavigation('admin');
              }
            }}
            style={{
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
            Admin Panel
          </Link>
          <Link 
            href="/all-photos" 
            onClick={() => {
              if (typeof window !== 'undefined') {
                setAllowedNavigation('admin');
              }
            }}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '8px',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.3)',
              transition: 'all 0.3s'
            }}>
            View All Photos
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
              <p style={{ color: '#666' }}>Loading poster settings...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Poster Heading */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Poster Heading *
                </label>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  This text will appear at the top of generated posters
                </p>
                <input
                  type="text"
                  value={posterHeading}
                  onChange={(e) => setPosterHeading(e.target.value)}
                  required
                  placeholder="Enter poster heading (e.g., Our Memories, Make it happen)"
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
                  onFocus={(e) => e.target.style.borderColor = '#C5BE77'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              {/* Background Image Upload */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Background Image
                </label>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  This image will be used as the background when creating posters from the All Photos page
                </p>
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
                    onChange={handleBackgroundImageChange}
                    id="background-image-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="background-image-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    {displayImageUrl ? (
                      <div>
                        <img
                          src={displayImageUrl}
                          alt="Background preview"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '300px',
                            borderRadius: '12px',
                            marginBottom: '15px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                          }}
                        />
                        <p style={{ color: '#666', margin: 0 }}>
                          Click to change background image
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🖼️</div>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          Click to upload a background image
                        </p>
                        <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Background Music Upload */}
              <div style={{ marginBottom: '30px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#333',
                  marginBottom: '10px'
                }}>
                  Background Music (for Slideshow)
                </label>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                  Upload an audio file to play as background music during the slideshow
                </p>
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
                    accept="audio/*"
                    onChange={handleBackgroundMusicChange}
                    id="background-music-upload"
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="background-music-upload"
                    style={{
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    {existingBackgroundMusicUrl ? (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          Current: {existingBackgroundMusicUrl.split('/').pop()}
                        </p>
                        <audio
                          controls
                          src={existingBackgroundMusicUrl}
                          style={{
                            width: '100%',
                            maxWidth: '400px',
                            margin: '15px auto',
                            display: 'block'
                          }}
                        />
                        <p style={{ color: '#666', margin: '5px 0', fontSize: '14px' }}>
                          Click to change background music
                        </p>
                        <p style={{ color: '#999', fontSize: '12px', margin: '5px 0' }}>
                          MP3, WAV, OGG, M4A, AAC up to 10MB
                        </p>
                      </div>
                    ) : selectedBackgroundMusic ? (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          Selected: {selectedBackgroundMusic.name}
                        </p>
                        <p style={{ color: '#999', fontSize: '12px', margin: '5px 0' }}>
                          Click to change or upload a different file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎵</div>
                        <p style={{ color: '#666', margin: '5px 0' }}>
                          Click to upload background music
                        </p>
                        <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>
                          MP3, WAV, OGG, M4A, AAC up to 10MB
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
                  ✓ Poster settings saved successfully!
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
                  backgroundColor: loading ? '#ccc' : '#C5BE77',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                {loading ? 'Saving...' : 'Save Poster Settings'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

