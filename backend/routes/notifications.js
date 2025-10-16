const express = require('express');
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyWasteRequestStatusChange,
  notifyAdminsNewRequest,
  notifyWorkerRouteAssigned
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.get('/', protect, getUserNotifications);
router.put('/:id/read', protect, markNotificationAsRead);
router.put('/read-all', protect, markAllNotificationsAsRead);
router.post('/waste-request', protect, notifyWasteRequestStatusChange);
router.post('/admin/new-request', protect, notifyAdminsNewRequest);
router.post('/worker/route-assigned', protect, notifyWorkerRouteAssigned);

module.exports = router;
