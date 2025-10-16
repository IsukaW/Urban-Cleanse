const WasteRequest = require('../models/WasteRequest');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Route = require('../models/Route');
const Bin = require('../models/Bin');

// Helper function to create notification
const createNotification = async (userId, type, title, message, relatedId = null) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      relatedId
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 7, unreadOnly = false } = req.query;

    const query = { userId };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId, isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { 
        isRead: true, 
        readAt: new Date() 
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { 
        isRead: true, 
        readAt: new Date() 
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create notification for waste request status change
// @route   POST /api/notifications/waste-request
// @access  Private
const notifyWasteRequestStatusChange = async (req, res) => {
  try {
    const { requestId, status, userId } = req.body;

    if (!requestId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Request ID and status are required'
      });
    }

    const wasteRequest = await WasteRequest.findOne({ requestId })
      .populate('userId', 'name email');

    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    let title, message, type;
    const targetUserId = userId || wasteRequest.userId._id;

    switch (status) {
      case 'approved':
        type = 'waste_request_approved';
        title = 'Waste Collection Approved';
        message = `Your waste collection request ${requestId} has been approved. Collection will be scheduled soon.`;
        break;
      case 'completed':
        type = 'waste_request_completed';
        title = 'Waste Collection Completed';
        message = `Your waste collection request ${requestId} has been completed successfully. Thank you for using UrbanCleanse!`;
        break;
      case 'cancelled':
        type = 'waste_request_cancelled';
        title = 'Waste Collection Cancelled';
        message = `Your waste collection request ${requestId} has been cancelled. Please contact support for more information.`;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid status for notification'
        });
    }

    const notification = await createNotification(targetUserId, type, title, message, requestId);

    res.json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Notify admins of new waste request
// @route   POST /api/notifications/admin/new-request
// @access  Private
const notifyAdminsNewRequest = async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID is required'
      });
    }

    const wasteRequest = await WasteRequest.findOne({ requestId })
      .populate('userId', 'name email');

    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin', isActive: true });

    const notifications = [];
    const title = 'New Waste Collection Request';
    const message = `New ${wasteRequest.collectionType} collection request from ${wasteRequest.userId.name}. Request ID: ${requestId}`;

    // Create notification for each admin
    for (const admin of adminUsers) {
      const notification = await createNotification(
        admin._id, 
        'new_waste_request', 
        title, 
        message, 
        requestId
      );
      if (notification) {
        notifications.push(notification);
      }
    }

    res.json({
      success: true,
      message: 'Admin notifications created successfully',
      data: {
        requestId,
        adminCount: adminUsers.length,
        notifications: notifications.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create admin notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Notify worker of route assignment
// @route   POST /api/notifications/worker/route-assigned
// @access  Private
const notifyWorkerRouteAssigned = async (req, res) => {
  try {
    const { routeId, workerId } = req.body;

    if (!routeId || !workerId) {
      return res.status(400).json({
        success: false,
        message: 'Route ID and Worker ID are required'
      });
    }

    const route = await Route.findOne({ routeId })
      .populate('collectorId', 'name');

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    const title = 'New Route Assigned';
    const message = `You have been assigned a new collection route ${routeId} for ${route.assignedDate.toDateString()}. Total bins: ${route.totalBins}`;

    const notification = await createNotification(
      workerId, 
      'route_assigned', 
      title, 
      message, 
      routeId
    );

    res.json({
      success: true,
      message: 'Worker notification created successfully',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create worker notification',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  notifyWasteRequestStatusChange,
  notifyAdminsNewRequest,
  notifyWorkerRouteAssigned,
  createNotification
};
