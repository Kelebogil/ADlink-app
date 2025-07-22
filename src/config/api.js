// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  
  // User management
  PROFILE: `${API_BASE_URL}/users/profile`,
  USERS: `${API_BASE_URL}/users`,
  CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
  
  // Activity logs
  ACTIVITY_LOG: `${API_BASE_URL}/activity`,
  ACTIVITY_SUMMARY: `${API_BASE_URL}/activity/summary`,
  
  // Utility
  HEALTH: `${API_BASE_URL}/health`,
  INFO: `${API_BASE_URL}/info`,
};

// API helper function
export const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json();
    
    if (response.ok) {
      return { success: true, data };
    } else {
      return { success: false, error: data.error || 'Request failed' };
    }
  } catch (error) {
    return { success: false, error: 'Network error. Please try again.' };
  }
};

export default API_BASE_URL;
