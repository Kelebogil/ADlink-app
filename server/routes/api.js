const express = require('express');
const sql = require('mssql');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Database health check
router.get('/health/db', async (req, res) => {
  try {
    const request = new sql.Request();
    await request.query('SELECT 1 as test');
    res.json({ 
      status: 'OK', 
      message: 'Database connection is healthy',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// API information endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Authenticator API',
    version: '1.0.0',
    description: 'Authentication API for user management',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      users: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        deleteProfile: 'DELETE /api/users/profile',
        getAllUsers: 'GET /api/users'
      },
      utility: {
        health: 'GET /api/health',
        dbHealth: 'GET /api/health/db',
        info: 'GET /api/info'
      }
    }
  });
});

module.exports = router;
