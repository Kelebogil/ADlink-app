const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function runMigration() {
  let pool;
  
  try {
    console.log('Connecting to database...');
    pool = await sql.connect(dbConfig);
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'create_activity_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running activity logs migration...');
    
    // Split the SQL into individual statements and run them
    const statements = migrationSQL.split('GO').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await pool.request().query(statement.trim());
      }
    }
    
    console.log('✅ Activity logs migration completed successfully!');
    console.log('📋 Activity logs table created with indexes');
    console.log('🔧 Updated users table with updated_at column');
    
    // Test the table by inserting a sample record
    console.log('\nTesting the activity_logs table...');
    
    // First, check if there are any users in the database
    const userResult = await pool.request().query('SELECT TOP 1 id FROM users');
    
    if (userResult.recordset.length > 0) {
      const testUserId = userResult.recordset[0].id;
      
      // Insert a test activity log
      await pool.request()
        .input('userId', sql.Int, testUserId)
        .input('activityType', sql.NVarChar, 'SYSTEM_TEST')
        .input('description', sql.NVarChar, 'Database migration test - activity logging system initialized')
        .input('ipAddress', sql.NVarChar, '127.0.0.1')
        .input('userAgent', sql.NVarChar, 'Migration Script v1.0')
        .input('timestamp', sql.DateTime, new Date())
        .query(`
          INSERT INTO activity_logs (user_id, activity_type, description, ip_address, user_agent, timestamp)
          VALUES (@userId, @activityType, @description, @ipAddress, @userAgent, @timestamp)
        `);
      
      console.log('✅ Test activity log inserted successfully');
    } else {
      console.log('⚠️  No users found in database - skipping test insert');
    }
    
    console.log('\n🎉 Setup complete! Your application now supports activity logging.');
    console.log('Features added:');
    console.log('- User login tracking');
    console.log('- Password change notifications');
    console.log('- Failed login attempt logging');
    console.log('- User registration tracking');
    console.log('- Activity history with pagination');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run the migration
runMigration().catch(console.error);
