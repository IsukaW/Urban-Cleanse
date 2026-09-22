const express = require('express');
const { register, login, googleAuth, getProfile, updateProfile, createUser } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);

// Protected routes
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

// Admin only routes
router.post('/create-user', protect, adminOnly, createUser);

module.exports = router;
