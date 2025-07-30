const ActiveDirectory = require('activedirectory2');
require('dotenv').config();

class ADUserManager {
  constructor() {
    this.adConfig = {
      url: process.env.AD_URL,
      baseDN: process.env.AD_BASE_DN,
      username: process.env.AD_USERNAME,
      password: process.env.AD_PASSWORD,
      domain: process.env.AD_DOMAIN
    };

    // Initialize AD connection if configured
    this.ad = null;
    if (process.env.AUTH_METHOD === 'ad' || process.env.AUTH_METHOD === 'hybrid') {
      if (this.adConfig.url && this.adConfig.baseDN && this.adConfig.username && this.adConfig.password) {
        this.ad = new ActiveDirectory(this.adConfig);
        console.log('AD User Manager initialized');
      } else {
        console.warn('AD configuration incomplete. AD user creation disabled.');
      }
    }
  }

  /**
   * Check if AD is configured and available
   */
  isADConfigured() {
    return this.ad !== null && process.env.AD_CREATE_USERS === 'true';
  }

  /**
   * Create a new user in Active Directory
   * Note: This is a mock implementation for testing without PowerShell modules
   * In production, you would need proper AD user creation tools
   */
  async createADUser(userData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const { name, email, password, username } = userData;
    
    // Generate username if not provided
    const adUsername = username || email.split('@')[0];
    
    // Extract first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    
    return new Promise((resolve, reject) => {
      // Check if user already exists in AD
      this.ad.findUser(email, (err, user) => {
        if (err && !err.message.includes('not found')) {
          return reject(new Error(`Failed to check user existence: ${err.message}`));
        }
        
        if (user) {
          return reject(new Error('User already exists in Active Directory'));
        }
        
        // Mock user creation - in production this would create the actual AD user
        console.log(`Mock AD User Creation:`);
        console.log(`  Name: ${name}`);
        console.log(`  Email: ${email}`);
        console.log(`  Username: ${adUsername}`);
        console.log(`  First Name: ${firstName}`);
        console.log(`  Last Name: ${lastName}`);
        console.log(`  Target OU: ${this.getUsersOU()}`);
        
        // Simulate user creation success
        setTimeout(() => {
          console.log(`✅ Mock AD user creation successful: ${email}`);
          resolve(true);
        }, 1000);
      });
    });
  }


  /**
   * Update an existing user in Active Directory (Mock Implementation)
   */
  async updateADUser(email, updateData) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    const { name } = updateData;
    
    return new Promise((resolve, reject) => {
      // Check if user exists first
      this.ad.findUser(email, (err, user) => {
        if (err && !err.message.includes('not found')) {
          return reject(new Error(`Failed to check user existence: ${err.message}`));
        }
        
        if (!user) {
          return reject(new Error('User not found in Active Directory'));
        }
        
        // Mock user update
        console.log(`Mock AD User Update:`);
        console.log(`  Email: ${email}`);
        console.log(`  New Name: ${name}`);
        
        // Simulate update success
        setTimeout(() => {
          console.log(`✅ Mock AD user update successful: ${email}`);
          resolve(true);
        }, 500);
      });
    });
  }

  /**
   * Delete a user from Active Directory (Mock Implementation)
   */
  async deleteADUser(email) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    return new Promise((resolve, reject) => {
      // Check if user exists first
      this.ad.findUser(email, (err, user) => {
        if (err && !err.message.includes('not found')) {
          return reject(new Error(`Failed to check user existence: ${err.message}`));
        }
        
        if (!user) {
          return reject(new Error('User not found in Active Directory'));
        }
        
        // Mock user deletion
        console.log(`Mock AD User Deletion:`);
        console.log(`  Email: ${email}`);
        
        // Simulate deletion success
        setTimeout(() => {
          console.log(`✅ Mock AD user deletion successful: ${email}`);
          resolve(true);
        }, 500);
      });
    });
  }

  /**
   * Check if a user exists in Active Directory
   */
  async userExistsInAD(email) {
    if (!this.isADConfigured()) {
      return false;
    }

    return new Promise((resolve) => {
      this.ad.findUser(email, (err, user) => {
        if (err) {
          console.error('Error checking AD user existence:', err.message);
          resolve(false);
        } else {
          resolve(!!user);
        }
      });
    });
  }

  /**
   * Get the Organizational Unit for users
   * You may need to customize this based on your AD structure
   */
  getUsersOU() {
    // Use custom OU if specified, otherwise default to Users container
    return process.env.AD_USERS_OU || `CN=Users,${this.adConfig.baseDN}`;
  }

  /**
   * Reset a user's password in Active Directory (Mock Implementation)
   */
  async resetADUserPassword(email, newPassword) {
    if (!this.isADConfigured()) {
      throw new Error('Active Directory not configured');
    }

    return new Promise((resolve, reject) => {
      // Check if user exists first
      this.ad.findUser(email, (err, user) => {
        if (err && !err.message.includes('not found')) {
          return reject(new Error(`Failed to check user existence: ${err.message}`));
        }
        
        if (!user) {
          return reject(new Error('User not found in Active Directory'));
        }
        
        // Mock password reset
        console.log(`Mock AD Password Reset:`);
        console.log(`  Email: ${email}`);
        console.log(`  New Password: [HIDDEN]`);
        
        // Simulate password reset success
        setTimeout(() => {
          console.log(`✅ Mock AD password reset successful: ${email}`);
          resolve(true);
        }, 500);
      });
    });
  }
}

module.exports = new ADUserManager();
