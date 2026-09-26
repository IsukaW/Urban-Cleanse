const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { securityHeaders } = require('./middleware/securityHeaders'); //V07

// Load environment variables
dotenv.config();

// Refuse to start with a missing/default/weak JWT signing secret, since
// tokens signed with a guessable secret can be forged by anyone (UC-V02).
const KNOWN_PLACEHOLDER_SECRETS = [
  'your_secure_secret_key_here_make_it_long_and_random_123456789',
  'your-super-secret-jwt-key',
  'secret',
  'changeme'
];
if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32 ||
  KNOWN_PLACEHOLDER_SECRETS.includes(process.env.JWT_SECRET)
) {
  console.error(
    'FATAL: JWT_SECRET is missing, too short, or a known placeholder value. ' +
    'Set a strong random secret (e.g. `openssl rand -hex 64`) in your .env file.'
  );
  process.exit(1);
}

// Connect to database
connectDB();

const app = express();

// Middleware
// security headers go first so every response gets them, 404s and errors too (V07)
app.use(securityHeaders()); //V07
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Add root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UrbanCleanse API is running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users'
    }
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/waste', require('./routes/waste'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bins', require('./routes/bins'));
app.use('/api/collection', require('./routes/collection'));
app.use('/api/routes', require('./routes/routes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Remove or comment out app.listen for Vercel
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
