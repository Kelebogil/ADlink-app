import React, { useState } from 'react';
import { API_ENDPOINTS, apiCall } from '../config/api';

const ApiTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState({});

  const runTest = async (testName, endpoint, options = {}) => {
    setLoading(prev => ({ ...prev, [testName]: true }));
    
    try {
      const result = await apiCall(endpoint, options);
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: result.success, 
          data: result.data || result.error,
          timestamp: new Date().toLocaleTimeString()
        } 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [testName]: { 
          success: false, 
          data: error.message,
          timestamp: new Date().toLocaleTimeString()
        } 
      }));
    }
    
    setLoading(prev => ({ ...prev, [testName]: false }));
  };

  const testEndpoints = [
    {
      name: 'Health Check',
      key: 'health',
      endpoint: API_ENDPOINTS.HEALTH,
      method: 'GET'
    },
    {
      name: 'API Info',
      key: 'info',
      endpoint: API_ENDPOINTS.INFO,
      method: 'GET'
    },
    {
      name: 'Register User',
      key: 'register',
      endpoint: API_ENDPOINTS.REGISTER,
      method: 'POST',
      options: {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: `test${Date.now()}@example.com`,
          password: 'password123'
        })
      }
    }
  ];

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>API Connection Test</h2>
      <p>Test the connection between frontend and backend APIs</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Available Tests:</h3>
        {testEndpoints.map(({ name, key, endpoint, options }) => (
          <div key={key} style={{ 
            margin: '10px 0', 
            padding: '10px', 
            border: '1px solid #ddd', 
            borderRadius: '5px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => runTest(key, endpoint, options)}
                disabled={loading[key]}
                style={{
                  padding: '8px 16px',
                  backgroundColor: loading[key] ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: loading[key] ? 'not-allowed' : 'pointer'
                }}
              >
                {loading[key] ? 'Testing...' : `Test ${name}`}
              </button>
              <span>{endpoint}</span>
            </div>
            
            {testResults[key] && (
              <div style={{ 
                marginTop: '10px', 
                padding: '10px', 
                backgroundColor: testResults[key].success ? '#d4edda' : '#f8d7da',
                borderRadius: '3px',
                fontSize: '14px'
              }}>
                <div style={{ fontWeight: 'bold' }}>
                  Status: {testResults[key].success ? '✅ Success' : '❌ Failed'}
                  <span style={{ float: 'right' }}>{testResults[key].timestamp}</span>
                </div>
                <pre style={{ marginTop: '5px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(testResults[key].data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => {
            setTestResults({});
            setLoading({});
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>
    </div>
  );
};

export default ApiTest;
