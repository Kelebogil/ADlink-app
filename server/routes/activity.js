const express = require('express');
const sql = require('mssql');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Function to log activity
const logActivity = async (userId, activityType, description, ipAddress = null, userAgent = null) => {
  try {
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('activityType', sql.NVarChar, activityType);
    request.input('description', sql.NVarChar, description);
    request.input('ipAddress', sql.NVarChar, ipAddress);
    request.input('userAgent', sql.NVarChar, userAgent);
    request.input('timestamp', sql.DateTime, new Date());

    await request.query(`
      INSERT INTO activity_logs (user_id, activity_type, description, ip_address, user_agent, timestamp)
      VALUES (@userId, @activityType, @description, @ipAddress, @userAgent, @timestamp)
    `);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

// Get user's activity log
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('limit', sql.Int, limit);
    request.input('offset', sql.Int, offset);

    // Get total count
    const countResult = await request.query('SELECT COUNT(*) as total FROM activity_logs WHERE user_id = @userId');
    const totalActivities = countResult.recordset[0].total;

    // Get paginated activities
    const activitiesResult = await request.query(`
      SELECT 
        id,
        activity_type,
        description,
        ip_address,
        user_agent,
        timestamp
      FROM activity_logs 
      WHERE user_id = @userId 
      ORDER BY timestamp DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      activities: activitiesResult.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        totalActivities: totalActivities,
        hasNext: page < Math.ceil(totalActivities / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Activity log error:', error);
    res.status(500).json({ error: 'Failed to fetch activity log' });
  }
});

// Get activity summary for dashboard
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const request = new sql.Request();
    request.input('userId', sql.Int, userId);

    // Get recent activities (last 5)
    const recentResult = await request.query(`
      SELECT TOP 5
        activity_type,
        description,
        timestamp
      FROM activity_logs 
      WHERE user_id = @userId 
      ORDER BY timestamp DESC
    `);

    // Get activity counts by type for last 30 days
    const statsResult = await request.query(`
      SELECT 
        activity_type,
        COUNT(*) as count
      FROM activity_logs 
      WHERE user_id = @userId 
        AND timestamp >= DATEADD(DAY, -30, GETDATE())
      GROUP BY activity_type
      ORDER BY count DESC
    `);

    // Get last login time
    const lastLoginResult = await request.query(`
      SELECT TOP 1 timestamp
      FROM activity_logs 
      WHERE user_id = @userId 
        AND activity_type = 'LOGIN'
      ORDER BY timestamp DESC
    `);

    res.json({
      recentActivities: recentResult.recordset,
      stats: statsResult.recordset,
      lastLogin: lastLoginResult.recordset[0]?.timestamp || null
    });
  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// Clear old activity logs (admin function or scheduled job)
router.delete('/cleanup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const daysToKeep = parseInt(req.query.days) || 90;

    const request = new sql.Request();
    request.input('userId', sql.Int, userId);
    request.input('cutoffDate', sql.DateTime, new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000)));

    const result = await request.query(`
      DELETE FROM activity_logs 
      WHERE user_id = @userId 
        AND timestamp < @cutoffDate
    `);

    res.json({ 
      message: `Cleaned up activity logs older than ${daysToKeep} days`,
      deletedCount: result.rowsAffected[0]
    });
  } catch (error) {
    console.error('Activity cleanup error:', error);
    res.status(500).json({ error: 'Failed to cleanup activity logs' });
  }
});

module.exports = { router, logActivity };
