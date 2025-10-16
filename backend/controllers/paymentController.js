const WasteRequest = require('../models/WasteRequest');

// @desc    Process payment simulation
// @route   POST /api/payment/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { requestId, paymentMethod, cardNumber } = req.body;

    console.log('[PAYMENT] Processing payment for request:', requestId);

    // Validate required fields
    if (!requestId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and payment method are required'
      });
    }

    // Find the waste request
    const wasteRequest = await WasteRequest.findOne({ requestId });
    
    if (!wasteRequest) {
      console.log('[PAYMENT] Waste request not found:', requestId);
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    console.log('[PAYMENT] Found waste request:', {
      requestId: wasteRequest.requestId,
      userId: wasteRequest.userId,
      currentPaymentStatus: wasteRequest.paymentStatus,
      cost: wasteRequest.cost
    });

    // Check if request belongs to the user
    if (wasteRequest.userId.toString() !== req.user._id.toString()) {
      console.log('[PAYMENT] Unauthorized payment attempt');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to pay for this request'
      });
    }

    // Check if already paid
    if (wasteRequest.paymentStatus === 'paid') {
      console.log('[PAYMENT] Request already paid');
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this request'
      });
    }

    // Check if payment is pending or failed (allow retry)
    if (!['pending', 'failed'].includes(wasteRequest.paymentStatus)) {
      console.log('[PAYMENT] Invalid payment status:', wasteRequest.paymentStatus);
      return res.status(400).json({
        success: false,
        message: `Payment is not in pending status (current: ${wasteRequest.paymentStatus})`
      });
    }

    console.log('[PAYMENT] Starting payment simulation...');

    // Improved payment simulation logic
    let isPaymentSuccessful;
    
    // In development, make success rate higher (95%)
    // In production, you can adjust this or use real payment gateway
    if (process.env.NODE_ENV === 'development') {
      isPaymentSuccessful = Math.random() > 0.05; // 95% success rate in dev
    } else {
      isPaymentSuccessful = Math.random() > 0.1; // 90% success rate in prod
    }

    // Simulate specific failure conditions for testing
    if (cardNumber === '4000000000000002') {
      isPaymentSuccessful = false; // Test card for declined payments
    } else if (cardNumber === '4000000000000119') {
      isPaymentSuccessful = true; // Test card for successful payments
    }
    
    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (isPaymentSuccessful) {
      console.log('[PAYMENT] Payment successful');
      
      // Update payment status to paid
      wasteRequest.paymentStatus = 'paid';
      await wasteRequest.save();

      // Generate payment confirmation
      const paymentConfirmation = {
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        amount: wasteRequest.cost,
        paymentMethod,
        status: 'completed',
        timestamp: new Date(),
        requestId: wasteRequest.requestId
      };

      console.log('[PAYMENT] Payment confirmation generated:', paymentConfirmation.transactionId);

      // Send notification about successful payment (optional, don't fail if this fails)
      try {
        console.log('[PAYMENT] Sending confirmation notification...');
        // Note: This would require the notification service to be running
        // For now, just log the notification
        console.log(`📧 Payment confirmation sent for request ${wasteRequest.requestId}`);
      } catch (notificationError) {
        console.log('[PAYMENT] Failed to send notification (non-critical):', notificationError.message);
      }

      res.json({
        success: true,
        message: 'Payment processed successfully! Your waste collection request has been confirmed.',
        data: {
          paymentConfirmation,
          wasteRequest: {
            ...wasteRequest.toObject(),
            paymentStatus: 'paid'
          }
        }
      });
    } else {
      console.log('[PAYMENT] Payment failed');
      
      // Update payment status to failed
      wasteRequest.paymentStatus = 'failed';
      await wasteRequest.save();

      res.status(402).json({
        success: false,
        message: 'Payment processing failed. Please check your payment details and try again.',
        data: {
          requestId,
          amount: wasteRequest.cost,
          status: 'failed',
          canRetry: true,
          errorCode: 'PAYMENT_DECLINED',
          timestamp: new Date()
        }
      });
    }
  } catch (error) {
    console.error('[PAYMENT] Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment processing error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Retry failed payment
// @route   POST /api/payment/retry
// @access  Private
const retryPayment = async (req, res) => {
  try {
    const { requestId, paymentMethod, cardNumber } = req.body;

    console.log('[PAYMENT] Retrying payment for request:', requestId);

    const wasteRequest = await WasteRequest.findOne({ requestId });
    
    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    // Check if request belongs to the user
    if (wasteRequest.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to retry payment for this request'
      });
    }

    // Check if payment can be retried
    if (wasteRequest.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed'
      });
    }

    if (!['pending', 'failed'].includes(wasteRequest.paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be retried at this time'
      });
    }

    // Reset to pending and retry
    wasteRequest.paymentStatus = 'pending';
    await wasteRequest.save();

    console.log('[PAYMENT] Payment status reset to pending, retrying...');

    // Call the payment processing again
    req.body = { requestId, paymentMethod, cardNumber };
    return processPayment(req, res);

  } catch (error) {
    console.error('[PAYMENT] Payment retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment retry failed',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get payment status
// @route   GET /api/payment/status/:requestId
// @access  Private
const getPaymentStatus = async (req, res) => {
  try {
    const { requestId } = req.params;

    console.log('[PAYMENT] Getting payment status for:', requestId);

    const wasteRequest = await WasteRequest.findOne({ requestId })
      .populate('userId', 'name email');

    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    // Check if request belongs to the user or user is admin
    if (wasteRequest.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment status'
      });
    }

    res.json({
      success: true,
      data: {
        requestId,
        paymentStatus: wasteRequest.paymentStatus,
        amount: wasteRequest.cost,
        collectionType: wasteRequest.collectionType,
        preferredDate: wasteRequest.preferredDate,
        status: wasteRequest.status,
        createdAt: wasteRequest.createdAt,
        updatedAt: wasteRequest.updatedAt
      }
    });
  } catch (error) {
    console.error('[PAYMENT] Error fetching payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Simulate webhook for payment confirmation (for testing)
// @route   POST /api/payment/webhook
// @access  Private/Admin
const paymentWebhook = async (req, res) => {
  try {
    const { transactionId, requestId, status, amount } = req.body;

    console.log('[PAYMENT] Webhook received:', { transactionId, requestId, status });

    if (!transactionId || !requestId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID, request ID, and status are required'
      });
    }

    const wasteRequest = await WasteRequest.findOne({ requestId });
    
    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    // Update payment status based on webhook
    if (status === 'completed' || status === 'paid') {
      wasteRequest.paymentStatus = 'paid';
    } else if (status === 'failed' || status === 'declined') {
      wasteRequest.paymentStatus = 'failed';
    }

    await wasteRequest.save();

    console.log('[PAYMENT] Webhook processed successfully');

    res.json({
      success: true,
      message: 'Webhook processed successfully',
      data: {
        requestId,
        paymentStatus: wasteRequest.paymentStatus
      }
    });
  } catch (error) {
    console.error('[PAYMENT] Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};

module.exports = {
  processPayment,
  retryPayment,
  getPaymentStatus,
  paymentWebhook
};
