const express = require('express');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const ActiveDirectory = require('activedirectory2');

const router = express.Router();

// Active Directory configuration
const adConfig = {
  url: process.env.AD_URL,
  baseDN: process.env.AD_BASE_DN,
  username: process.env.AD_USERNAME,
  password: process.env.AD_PASSWORD
};

// Initialize AD connection if AD is configured
let ad = null;
if (process.env.AUTH_METHOD === 'ad' || process.env.AUTH_METHOD === 'hybrid') {
  if (adConfig.url && adConfig.baseDN && adConfig.username && adConfig.password) {
    ad = new ActiveDirectory(adConfig);
    console.log('Active Directory initialized for authentication');
  } else {
    console.warn('Active Directory configuration incomplete. AD authentication disabled.');
  }
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const request = new sql.Request();
    request.input('email', sql.NVarChar, email);
    
    const result = await request.query('SELECT * FROM users WHERE email = @email');
    
    if (result.recordset.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const insertRequest = new sql.Request();
    insertRequest.input('name', sql.NVarChar, name);
    insertRequest.input('email', sql.NVarChar, email);
    insertRequest.input('password', sql.NVarChar, hashedPassword);
    
    const insertResult = await insertRequest.query(`
      INSERT INTO users (name, email, password, role) 
      OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
      VALUES (@name, @email, @password, 'user')
    `);
    
    const newUser = insertResult.recordset[0];
    const token = generateToken(newUser);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Function to authenticate user with Active Directory
const authenticateWithAD = (email, password) => {
  return new Promise((resolve, reject) => {
    if (!ad) {
      reject(new Error('AD not configured'));
      return;
    }

    ad.authenticate(email, password, (err, auth) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(auth);
    });
  });
};

// Function to get user details from AD
const getUserFromAD = (email) => {
  return new Promise((resolve, reject) => {
    if (!ad) {
      reject(new Error('AD not configured'));
      return;
    }

    ad.findUser(email, (err, user) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(user);
    });
  });
};

// Function to ensure user exists in local database
const ensureUserInDatabase = async (email, name, role = 'user') => {
  const request = new sql.Request();
  
  // Check if user exists
  const result = await request
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM users WHERE email = @email');

  if (result.recordset.length === 0) {
    // Create user in local database
    const insertRequest = new sql.Request();
    const insertResult = await insertRequest
      .input('name', sql.NVarChar, name)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, null) // No password for AD users
      .input('role', sql.NVarChar, role)
      .query('INSERT INTO users (name, email, password, role) OUTPUT INSERTED.* VALUES (@name, @email, @password, @role)');
    
    return insertResult.recordset[0];
  }
  
  return result.recordset[0];
};

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user = null;
    const authMethod = process.env.AUTH_METHOD || 'local';

    // Try Active Directory authentication first (if configured)
    if (authMethod === 'ad' || authMethod === 'hybrid') {
      try {
        const isAuthenticated = await authenticateWithAD(email, password);
        
        if (isAuthenticated) {
          console.log('User authenticated with Active Directory');
          
          // Get user details from AD
          const adUser = await getUserFromAD(email);
          const displayName = adUser.displayName || adUser.cn || email;
          
          // Ensure user exists in local database
          user = await ensureUserInDatabase(email, displayName);
          
          // Generate JWT token
          const token = generateToken({ userId: user.id, email: user.email, role: user.role });

          return res.json({
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            },
            authMethod: 'ad'
          });
        }
      } catch (adError) {
        console.log('AD authentication failed:', adError.message);
        
        // If not hybrid mode, return error
        if (authMethod === 'ad') {
          return res.status(400).json({ error: 'Invalid credentials' });
        }
        
        // For hybrid mode, continue to local authentication
        console.log('Falling back to local authentication');
      }
    }

    // Local authentication (fallback for hybrid mode or primary for local mode)
    if (authMethod === 'local' || authMethod === 'hybrid') {
      // Check if user exists in local database
      const request = new sql.Request();
      const result = await request
        .input('email', sql.NVarChar, email)
        .query('SELECT * FROM users WHERE email = @email');

      if (result.recordset.length === 0) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      user = result.recordset[0];

      // Check if user has a password (AD users might not have local passwords)
      if (!user.password) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      // Check password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      console.log('User authenticated with local database');

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email, role: user.role });

      return res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        authMethod: 'local'
      });
    }

    // If no authentication method is configured or none succeeded
    return res.status(400).json({ error: 'Authentication failed' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
  
;

module.exports = router;
