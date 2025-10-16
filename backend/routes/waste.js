const express = require('express');
const {
  getWasteTypes,
  checkSchedule,
  createWasteRequest,
  getUserRequests,
  getAllRequests,
  updateRequestStatus,
  getRequestById,
  getAdminStats,
  createWasteType,
  updateWasteType,
  deleteWasteType,
  getAllWasteTypesAdmin,
  createDefaultWasteTypes,
  resetAllWasteTypes,
  getApprovedRequestsToday,
  getAvailableWorkers,
  debugWorkerAssignments,
  getAdminAlerts,
  debugRequestState
} = require('../controllers/wasteController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/types', getWasteTypes);

// Protected routes
router.get('/check-schedule', protect, checkSchedule);
router.post('/request', protect, createWasteRequest);
router.get('/requests', protect, getUserRequests);
router.get('/requests/:id', protect, getRequestById);

// Admin only routes
router.get('/admin/types', protect, adminOnly, getAllWasteTypesAdmin);
router.get('/admin/approved-today', protect, adminOnly, getApprovedRequestsToday);
router.get('/admin/workers', protect, adminOnly, getAvailableWorkers);
router.get('/admin/debug-assignments', protect, adminOnly, debugWorkerAssignments);
router.get('/admin/alerts', protect, adminOnly, getAdminAlerts);
router.get('/admin/debug-requests/:requestId', protect, adminOnly, debugRequestState);
router.post('/admin/initialize-defaults', protect, adminOnly, createDefaultWasteTypes);
router.delete('/admin/reset-all', protect, adminOnly, resetAllWasteTypes);
router.get('/admin/requests', protect, adminOnly, getAllRequests);
router.get('/admin/stats', protect, adminOnly, getAdminStats);
router.post('/types', protect, adminOnly, createWasteType);
router.put('/types/:id', protect, adminOnly, updateWasteType);
router.delete('/types/:id', protect, adminOnly, deleteWasteType);
router.put('/admin/requests/:id', protect, adminOnly, updateRequestStatus);

module.exports = router;
