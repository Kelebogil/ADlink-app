import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_ENDPOINTS, apiCall } from '../config/api';

const Profile = () => {
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Load profile data on component mount
  useEffect(() => {
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        role: currentUser.role || ''
      });
    }
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await apiCall(API_ENDPOINTS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify({
          name: profile.name,
          email: profile.email
        })
      });

      if (result.success) {
        // Update localStorage with new user data
        const updatedUser = { ...currentUser, ...result.data.user };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setMessage('Profile updated successfully!');
        setMessageType('success');
      } else {
        setMessage(result.error || 'Failed to update profile');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true);
      
      try {
        const result = await apiCall(API_ENDPOINTS.PROFILE, {
          method: 'DELETE'
        });

        if (result.success) {
          setMessage('Account deleted successfully. You will be logged out.');
          setMessageType('success');
          
          // Logout after a brief delay
          setTimeout(() => {
            logout();
          }, 2000);
        } else {
          setMessage(result.error || 'Failed to delete account');
          setMessageType('error');
        }
      } catch (error) {
        setMessage('Network error. Please try again.');
        setMessageType('error');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="profile-container">
      <h2>Profile Management</h2>
      
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="profile-form">
        <div className="form-group">
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={profile.name}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={profile.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="role">Role:</label>
          <input
            type="text"
            id="role"
            name="role"
            value={profile.role}
            readOnly
            className="readonly-field"
          />
        </div>

        <div className="form-actions">
          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </button>
        </div>
      </form>

      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <p>Once you delete your account, there is no going back. Please be certain.</p>
        <button 
          onClick={handleDeleteAccount}
          disabled={loading}
          className="btn btn-danger"
        >
          {loading ? 'Deleting...' : 'Delete Account'}
        </button>
      </div>
    </div>
  );
};

export default Profile;
