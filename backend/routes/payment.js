const express = require('express');
const {
  processPayment,
  retryPayment,
  getPaymentStatus,
  paymentWebhook
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Protected routes
router.post('/process', protect, processPayment);
router.post('/retry', protect, retryPayment);
router.get('/status/:requestId', protect, getPaymentStatus);

// Admin routes
router.post('/webhook', protect, adminOnly, paymentWebhook);

module.exports = router;
