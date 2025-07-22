# Activity Log Feature Documentation

## Overview

The activity log feature has been successfully added to your authenticator app. This feature tracks and displays user activities including login times, password changes, and other security-related events.

## Features Added

### 🔐 Login Tracking
- Successful logins (both local and Active Directory)
- Failed login attempts with IP address tracking
- Login time and location information

### 🔑 Password Change Notifications
- Successful password changes
- Failed password change attempts
- Tracks when and from where password changes occurred

### 📝 User Registration Tracking
- Account creation events
- Registration timestamp and details

### ✏️ Profile Updates
- Profile modification tracking
- Tracks changes to name and email

### 📊 Activity Dashboard
- Recent activity summary
- Security event statistics
- Last login time display

## Database Schema

The following table has been created:

```sql
activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    ip_address NVARCHAR(45), -- Supports IPv6
    user_agent NVARCHAR(1000),
    timestamp DATETIME2(0) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT FK_activity_logs_users 
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);
```

## Activity Types Tracked

- `LOGIN` - Successful login
- `LOGIN_FAILED` - Failed login attempt
- `REGISTER` - Account registration
- `PASSWORD_CHANGED` - Successful password change
- `PASSWORD_CHANGE_FAILED` - Failed password change attempt
- `PROFILE_UPDATED` - Profile information updated

## API Endpoints

### Get Activity Log
```
GET /api/activity?page=1&limit=10
Authorization: Bearer {token}
```

### Get Activity Summary
```
GET /api/activity/summary
Authorization: Bearer {token}
```

### Change Password
```
PUT /api/users/change-password
Content-Type: application/json
Authorization: Bearer {token}

{
  "currentPassword": "current_password",
  "newPassword": "new_password"
}
```

## Frontend Components

### ActivityLog Component (`/activity`)
- Full activity history with pagination
- Activity filtering by type
- Detailed view with timestamps and IP addresses
- Security tips and recommendations

### Dashboard Integration
- Activity log access button
- Quick overview of recent activities
- Last login time display

## How to Use

### For Users:

1. **View Activity Log**: 
   - Navigate to Dashboard → Click "View Activity"
   - Or go directly to `/activity`

2. **Monitor Security**:
   - Check for unfamiliar login locations
   - Review failed login attempts
   - Verify password change notifications

3. **Change Password**:
   - Go to Security Settings → Change Password
   - All password changes are logged automatically

### For Developers:

1. **Logging Activities**:
```javascript
const { logActivity } = require('./routes/activity');
await logActivity(userId, 'CUSTOM_ACTION', 'Description', ipAddress, userAgent);
```

2. **Adding New Activity Types**:
- Update the activity types in `ActivityLog.js`
- Add appropriate icons and colors
- Create server-side logging calls

## Setup Instructions

The activity log feature is already set up and running. However, if you need to re-run the setup:

```bash
cd server
node setup-activity-logs.js
```

## Security Features

- **IP Address Tracking**: All activities include the user's IP address
- **User Agent Logging**: Browser/device information is recorded
- **Failed Attempt Monitoring**: Security threats are logged
- **Automatic Cleanup**: Old logs can be cleaned up via API
- **Privacy Protection**: Only users can see their own activity

## Database Maintenance

### Clean Up Old Logs
```
DELETE /api/activity/cleanup?days=90
Authorization: Bearer {token}
```

### Monitoring Tables
```sql
-- Check activity log size
SELECT COUNT(*) FROM activity_logs;

-- Get recent activities
SELECT TOP 10 * FROM activity_logs ORDER BY timestamp DESC;

-- Activity statistics
SELECT activity_type, COUNT(*) as count 
FROM activity_logs 
GROUP BY activity_type 
ORDER BY count DESC;
```

## Troubleshooting

### Common Issues:

1. **Activity Log Not Loading**:
   - Check server is running on port 3001
   - Verify database connection
   - Check browser console for errors

2. **Database Connection Issues**:
   - Verify `.env` file configuration
   - Check SQL Server is running
   - Confirm database credentials

3. **Migration Errors**:
   - Ensure user has database permissions
   - Check if tables already exist
   - Verify SQL Server version compatibility

## Security Considerations

- Activity logs contain sensitive information
- Only authenticated users can access their own logs
- IP addresses and user agents are logged for security
- Consider implementing log retention policies
- Regular monitoring of failed login attempts is recommended

## Future Enhancements

Potential improvements that could be added:
- Email notifications for suspicious activities
- Geographic IP location tracking
- Session management and device tracking
- Export functionality for activity logs
- Advanced filtering and search capabilities
- Real-time activity notifications

## Support

If you encounter any issues with the activity log feature:

1. Check the server logs for error messages
2. Verify database connectivity
3. Ensure all environment variables are set correctly
4. Test API endpoints with tools like Postman

The activity log feature enhances the security and transparency of your authenticator application by providing comprehensive user activity tracking and monitoring capabilities.
