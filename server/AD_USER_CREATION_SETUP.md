<!-- # Active Directory User Creation Setup Guide

This guide will help you configure your application to automatically create users in Active Directory whenever a new user is created locally.

## Prerequisites

1. **Windows Server with Active Directory Domain Services** installed and configured
2. **PowerShell with Active Directory module** installed on the server running your Node.js application
3. **Service account** with permissions to create users in Active Directory
4. **Network connectivity** between your application server and the domain controller

## Configuration Steps

### 1. Install Active Directory PowerShell Module

On your application server, install the AD PowerShell module:

```powershell
# Install RSAT AD PowerShell module
Install-WindowsFeature -Name RSAT-AD-PowerShell

# Or if using Windows 10/11
Enable-WindowsOptionalFeature -Online -FeatureName RSATClient-Roles-AD-Powershell
```

### 2. Configure Service Account Permissions

Your service account needs the following permissions:
- **Create User Objects** in the target OU
- **Reset Password** permission
- **Write All Properties** on User objects

To set these permissions:
1. Open **Active Directory Users and Computers**
2. Right-click on the OU where users will be created
3. Select **Properties** → **Security**
4. Add your service account and grant the necessary permissions

### 3. Update Environment Variables

Copy `.env.example` to `.env` and configure the following:

```bash
# Authentication Method
AUTH_METHOD=hybrid

# Active Directory Configuration
AD_URL=LDAP://192.168.16.40:389
AD_BASE_DN=DC=Sharepoint,DC=corp
AD_USERNAME=aa@Sharepoint.corp
AD_PASSWORD=Yello100
AD_DOMAIN=Sharepoint.corp

# AD User Creation Settings
AD_CREATE_USERS=true
AD_CREATION_REQUIRED=true
AD_USERS_OU=CN=Users,DC=Sharepoint.corp,DC=hybrid
```

### 4. Configuration Options Explained

- **`AD_CREATE_USERS=true`**: Enables automatic AD user creation
- **`AD_CREATION_REQUIRED=false`**: If `true`, user creation fails if AD creation fails. If `false`, user is created locally even if AD creation fails
- **`AD_USERS_OU`**: Organizational Unit where new users will be created. If not specified, uses `CN=Users,{baseDN}`

## How It Works

### User Creation Process

1. **User registers** via `/auth/register` or **admin creates user** via `/admin/users`
2. **User created in local database** with hashed password
3. **If AD is configured** (`AD_CREATE_USERS=true`):
   - Application attempts to create user in Active Directory
   - Uses PowerShell `New-ADUser` command
   - Sets initial password and enables account
4. **Activity logged** with creation status
5. **Response includes** `adStatus` field indicating AD creation result

### User Deletion Process

1. **Admin deletes user** via `/admin/users/:id`
2. **If AD is configured**:
   - Application attempts to delete user from Active Directory first
   - Uses PowerShell `Remove-ADUser` command
3. **User deleted from local database**
4. **Activity logged** with deletion status

## Testing the Setup

### 1. Test AD Connection

```bash
node diagnose-ad.js
```

### 2. Test AD User Creation

```bash
node console-admin.js
```

Create a test user and verify it appears in both:
- Local database
- Active Directory Users and Computers

### 3. Monitor Activity Logs

Check the activity logs to see AD user creation/deletion attempts:
- `AD_USER_CREATED`: Successful AD user creation
- `AD_USER_CREATION_FAILED`: Failed AD user creation
- `AD_USER_DELETED`: Successful AD user deletion
- `AD_USER_DELETION_FAILED`: Failed AD user deletion

## Troubleshooting

### Common Issues

1. **PowerShell Module Not Found**
   ```
   Install-WindowsFeature -Name RSAT-AD-PowerShell
   ```

2. **Access Denied Errors**
   - Verify service account has proper permissions
   - Check if account is in the correct groups

3. **User Already Exists in AD**
   - The system checks for existing users before creation
   - Clean up any test users manually if needed

4. **Network Connectivity Issues**
   - Use `diagnose-ad.js` to test connectivity
   - Check firewall settings for LDAP ports (389, 636)

### Logs to Check

- **Application logs**: Console output shows AD creation attempts
- **Windows Event Logs**: Active Directory events
- **Activity logs**: Database activity log table

## Security Considerations

1. **Service Account Security**:
   - Use a dedicated service account
   - Grant minimal required permissions
   - Regularly rotate password

2. **Password Handling**:
   - Passwords are passed to PowerShell securely
   - Original passwords are hashed in local database
   - AD passwords follow domain password policy

3. **Network Security**:
   - Use LDAPS (636) if possible for encrypted communication
   - Ensure secure network between application and DC

## API Response Changes

With AD integration enabled, API responses now include an `adStatus` field:

```json
{
  "message": "User created successfully",
  "user": { ... },
  "adStatus": "success"  // or "failed" or "not_configured"
}
```

Possible `adStatus` values:
- `"success"`: User created successfully in AD
- `"failed"`: User creation failed in AD (check logs)
- `"not_configured"`: AD user creation is disabled

## Best Practices

1. **Test in Development First**: Always test AD integration in a dev environment
2. **Monitor Regularly**: Check activity logs for failed AD operations
3. **Have Fallback Plan**: Consider what to do if AD is temporarily unavailable
4. **Document Your OU Structure**: Keep track of where users are created
5. **Regular Cleanup**: Periodically audit and clean up test accounts

## Manual Cleanup

If you need to manually clean up test users:

```powershell
# Remove test user from AD
Remove-ADUser -Identity "testuser@domain.local" -Confirm:$false

# Remove from local database
DELETE FROM users WHERE email = 'testuser@domain.local';
``` -->
