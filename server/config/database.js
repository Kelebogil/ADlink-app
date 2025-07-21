const sql = require('mssql');

// SQL Server configuration
const config = {
  user: process.env.DB_USER || 'test', 
  password: process.env.DB_PASS || '1',
  server: process.env.DB_SERVER || 'YTSLTITD24',
  database: process.env.DB_NAME || 'testsql1', 
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || false,
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true
  } 
};

// Initialize database connection and create tables
const initializeDatabase = async () => {
  try {
    // Connect to SQL Server
    await sql.connect(config);
    console.log('Connected to SQL Server');

    // Create table if it doesn't exist
    const request = new sql.Request();
    await request.query(`
      IF NOT EXISTS (
        SELECT * FROM sysobjects WHERE name='users' AND xtype='U'
      )
      CREATE TABLE users (
        id INT PRIMARY KEY IDENTITY(1,1),
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(100) UNIQUE NOT NULL,
        password NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT GETDATE()
      );
    `);
    
    // Add role column if it doesn't exist (for existing databases)
    await request.query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
      )
      ALTER TABLE users ADD role NVARCHAR(20) DEFAULT 'user';
    `);
    console.log('Users table checked/created');

    // Create super admin user if it doesn't exist
    await createSuperAdmin();

    return true;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
};

// Create super admin user
const createSuperAdmin = async () => {
  try {
    const bcrypt = require('bcrypt');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@authenticator.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SuperAdmin123!';
    
    // Check if super admin already exists
    const checkRequest = new sql.Request();
    checkRequest.input('email', sql.NVarChar, adminEmail);
    
    const existingAdmin = await checkRequest.query('SELECT * FROM users WHERE email = @email');
    
    if (existingAdmin.recordset.length === 0) {
      // Create super admin
      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      
      const createRequest = new sql.Request();
      createRequest.input('name', sql.NVarChar, 'Super Administrator');
      createRequest.input('email', sql.NVarChar, adminEmail);
      createRequest.input('password', sql.NVarChar, hashedPassword);
      createRequest.input('role', sql.NVarChar, 'superadmin');
      
      await createRequest.query(`
        INSERT INTO users (name, email, password, role) 
        VALUES (@name, @email, @password, @role)
      `);
      
      console.log('✅ Super Admin created successfully!');
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log('⚠️  Please change the default password after first login!');
    } else {
      console.log('ℹ️  Super Admin already exists');
    }
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
  }
};

// Graceful database shutdown
const closeDatabase = async () => {
  try {
    await sql.close();
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database:', err);
    throw err;
  }
};

module.exports = {
  config,
  initializeDatabase,
  closeDatabase
};
