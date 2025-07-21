// Load environment variables first
require('dotenv').config();

const express = require('express');
const { initializeDatabase, closeDatabase } = require('./config/database');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true 
};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
const routes = require('./routes');
app.use('/api', routes);

// Initialize and connect to the databasee
initializeDatabase().catch(err => console.error('Failed to initialize database:', err));

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  closeDatabase().then(() => {
    process.exit(0);
  }).catch(err => {
    process.exit(1);
  });
});
