const express = require('express');
const { 
  getAllUsers, 
  getUserById, 
  updateUser, 
  deleteUser, 
  getUserStats,
  getDashboardStats
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Admin only routes
router.get('/stats', protect, adminOnly, getUserStats);
router.get('/', protect, adminOnly, getAllUsers);
router.put('/:id', protect, adminOnly, updateUser);
router.delete('/:id', protect, adminOnly, deleteUser);

// Protected routes - require authentication
router.get('/dashboard', protect, getDashboardStats);
router.get('/:id', protect, getUserById);

module.exports = router;
