const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { requireSuperAdmin, requireAdmin } = require('../middleware/roleAuth');
const { generateToken } = require('../middleware/auth');

const router = express.Router();

// Get all users (Super Admin only)
router.get('/users', requireSuperAdmin, async (req, res) => {
  try {
    const request = new sql.Request();
    const result = await request.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
    
    res.json({
      message: 'Users retrieved successfully',
      users: result.recordset,
      total: result.recordset.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new user (Super Admin only)
router.post('/users', requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate role
    const validRoles = ['user', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superadmin' });
    }

    // Check if user already exists
    const checkRequest = new sql.Request();
    checkRequest.input('email', sql.NVarChar, email);
    
    const existingUser = await checkRequest.query('SELECT * FROM users WHERE email = @email');
    
    if (existingUser.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertRequest = new sql.Request();
    insertRequest.input('name', sql.NVarChar, name);
    insertRequest.input('email', sql.NVarChar, email);
    insertRequest.input('password', sql.NVarChar, hashedPassword);
    insertRequest.input('role', sql.NVarChar, role);
    
    const insertResult = await insertRequest.query(`
      INSERT INTO users (name, email, password, role) 
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.created_at
      VALUES (@name, @email, @password, @role)
    `);
    
    const newUser = insertResult.recordset[0];

    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user (Super Admin only)
router.put('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({ error: 'Name, email, and role are required' });
    }

    // Validate role
    const validRoles = ['user', 'admin', 'superadmin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, admin, or superadmin' });
    }

    // Check if email is already taken by another user
    const checkRequest = new sql.Request();
    checkRequest.input('email', sql.NVarChar, email);
    checkRequest.input('userId', sql.Int, id);
    
    const checkResult = await checkRequest.query('SELECT * FROM users WHERE email = @email AND id != @userId');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    // Update user
    const updateRequest = new sql.Request();
    updateRequest.input('name', sql.NVarChar, name);
    updateRequest.input('email', sql.NVarChar, email);
    updateRequest.input('role', sql.NVarChar, role);
    updateRequest.input('userId', sql.Int, id);
    
    const updateResult = await updateRequest.query(`
      UPDATE users 
      SET name = @name, email = @email, role = @role 
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role, INSERTED.created_at
      WHERE id = @userId
    `);
    
    if (updateResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: updateResult.recordset[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete user (Super Admin only)
router.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deletion of the current super admin user
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Get user info before deletion
    const getUserRequest = new sql.Request();
    getUserRequest.input('userId', sql.Int, id);
    
    const userResult = await getUserRequest.query('SELECT id, name, email, role FROM users WHERE id = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userToDelete = userResult.recordset[0];

    // Delete user
    const deleteRequest = new sql.Request();
    deleteRequest.input('userId', sql.Int, id);
    
    const deleteResult = await deleteRequest.query('DELETE FROM users WHERE id = @userId');
    
    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userToDelete.id,
        name: userToDelete.name,
        email: userToDelete.email,
        role: userToDelete.role
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user statistics (Admin/Super Admin)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const request = new sql.Request();
    
    // Get user count by role
    const roleStats = await request.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role
    `);
    
    // Get total user count
    const totalUsers = await request.query('SELECT COUNT(*) as total FROM users');
    
    // Get recent registrations (last 30 days)
    const recentUsers = await request.query(`
      SELECT COUNT(*) as recent 
      FROM users 
      WHERE created_at >= DATEADD(day, -30, GETDATE())
    `);

    res.json({
      message: 'Statistics retrieved successfully',
      stats: {
        total: totalUsers.recordset[0].total,
        recent: recentUsers.recordset[0].recent,
        byRole: roleStats.recordset
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
