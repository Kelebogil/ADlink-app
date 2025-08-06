import React from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleSecurityClick = () => {
    navigate('/security');
  };

  const handleActivityClick = () => {
    navigate('/activity');
  };

  const handleUserManagementClick = () => {
    navigate('/user-management');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Welcome to your Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <div className="dashboard-content">
        <div className="user-info">
          <h2>User Information</h2>
          <div className="info-card">
            <p><strong>Name:</strong> {currentUser?.name}</p>
            <p><strong>Email:</strong> {currentUser?.email}</p>
            <p><strong>User ID:</strong> {currentUser?.id}</p>
          </div>
        </div>
        
        <div className="dashboard-features">
          <h2>Dashboard Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Profile Management</h3>
              <p>Update your profile information and preferences</p>
              <button className="feature-button" onClick={handleProfileClick}>Manage Profile</button>
            </div>
            
            <div className="feature-card">
              <h3>Security Settings</h3>
              <p>Change password and manage security settings</p>
              <button className="feature-button" onClick={handleSecurityClick}>Security</button>
            </div>
            
            <div className="feature-card">
              <h3>Activity Log</h3>
              <p>View your recent account activity and login times</p>
              <button className="feature-button" onClick={handleActivityClick}>View Activity</button>
            </div>
            
            <div className="feature-card">
              <h3>Notifications</h3>
              <p>Manage your notification preferences</p>
              <button className="feature-button">Notifications</button>
            </div>
            
            {currentUser?.role === 'superadmin' && (
              <div className="feature-card">
                <h3>User Management</h3>
                <p>Manage users, roles, and permissions</p>
                <button className="feature-button" onClick={handleUserManagementClick}>Manage Users</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
