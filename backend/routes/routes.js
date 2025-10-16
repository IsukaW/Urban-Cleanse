const express = require('express');
const {
  getBinsByArea,
  getAvailableWorkers,
  createRoute,
  getRoutes,
  getRouteById,
  updateRouteStatus,
  deleteRoute,
  getRouteStats,
  generateRoutePDF
} = require('../controllers/routeController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Admin-only routes for route management
router.get('/bins-by-area', protect, adminOnly, getBinsByArea);
router.get('/available-workers', protect, adminOnly, getAvailableWorkers);
router.post('/create', protect, adminOnly, createRoute);
router.post('/generate-pdf', protect, adminOnly, generateRoutePDF);
router.get('/stats', protect, adminOnly, getRouteStats);
router.get('/', protect, getRoutes); // Allow workers to see their own routes
router.get('/:id', protect, getRouteById); // Workers can view their assigned routes
router.put('/:id/status', protect, updateRouteStatus); // Allow workers to update their own route status
router.delete('/:id', protect, adminOnly, deleteRoute);

module.exports = router;