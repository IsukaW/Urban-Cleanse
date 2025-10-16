const express = require('express');
const {
  updateBinData,
  getBinStatus,
  getBinById,
  getActiveAlerts,
  createBin,
  acknowledgeAlert,
  findNearestBin,
  registerBin,
  getPendingBins,
  approveBin,
  getUserRegisteredBins,
  updateUserBinData,
  getUserBinData
} = require('../controllers/binController');
const { protect, adminOnly, adminOrWorker } = require('../middleware/auth');

const router = express.Router();

// IMPORTANT: Place specific routes BEFORE parameterized routes

// Admin routes - specific paths first
router.get('/admin/pending', protect, adminOnly, getPendingBins);
router.get('/admin/alerts', protect, adminOnly, getActiveAlerts);
router.get('/users', protect, adminOnly, getUserBinData);
router.get('/nearest', protect, findNearestBin);

// User routes
router.post('/register', protect, registerBin);
router.get('/user/registered', protect, getUserRegisteredBins);
router.put('/user/:id/update', protect, updateUserBinData);

// Admin routes with parameters
router.put('/admin/:id/approve', protect, adminOnly, approveBin);
router.post('/:binId/acknowledge-alert', protect, adminOnly, acknowledgeAlert);
router.put('/:binId/data', protect, adminOnly, updateBinData);

// Routes that can be accessed by multiple roles
router.get('/:binId/status', protect, getBinStatus);
router.get('/:id', protect, getBinById); // This should be LAST among GET routes
router.post('/', protect, adminOnly, createBin);

module.exports = router;
