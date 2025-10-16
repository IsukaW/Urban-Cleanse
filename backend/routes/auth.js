const express = require('express');
const { register, login, getProfile, updateProfile, createUser } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin only routes
router.post('/create-user', protect, adminOnly, createUser);

module.exports = router;
