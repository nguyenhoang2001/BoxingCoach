import { useState, useEffect } from 'react';
import { userAPI } from '../../services/api';
import styles from './Profile.module.css';

interface ProfileProps {
  onBack?: () => void;
}

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
}

export default function Profile({ onBack }: ProfileProps): JSX.Element {
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    fullName: ''
  });
  
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    id: '',
    email: '',
    fullName: ''
  });

  // Load profile data on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getProfile();
      const userData = response.data.user;
      
      // Map backend field names to frontend (full_name -> fullName)
      const mappedUser = {
        id: userData.id,
        email: userData.email,
        fullName: userData.full_name || userData.fullName || ''
      };
      
      setProfile(mappedUser);
      setEditedProfile(mappedUser);
      
      // Load avatar for this user
      console.log('Loading avatar for user:', mappedUser.id);
      const savedAvatar = localStorage.getItem(`avatar_${mappedUser.id}`);
      if (savedAvatar) {
        console.log('Avatar found in localStorage, loading...');
        setAvatarPreview(savedAvatar);
      } else {
        console.log('No avatar found in localStorage');
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditMode(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    setEditedProfile(profile);
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Validate
      if (!editedProfile.fullName.trim()) {
        setError('Please enter your name');
        return;
      }

      // Update profile
      await userAPI.updateProfile(editedProfile.fullName);
      
      // Reload profile to get updated data
      await loadProfile();
      
      setIsEditMode(false);
      setSuccessMessage('✓ Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to resize/compress image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set maximum dimensions (resize to 200x200 for avatar)
          const maxSize = 200;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with compression (0.7 quality)
          const compressedData = canvas.toDataURL('image/jpeg', 0.7);
          
          setAvatarPreview(compressedData);
          
          // Save compressed avatar to localStorage
          if (profile.id) {
            console.log('Saving avatar for user:', profile.id);
            try {
              localStorage.setItem(`avatar_${profile.id}`, compressedData);
              console.log('Avatar saved to localStorage');
            } catch (error) {
              console.error('Failed to save avatar:', error);
              setError('Image too large. Please choose a smaller image.');
              return;
            }
          } else {
            console.error('Profile ID not available, cannot save avatar');
          }
          
          setSuccessMessage('✓ Photo updated!');
          setTimeout(() => setSuccessMessage(null), 3000);
        };
        
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return names[0]?.[0]?.toUpperCase() || '';
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <div className={styles.body}>
      {/* Header */}
      <div className={styles.header}>
        {onBack && (
          <button className={styles.backButton} onClick={onBack}>
            ← Back
          </button>
        )}
        <a href="/" className={styles.logo}>IBOX</a>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Logout
        </button>
      </div>

      {/* Container */}
      <div className={styles.container}>
        <div className={styles.profileCard}>
          <h1 className={styles.profileTitle}>My Profile</h1>

          {/* Success Message */}
          {successMessage && (
            <div className={styles.successMessage}>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          {loading && !isEditMode ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Loading profile...</p>
            </div>
          ) : (
            <>
              {/* Avatar Section */}
              <div className={styles.avatarSection}>
                <div className={styles.profileAvatar}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" />
                  ) : (
                    <span className={styles.avatarInitials}>
                      {getInitials(profile.fullName)}
                    </span>
                  )}
                  <div className={styles.avatarUpload}>
                    <label htmlFor="avatarInput" style={{ cursor: 'pointer' }}>
                      📷 Change Photo
                    </label>
                    <input
                      type="file"
                      id="avatarInput"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </div>
                </div>
                <button
                  className={styles.changePhotoBtn}
                  onClick={() => document.getElementById('avatarInput')?.click()}
                >
                  Change Photo
                </button>
              </div>

              {/* Profile Form */}
              <div className={styles.profileForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Full Name</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editedProfile.fullName}
                    onChange={(e) => setEditedProfile({ ...editedProfile, fullName: e.target.value })}
                    disabled={!isEditMode || loading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email Address</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={editedProfile.email}
                    disabled={true}
                  />
                  <small className={styles.formHint}>Email cannot be changed</small>
                </div>

                {/* Buttons */}
                <div className={styles.buttonGroup}>
                  {!isEditMode ? (
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={handleEditToggle}
                    >
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        className={styles.btnPrimary}
                        onClick={handleSave}
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
