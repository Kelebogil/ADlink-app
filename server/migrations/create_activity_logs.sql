-- Create activity_logs table
CREATE TABLE activity_logs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type NVARCHAR(50) NOT NULL,
    description NVARCHAR(500),
    ip_address NVARCHAR(45), -- Supports IPv6
    user_agent NVARCHAR(1000),
    timestamp DATETIME2(0) NOT NULL DEFAULT GETDATE(),
    
    -- Foreign key constraint
    CONSTRAINT FK_activity_logs_users 
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IX_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IX_activity_logs_timestamp ON activity_logs(timestamp DESC);
CREATE INDEX IX_activity_logs_activity_type ON activity_logs(activity_type);

-- Add updated_at column to users table if it doesn't exist
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'updated_at')
BEGIN
    ALTER TABLE users ADD updated_at DATETIME2(0) DEFAULT GETDATE();
END;

PRINT 'Activity logs table and indexes created successfully!';
