# Authenticator App Server

A Node.js/Express authentication server with JWT token-based authentication and SQL Server database integration.

## Project Structure

```
server/
├── config/
│   └── database.js          # Database configuration and initialization
├── middleware/
│   └── auth.js              # JWT authentication middleware
├── routes/
│   ├── index.js             # Main routes index
│   ├── auth.js              # Authentication routes (login, register)
│   ├── users.js             # User management routes
│   └── api.js               # General API routes (health checks, info)
├── server.js                # Main server file
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## API Endpoints

### Authentication Routes (`/api/auth/`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### User Routes (`/api/users/`) [Protected]
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `DELETE /api/users/profile` - Delete user account
- `GET /api/users/` - Get all users (for testing)

### General API Routes (`/api/`)
- `GET /api/health` - Server health check
- `GET /api/health/db` - Database health check
- `GET /api/info` - API information and available endpoints

## Environment Variables

Create a `.env` file in the server directory with the following variables:


## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables (see above)

4. Start the server:
   ```bash
   npm start
   ```

## Database Schema

The application automatically creates a `users` table with the following structure:

```sql
CREATE TABLE users (
  id INT PRIMARY KEY IDENTITY(1,1),
  name NVARCHAR(100) NOT NULL,
  email NVARCHAR(100) UNIQUE NOT NULL,
  password NVARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT GETDATE()
);
```

## Security Features

- Password hashing using bcrypt
- JWT token-based authentication
- Input validation
- SQL injection prevention using parameterized queries
- CORS enabled for cross-origin requests

## Development

The server includes:
- Automatic database initialization
- Graceful shutdown handling
- Comprehensive error handling
- Structured logging
- Modular route organization

## Testing

You can test the API using tools like Postman or curl:

```bash
# Health check
curl http://localhost:5000/api/health

# Register a new user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"securepassword"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"securepassword"}'
```

## License

This project is licensed under the MIT License.
