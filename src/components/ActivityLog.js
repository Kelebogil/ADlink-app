import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { API_ENDPOINTS, apiCall } from '../config/api';
import './ActivityLog.css';

const ActivityLog = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivitySummary();
    fetchActivities();
  }, [currentPage, filter]);

  const fetchActivitySummary = async () => {
    try {
      const result = await apiCall(API_ENDPOINTS.ACTIVITY_SUMMARY);
      if (result.success) {
        setSummary(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to fetch activity summary');
    }
  };

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const url = new URL(API_ENDPOINTS.ACTIVITY_LOG);
      url.searchParams.append('page', currentPage);
      url.searchParams.append('limit', '10');
      
      const result = await apiCall(url.toString());
      if (result.success) {
        setActivities(result.data.activities);
        setPagination(result.data.pagination);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError('Failed to fetch activities');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (activityType) => {
    switch (activityType) {
      case 'LOGIN':
        return '🔐';
      case 'LOGIN_FAILED':
        return '❌';
      case 'REGISTER':
        return '📝';
      case 'PASSWORD_CHANGED':
        return '🔑';
      case 'PASSWORD_CHANGE_FAILED':
        return '⚠️';
      case 'PROFILE_UPDATED':
        return '✏️';
      default:
        return '📋';
    }
  };

  const getActivityColor = (activityType) => {
    switch (activityType) {
      case 'LOGIN':
      case 'REGISTER':
      case 'PASSWORD_CHANGED':
      case 'PROFILE_UPDATED':
        return 'success';
      case 'LOGIN_FAILED':
      case 'PASSWORD_CHANGE_FAILED':
        return 'danger';
      default:
        return 'info';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination?.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.activity_type === filter;
  });

  const activityTypes = [...new Set(activities.map(a => a.activity_type))];

  if (error) {
    return (
      <div className="activity-log-container">
        <div className="error-message">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="activity-log-container">
      <div className="activity-header">
        <h2>Activity Log</h2>
        <p>Monitor your account activity and security events</p>
      </div>

      {/* Activity Summary */}
      {summary && (
        <div className="activity-summary">
          <div className="summary-cards">
            <div className="summary-card">
              <h4>Last Login</h4>
              <p>
                {summary.lastLogin  
                  ? formatTimestamp(summary.lastLogin)
                  : 'Never'
                }
              </p>
            </div>
            <div className="summary-card">
              <h4>Recent Activities</h4>
              <p>{summary.recentActivities?.length || 0} in last 5 events</p>
            </div>
            <div className="summary-card">
              <h4>Security Events</h4>
              <p>{summary.stats?.filter(s => s.activity_type.includes('FAILED')).reduce((sum, s) => sum + s.count, 0) || 0} failed attempts</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Filter */}
      <div className="activity-filter">
        <label htmlFor="activityFilter">Filter by activity type:</label>
        <select 
          id="activityFilter"
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All Activities</option>
          {activityTypes.map(type => (
            <option key={type} value={type}>{type.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {/* Activity List */}
      <div className="activity-list">
        {loading ? (
          <div className="loading-spinner">Loading activities...</div>
        ) : filteredActivities.length === 0 ? (
          <div className="no-activities">
            <p>No activities found.</p>
          </div>
        ) : (
          <>
            {filteredActivities.map((activity) => (
              <div key={activity.id} className={`activity-item ${getActivityColor(activity.activity_type)}`}>
                <div className="activity-icon">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="activity-details">
                  <div className="activity-description">
                    {activity.description}
                  </div>
                  <div className="activity-meta">
                    <span className="activity-time">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                    {activity.ip_address && (
                      <span className="activity-ip">
                        IP: {activity.ip_address}
                      </span>
                    )}
                  </div>
                  {activity.user_agent && (
                    <div className="activity-user-agent">
                      <small>{activity.user_agent}</small>
                    </div>
                  )}
                </div>
                <div className="activity-type">
                  <span className={`activity-badge ${getActivityColor(activity.activity_type)}`}>
                    {activity.activity_type.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button 
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={!pagination.hasPrev}
            className="pagination-btn"
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button 
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!pagination.hasNext}
            className="pagination-btn"
          >
            Next
          </button>
        </div>
      )}

      {/* Security Tips */}
      <div className="security-tips">
        <h3>Security Tips</h3>
        <ul>
          <li>Review your activity log regularly for any suspicious activity</li>
          <li>If you notice unfamiliar login locations or times, change your password immediately</li>
          <li>Failed login attempts may indicate someone is trying to access your account</li>
          <li>Log out from devices you're not using</li>
        </ul>
      </div>
    </div>
  );
};

export default ActivityLog;
