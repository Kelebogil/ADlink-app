#!/usr/bin/env node

require('dotenv').config();
const readline = require('readline');
const sql = require('mssql');
const bcrypt = require('bcrypt');
const { initializeDatabase } = require('./config/database');
const adUserManager = require('./utils/adUserManager');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class ConsoleAdmin {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
  }

  async start() {
    console.log('\n🔐 Authenticator App - Super Admin Console');
    console.log('==========================================\n');
    
    try {
      await initializeDatabase();
      await this.authenticate();
      
      if (this.isAuthenticated) {
        await this.showMainMenu();
      }
    } catch (error) {
      console.error(' Failed to start admin console:', error.message);
    } finally {
      await sql.close();
      rl.close();
    }
  }

  async authenticate() {
    return new Promise((resolve) => {
      rl.question('📧 Admin Email: ', async (email) => {
        rl.question('🔑 Password: ', async (password) => {
          try {
            const request = new sql.Request();
            request.input('email', sql.NVarChar, email);
            
            const result = await request.query('SELECT * FROM users WHERE email = @email');
            
            if (result.recordset.length === 0) {
              console.log(' Invalid credentials');
              return resolve();
            }

            const user = result.recordset[0];
            
            if (user.role !== 'superadmin') {
              console.log('Access denied. Super admin privileges required.');
              return resolve();
            }

            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
              console.log(' Invalid credentials');
              return resolve();
            }

            this.isAuthenticated = true;
            this.currentUser = user;
            console.log(`\n Welcome, ${user.name}!\n`);
            resolve();
          } catch (error) {
            console.error(' Authentication error:', error.message);
            resolve();
          }
        });
      });
    });
  }

  async showMainMenu() {
    const options = `
📋 Main Menu:
1. List all users
2. Create new user
3. Update user
4. Delete user
5. View statistics
6. Change user password
7. Exit

Choose an option (1-7): `;

    return new Promise((resolve) => {
      rl.question(options, async (choice) => {
        switch (choice) {
          case '1':
            await this.listUsers();
            break;
          case '2':
            await this.createUser();
            break;
          case '3':
            await this.updateUser();
            break;
          case '4':
            await this.deleteUser();
            break;
          case '5':
            await this.viewStats();
            break;
          case '6':
            await this.changePassword();
            break;
          case '7':
            console.log('👋 Goodbye!');
            return resolve();
          default:
            console.log(' Invalid option. Please try again.');
        }
        
        if (choice !== '7') {
          setTimeout(() => this.showMainMenu().then(resolve), 1000);
        } else {
          resolve();
        }
      });
    });
  }

  async listUsers() {
    try {
      const request = new sql.Request();
      const result = await request.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
      
      console.log('\n👥 All Users:');
      console.log('================');
      
      if (result.recordset.length === 0) {
        console.log('No users found.');
        return;
      }

      result.recordset.forEach(user => {
        const roleEmoji = user.role === 'superadmin' ? '👑' : user.role === 'admin' ? '🛡️' : '👤';
        console.log(`${roleEmoji} [${user.id}] ${user.name} (${user.email}) - ${user.role} - ${user.created_at.toLocaleDateString()}`);
      });
      
      console.log(`\nTotal: ${result.recordset.length} users\n`);
    } catch (error) {
      console.error(' Error listing users:', error.message);
    }
  }

  async createUser() {
    console.log('\n Create New User:');
    
    return new Promise((resolve) => {
      rl.question('👤 Name: ', (name) => {
        rl.question('📧 Email: ', (email) => {
          rl.question('🔑 Password: ', (password) => {
            rl.question('👔 Role (user/admin/superadmin) [user]: ', async (role) => {
              try {
                role = role || 'user';
                
                if (!['user', 'admin', 'superadmin'].includes(role)) {
                  console.log('❌ Invalid role. Must be user, admin, or superadmin');
                  return resolve();
                }

                if (!name || !email || !password) {
                  console.log('❌ All fields are required');
                  return resolve();
                }

                if (password.length < 6) {
                  console.log('❌ Password must be at least 6 characters');
                  return resolve();
                }

                // Check if user exists
                const checkRequest = new sql.Request();
                checkRequest.input('email', sql.NVarChar, email);
                const existing = await checkRequest.query('SELECT * FROM users WHERE email = @email');
                
                if (existing.recordset.length > 0) {
                  console.log('❌ User with this email already exists');
                  return resolve();
                }

                // Create user
                const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
                const hashedPassword = await bcrypt.hash(password, saltRounds);

                const insertRequest = new sql.Request();
                insertRequest.input('name', sql.NVarChar, name);
                insertRequest.input('email', sql.NVarChar, email);
                insertRequest.input('password', sql.NVarChar, hashedPassword);
                insertRequest.input('role', sql.NVarChar, role);
                
                const result = await insertRequest.query(`
                  INSERT INTO users (name, email, password, role) 
                  OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.role
                  VALUES (@name, @email, @password, @role)
                `);
                
                const newUser = result.recordset[0];
                console.log(`✅ User created successfully in database: [${newUser.id}] ${newUser.name} (${newUser.role})`);
                
                // Create user in Active Directory if configured
                if (adUserManager.isADConfigured()) {
                  try {
                    console.log('🔄 Creating user in Active Directory...');
                    await adUserManager.createADUser({
                      name,
                      email,
                      password // Use the plain password for AD creation
                    });
                    console.log(`✅ User also created successfully in Active Directory: ${email}`);
                  } catch (adError) {
                    console.log(`❌ Failed to create user in Active Directory: ${adError.message}`);
                    console.log('   The user exists in the local database but not in AD.');
                    console.log('   You may need to create them manually in AD or check your AD configuration.');
                    
                    // Optionally ask if they want to delete the local user
                    // For now, we'll just warn and continue
                  }
                } else {
                  console.log('ℹ️  Active Directory not configured - user created in local database only');
                }
                
                resolve();
              } catch (error) {
                console.error('❌ Error creating user:', error.message);
                resolve();
              }
            });
          });
        });
      });
    });
  }

  async deleteUser() {
    console.log('\n🗑️  Delete User:');
    
    return new Promise((resolve) => {
      rl.question('🆔 User ID to delete: ', async (userId) => {
        try {
          const id = parseInt(userId);
          
          if (isNaN(id)) {
            console.log('❌ Invalid user ID');
            return resolve();
          }

          if (id === this.currentUser.id) {
            console.log('❌ Cannot delete your own account');
            return resolve();
          }

          // Get user info
          const getUserRequest = new sql.Request();
          getUserRequest.input('userId', sql.Int, id);
          const userResult = await getUserRequest.query('SELECT id, name, email, role FROM users WHERE id = @userId');
          
          if (userResult.recordset.length === 0) {
            console.log('❌ User not found');
            return resolve();
          }

          const userToDelete = userResult.recordset[0];
          
          rl.question(`⚠️  Are you sure you want to delete "${userToDelete.name}" (${userToDelete.email})? (y/N): `, async (confirm) => {
            if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
              try {
                const deleteRequest = new sql.Request();
                deleteRequest.input('userId', sql.Int, id);
                await deleteRequest.query('DELETE FROM users WHERE id = @userId');
                
                console.log(`✅ User "${userToDelete.name}" deleted successfully`);
              } catch (error) {
                console.error('❌ Error deleting user:', error.message);
              }
            } else {
              console.log('❌ Deletion cancelled');
            }
            resolve();
          });
        } catch (error) {
          console.error('❌ Error:', error.message);
          resolve();
        }
      });
    });
  }

  async viewStats() {
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

      console.log('\n📊 User Statistics:');
      console.log('====================');
      console.log(`Total Users: ${totalUsers.recordset[0].total}`);
      console.log(`Recent (30 days): ${recentUsers.recordset[0].recent}`);
      console.log('\nBy Role:');
      
      roleStats.recordset.forEach(stat => {
        const emoji = stat.role === 'superadmin' ? '👑' : stat.role === 'admin' ? '🛡️' : '👤';
        console.log(`  ${emoji} ${stat.role}: ${stat.count}`);
      });
      
      console.log('');
    } catch (error) {
      console.error('❌ Error fetching statistics:', error.message);
    }
  }

  async updateUser() {
    console.log('\n✏️  Update User:');
    
    return new Promise((resolve) => {
      rl.question('🆔 User ID to update: ', async (userId) => {
        try {
          const id = parseInt(userId);
          
          if (isNaN(id)) {
            console.log('❌ Invalid user ID');
            return resolve();
          }

          // Get current user info
          const getUserRequest = new sql.Request();
          getUserRequest.input('userId', sql.Int, id);
          const userResult = await getUserRequest.query('SELECT * FROM users WHERE id = @userId');
          
          if (userResult.recordset.length === 0) {
            console.log('❌ User not found');
            return resolve();
          }

          const currentUser = userResult.recordset[0];
          console.log(`Current: ${currentUser.name} (${currentUser.email}) - ${currentUser.role}`);
          
          rl.question(`👤 New name [${currentUser.name}]: `, (name) => {
            rl.question(`📧 New email [${currentUser.email}]: `, (email) => {
              rl.question(`👔 New role [${currentUser.role}]: `, async (role) => {
                try {
                  name = name || currentUser.name;
                  email = email || currentUser.email;
                  role = role || currentUser.role;
                  
                  if (!['user', 'admin', 'superadmin'].includes(role)) {
                    console.log('❌ Invalid role. Must be user, admin, or superadmin');
                    return resolve();
                  }

                  // Update user
                  const updateRequest = new sql.Request();
                  updateRequest.input('name', sql.NVarChar, name);
                  updateRequest.input('email', sql.NVarChar, email);
                  updateRequest.input('role', sql.NVarChar, role);
                  updateRequest.input('userId', sql.Int, id);
                  
                  await updateRequest.query(`
                    UPDATE users 
                    SET name = @name, email = @email, role = @role 
                    WHERE id = @userId
                  `);
                  
                  console.log(`✅ User updated successfully: ${name} (${email}) - ${role}`);
                  resolve();
                } catch (error) {
                  console.error('❌ Error updating user:', error.message);
                  resolve();
                }
              });
            });
          });
        } catch (error) {
          console.error('❌ Error:', error.message);
          resolve();
        }
      });
    });
  }

  async changePassword() {
    console.log('\n🔐 Change User Password:');
    
    return new Promise((resolve) => {
      rl.question('🆔 User ID: ', async (userId) => {
        try {
          const id = parseInt(userId);
          
          if (isNaN(id)) {
            console.log('❌ Invalid user ID');
            return resolve();
          }

          // Get user info
          const getUserRequest = new sql.Request();
          getUserRequest.input('userId', sql.Int, id);
          const userResult = await getUserRequest.query('SELECT id, name, email FROM users WHERE id = @userId');
          
          if (userResult.recordset.length === 0) {
            console.log('❌ User not found');
            return resolve();
          }

          const user = userResult.recordset[0];
          console.log(`User: ${user.name} (${user.email})`);
          
          rl.question('🔑 New password: ', async (password) => {
            try {
              if (password.length < 6) {
                console.log('❌ Password must be at least 6 characters');
                return resolve();
              }

              const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
              const hashedPassword = await bcrypt.hash(password, saltRounds);

              const updateRequest = new sql.Request();
              updateRequest.input('password', sql.NVarChar, hashedPassword);
              updateRequest.input('userId', sql.Int, id);
              
              await updateRequest.query('UPDATE users SET password = @password WHERE id = @userId');
              
              console.log(`✅ Password updated successfully for ${user.name}`);
              resolve();
            } catch (error) {
              console.error('❌ Error updating password:', error.message);
              resolve();
            }
          });
        } catch (error) {
          console.error('❌ Error:', error.message);
          resolve();
        }
      });
    });
  }
}

// Start the console admin
const admin = new ConsoleAdmin();
admin.start();
