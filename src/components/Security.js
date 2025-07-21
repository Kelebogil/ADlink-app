import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { API_ENDPOINTS, apiCall } from '../config/api';

const Security = () => {
  const { currentUser } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePasswordForm = () => {
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('All password fields are required');
      setMessageType('error');
      return false;
    }
    
    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      setMessageType('error');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match');
      setMessageType('error');
      return false;
    }
    
    if (currentPassword === newPassword) {
      setMessage('New password must be different from current password');
      setMessageType('error');
      return false;
    }
    
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (!validatePasswordForm()) {
      return;
    }
    
    setLoading(true);

    try {
      const result = await apiCall(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      if (result.success) {
        setMessage('Password changed successfully!');
        setMessageType('success');
        
        // Clear the form
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        setMessage(result.error || 'Failed to change password');
        setMessageType('error');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, text: '' };
    
    let strength = 0;
    const checks = [
      { regex: /.{8,}/, text: 'at least 8 characters' },
      { regex: /[A-Z]/, text: 'uppercase letter' },
      { regex: /[a-z]/, text: 'lowercase letter' },
      { regex: /[0-9]/, text: 'number' },
      { regex: /[^A-Za-z0-9]/, text: 'special character' }
    ];
    
    checks.forEach(check => {
      if (check.regex.test(password)) strength++;
    });
    
    const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#ff4444', '#ff8844', '#ffaa44', '#44aa44', '#44ff44'];
    
    return {
      strength: strength,
      text: strengthLevels[Math.min(strength, 4)],
      color: strengthColors[Math.min(strength, 4)]
    };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="security-container">
      <h2>Security Settings</h2>
      
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="security-section">
        <h3>Change Password</h3>
        <form onSubmit={handleChangePassword} className="password-form">
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password:</label>
            <input
              type="password"
              id="currentPassword"
              name="currentPassword"
              value={passwordForm.currentPassword}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password:</label>
            <input
              type="password"
              id="newPassword"
              name="newPassword"
              value={passwordForm.newPassword}
              onChange={handleInputChange}
              required
            />
            
            {passwordForm.newPassword && (
              <div className="password-strength">
                <div className="strength-bar">
                  <div 
                    className="strength-fill"
                    style={{ 
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                      backgroundColor: passwordStrength.color
                    }}
                  ></div>
                </div>
                <span className="strength-text">
                  Strength: {passwordStrength.text}
                </span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password:</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={passwordForm.confirmPassword}
              onChange={handleInputChange}
              required
            />
            
            {passwordForm.confirmPassword && (
              <div className={`password-match ${
                passwordForm.newPassword === passwordForm.confirmPassword ? 'match' : 'no-match'
              }`}>
                {passwordForm.newPassword === passwordForm.confirmPassword 
                  ? '✓ Passwords match' 
                  : '✗ Passwords do not match'
                }
              </div>
            )}
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>

      <div className="security-info">
        <h3>Account Security Information</h3>
        <div className="info-item">
          <strong>Account Email:</strong> {currentUser?.email}
        </div>
        <div className="info-item">
          <strong>Account Role:</strong> {currentUser?.role}
        </div>
        <div className="info-item">
          <strong>Account Created:</strong> {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'N/A'}
        </div>
      </div>

      <div className="security-tips">
        <h3>Password Security Tips</h3>
        <ul>
          <li>Use a unique password that you don't use elsewhere</li>
          <li>Include a mix of uppercase and lowercase letters</li>
          <li>Add numbers and special characters</li>
          <li>Make it at least 8 characters long</li>
          <li>Consider using a password manager</li>
          <li>Change your password regularly</li>
        </ul>
      </div>
    </div>
  );
};

export default Security;
