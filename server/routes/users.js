const express = require('express');
const sql = require('mssql');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config();

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const request = new sql.Request();
    request.input('id', sql.Int, req.user.id);
    
    const result = await request.query('SELECT id, name, email, created_at FROM users WHERE id = @id');
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all users (for testing purposes)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query('SELECT id, name, email, created_at FROM users');
    res.json(result.recordset);
  } catch (error) {
    console.error('Users error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if email is already taken by another user
    const checkRequest = new sql.Request();
    checkRequest.input('email', sql.NVarChar, email);
    checkRequest.input('userId', sql.Int, userId);
    
    const checkResult = await checkRequest.query('SELECT * FROM users WHERE email = @email AND id != @userId');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // Update user
    const updateRequest = new sql.Request();
    updateRequest.input('name', sql.NVarChar, name);
    updateRequest.input('email', sql.NVarChar, email);
    updateRequest.input('userId', sql.Int, userId);
    
    const updateResult = await updateRequest.query(`
      UPDATE users 
      SET name = @name, email = @email 
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.created_at
      WHERE id = @userId
    `);
    
    if (updateResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user: updateResult.recordset[0]
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete user account (self-deletion)
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user info before deletion
    const getUserRequest = new sql.Request();
    getUserRequest.input('userId', sql.Int, userId);
    
    const userResult = await getUserRequest.query('SELECT id, name, email, role FROM users WHERE id = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userToDelete = userResult.recordset[0];

    const deleteRequest = new sql.Request();
    deleteRequest.input('userId', sql.Int, userId);
    
    const deleteResult = await deleteRequest.query('DELETE FROM users WHERE id = @userId');
    
    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'Account deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.name,
        email: userToDelete.email
      }
    });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
