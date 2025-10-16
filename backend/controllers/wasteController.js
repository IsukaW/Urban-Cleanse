const WasteRequest = require('../models/WasteRequest');
const WasteType = require('../models/WasteType');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// @desc    Get all waste collection types
// @route   GET /api/waste/types
// @access  Public
const getWasteTypes = async (req, res) => {
  try {
    const wasteTypes = await WasteType.find({ isActive: true }).sort({ type: 1 });

    res.json({
      success: true,
      count: wasteTypes.length,
      data: {
        wasteTypes
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch waste types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Check schedule availability for bin and date
// @route   GET /api/waste/check-schedule
// @access  Private
const checkSchedule = async (req, res) => {
  try {
    const { binId, date } = req.query;

    if (!binId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID and date are required'
      });
    }

    // Validate date format and ensure it's in the future
    const requestedDate = new Date(date);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Allow today and future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(requestedDate);
    requestDate.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Date must be today or in the future'
      });
    }

    // Check if bin is already scheduled for that date with the same collection type
    const { collectionType } = req.query; // Get collection type from query params
    
    const conflictingRequest = await WasteRequest.findOne({
      binId,
      preferredDate: {
        $gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(requestedDate.setHours(23, 59, 59, 999))
      },
      ...(collectionType && { collectionType }), // Only check same type if provided
      status: { $in: ['pending', 'approved'] }
    });

    const isAvailable = !conflictingRequest;

    // Get all requests for this date for additional info
    const allRequests = await WasteRequest.find({
      binId,
      preferredDate: {
        $gte: new Date(requestedDate.setHours(0, 0, 0, 0)),
        $lt: new Date(requestedDate.setHours(23, 59, 59, 999))
      }
    }).select('collectionType status');

    res.json({
      success: true,
      data: {
        binId,
        date,
        isAvailable,
        conflictReason: conflictingRequest ? 
          `Already scheduled for ${conflictingRequest.collectionType} collection (${conflictingRequest.status})` : 
          null,
        existingRequests: allRequests.map(r => ({
          type: r.collectionType,
          status: r.status
        })),
        totalRequestsToday: allRequests.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check schedule',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create new waste collection request
// @route   POST /api/waste/request
// @access  Private
const createWasteRequest = async (req, res) => {
  try {
    const {
      binId,
      collectionType,
      preferredDate,
      preferredTimeSlot,
      notes,
      address
    } = req.body;

    // Validate required fields
    if (!binId || !collectionType || !preferredDate || !preferredTimeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID, collection type, preferred date, and preferred time slot are required'
      });
    }

    // Validate time slot
    const validTimeSlots = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
    if (!validTimeSlots.includes(preferredTimeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferred time slot. Valid slots are: ' + validTimeSlots.join(', ')
      });
    }

    console.log('Received binId for waste request:', binId); // Debug log

    // Validate bin ID format before proceeding
    const binIdPattern = /^BIN-\d+-[A-Z0-9]+$/;
    if (!binIdPattern.test(binId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Bin ID format. Expected format: BIN-timestamp-randomString'
      });
    }

    // Check if user is active
    const user = await User.findById(req.user._id);
    if (!user || !user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Validate that the bin exists and belongs to the user
    const Bin = require('../models/Bin');
    const bin = await Bin.findOne({ 
      binId: binId,
      registeredBy: req.user._id,
      isActive: true,
      approvedBy: { $exists: true, $ne: null }
    });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found or not approved. Please ensure you have a registered and approved bin.'
      });
    }

    console.log('Bin validation passed for:', binId); // Debug log

    // Validate collection type exists
    const wasteType = await WasteType.findOne({ 
      type: collectionType, 
      isActive: true 
    });
    
    if (!wasteType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collection type'
      });
    }

    // Parse and validate the preferred date
    const requestedDate = new Date(preferredDate);
    if (isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Allow today and future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const requestDate = new Date(requestedDate);
    requestDate.setHours(0, 0, 0, 0);
    
    if (requestDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Preferred date must be today or in the future'
      });
    }

    // Check schedule availability - allow multiple requests per day for different waste types
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for conflicting requests (same bin, same date, same collection type, and still active)
    const conflictingRequest = await WasteRequest.findOne({
      binId,
      preferredDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      collectionType: collectionType, // Same waste type
      status: { $in: ['pending', 'approved'] } // Only active requests
    });

    if (conflictingRequest) {
      return res.status(409).json({
        success: false,
        message: `This bin already has a pending ${collectionType} waste collection request for this date. Please wait for it to be completed or choose a different waste type.`
      });
    }

    // Check existing requests for today (for logging/info purposes)
    const allRequestsToday = await WasteRequest.find({
      binId,
      preferredDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    if (allRequestsToday.length > 0) {
      console.log(`[CREATE_REQUEST] Bin ${binId} already has ${allRequestsToday.length} request(s) for ${requestedDate.toDateString()}`);
      console.log(`[CREATE_REQUEST] Existing requests:`, allRequestsToday.map(r => `${r.collectionType} (${r.status})`));
      console.log(`[CREATE_REQUEST] New request for: ${collectionType}`);
    }

    // Calculate cost
    const cost = wasteType.baseCost;

    // Generate unique request ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const requestId = `WR-${timestamp}-${random}`;

    // Create waste request with payment status as 'pending'
    const wasteRequestData = {
      requestId,
      userId: req.user._id,
      binId,
      collectionType,
      preferredDate: requestedDate,
      preferredTimeSlot,
      cost,
      paymentStatus: 'pending',
      status: 'pending',
      notes: notes || '',
      address: address || {}
    };

    console.log('Creating waste request with data:', wasteRequestData);

    const wasteRequest = await WasteRequest.create(wasteRequestData);

    // Update bin status to indicate collection is requested
    // Different logic based on existing requests and waste type
    if (bin.status === 'Empty' || bin.fillLevel <= 20) {
      let newFillLevel = 60; // Default
      
      // Check if there are other active requests today
      const activeRequestsToday = allRequestsToday.filter(r => 
        r.status === 'pending' || r.status === 'approved'
      );
      
      // Adjust fill level based on multiple requests
      if (activeRequestsToday.length > 0) {
        // Multiple requests = more waste accumulated
        newFillLevel = Math.min(90, 60 + (activeRequestsToday.length * 15));
      } else {
        // Check if there were completed requests today
        const completedToday = allRequestsToday.filter(r => r.status === 'completed');
        if (completedToday.length > 0) {
          newFillLevel = 50; // Less waste if bin was emptied today
        }
      }
      
      const newStatus = newFillLevel >= 80 ? 'Full' : 'Half-Full';
      
      await Bin.findOneAndUpdate(
        { binId },
        { 
          fillLevel: newFillLevel,
          status: newStatus,
          lastUpdated: new Date()
        }
      );
      
      console.log(`[CREATE_REQUEST] Updated bin ${binId} status to ${newStatus} (${newFillLevel}%) - ${collectionType} waste request added`);
      console.log(`[CREATE_REQUEST] Total requests for today: ${allRequestsToday.length + 1} (${activeRequestsToday.length + 1} active)`);
    }

    // Populate user details for response
    await wasteRequest.populate('userId', 'name email');

    console.log('Waste request created successfully:', wasteRequest.requestId);

    // Send notification to admins about new request
    try {
      await notifyAdminsOfNewRequest(wasteRequest);
    } catch (notificationError) {
      console.error('Failed to notify admins (non-critical):', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Waste collection request created successfully. Please proceed with payment to confirm your request.',
      data: {
        wasteRequest,
        requiresPayment: true,
        paymentAmount: cost
      }
    });
  } catch (error) {
    console.error('Error creating waste request:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate request ID generated. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create waste request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Helper function to notify admins of new requests
const notifyAdminsOfNewRequest = async (wasteRequest) => {
  try {
    console.log(`[NOTIFICATION] Notifying admins of new request: ${wasteRequest.requestId}`);
    
    // Find all admin users
    const adminUsers = await User.find({ 
      role: 'admin', 
      isActive: true 
    }).select('name email');

    // Create notification for each admin
    for (const admin of adminUsers) {
      const title = 'New Waste Collection Request';
      const message = `New ${wasteRequest.collectionType} collection request from ${wasteRequest.userId.name}. Request ID: ${wasteRequest.requestId}`;
      
      await createNotification(
        admin._id, 
        'new_waste_request', 
        title, 
        message, 
        wasteRequest.requestId
      );

      console.log(`📧 Admin notification created for ${admin.email}:`);
      console.log(`   New waste collection request: ${wasteRequest.requestId}`);
      console.log(`   Customer: ${wasteRequest.userId.name}`);
      console.log(`   Type: ${wasteRequest.collectionType}`);
      console.log(`   Amount: $${wasteRequest.cost}`);
    }
    
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying admins:', error);
    throw error;
  }
};

// @desc    Get user's waste requests
// @route   GET /api/waste/requests
// @access  Private
const getUserRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { userId: req.user._id };

    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const requests = await WasteRequest.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WasteRequest.countDocuments(filter);

    res.json({
      success: true,
      count: requests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        requests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get all waste requests (admin only)
// @route   GET /api/waste/admin/requests
// @access  Private/Admin
const getAllRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by status if provided
    if (req.query.status) {
      filter.status = req.query.status;
    }

    // Filter by collection type if provided
    if (req.query.collectionType) {
      filter.collectionType = req.query.collectionType;
    }

    // Filter by date range if provided (Request Created From/To)
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      
      if (req.query.fromDate) {
        const fromDate = new Date(req.query.fromDate);
        fromDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = fromDate;
      }
      
      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    console.log('[ADMIN_REQUESTS] Fetching requests with filter:', filter);

    const requests = await WasteRequest.find(filter)
      .populate('userId', 'name email')
      .populate({
        path: 'assignedWorker',
        select: 'name email role',
        model: 'User'
      })
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log(`[ADMIN_REQUESTS] Found ${requests.length} requests`);
    
    // Debug log to check assigned workers
    requests.forEach(req => {
      if (req.assignedWorker) {
        console.log(`[DEBUG] Request ${req.requestId} assigned to: ${req.assignedWorker.name} (${req.assignedWorker.role})`);
      } else {
        console.log(`[DEBUG] Request ${req.requestId} not assigned to any worker`);
      }
    });

    const total = await WasteRequest.countDocuments(filter);

    res.json({
      success: true,
      count: requests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: {
        requests
      }
    });
  } catch (error) {
    console.error('[ADMIN_REQUESTS] Error fetching requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch requests',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Update waste request status (admin only)
// @route   PUT /api/waste/admin/requests/:id
// @access  Private/Admin
const updateRequestStatus = async (req, res) => {
  try {
    const { status, notes, assignedWorkerId, scheduledDate, scheduledTimeSlot } = req.body;
    const requestId = req.params.id;

    console.log(`[UPDATE_REQUEST] Updating request ${requestId} with:`, {
      status,
      assignedWorkerId,
      scheduledDate,
      scheduledTimeSlot,
      adminId: req.user._id
    });

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const validStatuses = ['pending', 'approved', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: pending, approved, completed, cancelled'
      });
    }

    const wasteRequest = await WasteRequest.findById(requestId)
      .populate('userId', 'name email')
      .populate('assignedWorker', 'name email role');

    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    const oldStatus = wasteRequest.status;
    wasteRequest.status = status;
    
    if (notes) {
      wasteRequest.notes = wasteRequest.notes ? `${wasteRequest.notes}\n\nAdmin Note: ${notes}` : `Admin Note: ${notes}`;
    }

    // Manual approval process - admin must provide worker and date
    if (status === 'approved' && oldStatus !== 'approved') {
      // Check if payment is completed
      if (wasteRequest.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve request - payment not completed'
        });
      }

      // For approval, require worker assignment and scheduled date
      if (!assignedWorkerId) {
        return res.status(400).json({
          success: false,
          message: 'Worker assignment is required for approval'
        });
      }

      if (!scheduledDate) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled collection date is required for approval'
        });
      }

      if (!scheduledTimeSlot) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time slot is required for approval'
        });
      }

      // Validate time slot
      const validTimeSlots = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
      if (!validTimeSlots.includes(scheduledTimeSlot)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time slot. Valid slots are: ' + validTimeSlots.join(', ')
        });
      }

      // Validate scheduled date - allow today and future dates
      const schedDate = new Date(scheduledDate);
      if (isNaN(schedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be a valid date'
        });
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const scheduleDate = new Date(schedDate);
      scheduleDate.setHours(0, 0, 0, 0);
      
      if (scheduleDate < today) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be today or in the future'
        });
      }

      // Verify worker exists and is active
      const worker = await User.findOne({ 
        _id: assignedWorkerId, 
        role: { $in: ['wc1', 'wc2', 'wc3'] },
        isActive: true 
      });

      if (!worker) {
        return res.status(400).json({
          success: false,
          message: 'Selected worker not found or inactive'
        });
      }

      // Check if worker is already assigned to another request on the same scheduled date and time slot
      const startOfDay = new Date(schedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(schedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const conflictingAssignment = await WasteRequest.findOne({
        assignedWorker: assignedWorkerId,
        scheduledDate: {
          $gte: startOfDay,
          $lt: endOfDay
        },
        scheduledTimeSlot: scheduledTimeSlot, // Check for same time slot
        status: { $in: ['approved', 'completed'] },
        _id: { $ne: wasteRequest._id } // Exclude current request if updating
      }).populate('userId', 'name');

      if (conflictingAssignment) {
        return res.status(409).json({
          success: false,
          message: `Worker ${worker.name} is already assigned to another collection on ${schedDate.toDateString()} at time slot ${scheduledTimeSlot}. Conflicting request: ${conflictingAssignment.requestId} for customer ${conflictingAssignment.userId.name}. Please choose a different worker, date, or time slot.`
        });
      }

      try {
        // Log the state before assignment
        console.log(`[MANUAL_APPROVAL] Before assignment - Request ${wasteRequest.requestId} state:`, {
          status: wasteRequest.status,
          assignedWorker: wasteRequest.assignedWorker,
          routeId: wasteRequest.routeId
        });
        
        // Create or update route for the worker
        const routeId = await createOrUpdateRouteForWorker(wasteRequest, assignedWorkerId, schedDate, req.user._id);
        
        // Update assignment fields properly
        wasteRequest.assignedWorker = assignedWorkerId;
        wasteRequest.assignedAt = new Date();
        wasteRequest.assignedBy = req.user._id;
        wasteRequest.scheduledDate = schedDate;
        wasteRequest.scheduledTimeSlot = scheduledTimeSlot; // Set the scheduled time slot
        wasteRequest.routeId = routeId; // Set the route ID
        
        console.log(`[MANUAL_APPROVAL] After assignment - Request ${wasteRequest.requestId} assigned to route ${routeId}`);
        
        const assignmentNote = `Manually assigned to ${worker.name} (${worker.role.toUpperCase()}) for collection on ${schedDate.toDateString()} at ${scheduledTimeSlot}`;
        wasteRequest.notes = wasteRequest.notes ? `${wasteRequest.notes}\n\n${assignmentNote}` : assignmentNote;
        
        // Update bin status to indicate collection is scheduled
        const Bin = require('../models/Bin');
        const currentBin = await Bin.findOne({ binId: wasteRequest.binId });
        if (currentBin && currentBin.status === 'Empty') {
          await Bin.findOneAndUpdate(
            { binId: wasteRequest.binId },
            { 
              fillLevel: Math.max(currentBin.fillLevel, 70), // Assume it's at least mostly full for collection
              status: currentBin.fillLevel > 100 ? 'Overflow' : (currentBin.fillLevel >= 80 ? 'Full' : 'Half-Full'),
              lastUpdated: new Date()
            }
          );
          console.log(`[APPROVAL] Updated bin ${wasteRequest.binId} status for scheduled collection`);
        }
        
        console.log(`[MANUAL_APPROVAL] Request ${wasteRequest.requestId} assigned to worker ${worker.name} (ID: ${assignedWorkerId}) for ${schedDate.toDateString()}`);
      } catch (assignmentError) {
        console.error('[MANUAL_APPROVAL] Worker assignment failed:', assignmentError);
        return res.status(500).json({
          success: false,
          message: `Worker assignment failed: ${assignmentError.message}`
        });
      }
    }

    // Handle status change back to pending - clear assignment and remove from routes
    if (status === 'pending' && oldStatus !== 'pending') {
      // Warn if trying to reset a completed request
      if (oldStatus === 'completed') {
        console.warn(`[RESET_TO_PENDING] WARNING: Resetting completed request ${wasteRequest.requestId} to pending - this will allow reassignment`);
      }
      
      console.log(`[RESET_TO_PENDING] Resetting request ${wasteRequest.requestId} to pending status`);
      
      try {
        // Remove from any routes that contain this request
        if (wasteRequest.routeId) {
          const Route = require('../models/Route');
          const route = await Route.findOne({ routeId: wasteRequest.routeId });
          
          if (route) {
            // Remove the bin from the route
            route.bins = route.bins.filter(bin => bin.requestId !== wasteRequest.requestId);
            route.totalBins = route.bins.length;
            
            // Update completed count
            route.completedBins = route.bins.filter(bin => bin.status === 'completed').length;
            
            // If route becomes empty, delete it
            if (route.bins.length === 0) {
              await Route.deleteOne({ _id: route._id });
              console.log(`[RESET_TO_PENDING] Deleted empty route ${route.routeId}`);
            } else {
              await route.save();
              console.log(`[RESET_TO_PENDING] Updated route ${route.routeId}, removed request ${wasteRequest.requestId}`);
            }
          }
        }
        
        // Clear assignment fields
        wasteRequest.assignedWorker = null;
        wasteRequest.assignedAt = null;
        wasteRequest.assignedBy = null;
        wasteRequest.scheduledDate = null;
        wasteRequest.scheduledTimeSlot = null;
        wasteRequest.routeId = null;
        
        const resetNote = `Status reset to pending by admin. Previous assignment cleared.`;
        wasteRequest.notes = wasteRequest.notes ? `${wasteRequest.notes}\n\n${resetNote}` : resetNote;
        
        console.log(`[RESET_TO_PENDING] Cleared assignment for request ${wasteRequest.requestId}`);
        
      } catch (resetError) {
        console.error('[RESET_TO_PENDING] Error resetting request:', resetError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Handle status change back to cancelled - also clear assignment and remove from routes
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      console.log(`[CANCEL_REQUEST] Cancelling request ${wasteRequest.requestId}`);
      
      try {
        // Remove from any routes that contain this request
        if (wasteRequest.routeId) {
          const Route = require('../models/Route');
          const route = await Route.findOne({ routeId: wasteRequest.routeId });
          
          if (route) {
            // Remove the bin from the route
            route.bins = route.bins.filter(bin => bin.requestId !== wasteRequest.requestId);
            route.totalBins = route.bins.length;
            
            // Update completed count
            route.completedBins = route.bins.filter(bin => bin.status === 'completed').length;
            
            // If route becomes empty, delete it
            if (route.bins.length === 0) {
              await Route.deleteOne({ _id: route._id });
              console.log(`[CANCEL_REQUEST] Deleted empty route ${route.routeId}`);
            } else {
              await route.save();
              console.log(`[CANCEL_REQUEST] Updated route ${route.routeId}, removed cancelled request ${wasteRequest.requestId}`);
            }
          }
        }
        
        // Clear assignment fields
        wasteRequest.assignedWorker = null;
        wasteRequest.assignedAt = null;
        wasteRequest.assignedBy = null;
        wasteRequest.scheduledDate = null;
        wasteRequest.scheduledTimeSlot = null;
        wasteRequest.routeId = null;
        
        const cancelNote = `Request cancelled by admin. Assignment cleared.`;
        wasteRequest.notes = wasteRequest.notes ? `${wasteRequest.notes}\n\n${cancelNote}` : cancelNote;
        
        console.log(`[CANCEL_REQUEST] Cleared assignment for cancelled request ${wasteRequest.requestId}`);
        
      } catch (cancelError) {
        console.error('[CANCEL_REQUEST] Error cancelling request:', cancelError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Save the updated request
    await wasteRequest.save();

    // Fetch the updated request with populated fields to return
    const updatedRequest = await WasteRequest.findById(requestId)
      .populate('userId', 'name email')
      .populate({
        path: 'assignedWorker',
        select: 'name email role',
        model: 'User'
      })
      .populate('assignedBy', 'name email');

    console.log(`[UPDATE_REQUEST] Request ${requestId} updated successfully. Assigned worker:`, updatedRequest.assignedWorker);

    // Send notification to customer about status change
    try {
      await notifyCustomerOfStatusChange(updatedRequest, oldStatus, status);
    } catch (notificationError) {
      console.error('Failed to notify customer (non-critical):', notificationError);
    }

    res.json({
      success: true,
      message: 'Request status updated successfully',
      data: {
        wasteRequest: updatedRequest
      }
    });
  } catch (error) {
    console.error('[UPDATE_REQUEST] Error:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update request status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get request by ID (admin or owner)
// @route   GET /api/waste/requests/:id
// @access  Private
const getRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;

    const wasteRequest = await WasteRequest.findById(requestId).populate('userId', 'name email');

    if (!wasteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Waste request not found'
      });
    }

    // Check if user is admin or the owner of the request
    if (req.user.role !== 'admin' && wasteRequest.userId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this request'
      });
    }

    res.json({
      success: true,
      data: {
        wasteRequest
      }
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch request',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/waste/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const totalRequests = await WasteRequest.countDocuments();
    const pendingRequests = await WasteRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await WasteRequest.countDocuments({ status: 'approved' });
    const completedRequests = await WasteRequest.countDocuments({ status: 'completed' });
    const cancelledRequests = await WasteRequest.countDocuments({ status: 'cancelled' });

    const requestsByType = await WasteRequest.aggregate([
      {
        $group: {
          _id: '$collectionType',
          count: { $sum: 1 }
        }
      }
    ]);

    const requestsByStatus = await WasteRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalRevenue = await WasteRequest.aggregate([
      {
        $match: { paymentStatus: 'paid' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$cost' }
        }
      }
    ]);

    const recentRequests = await WasteRequest.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        completedRequests,
        cancelledRequests,
        requestsByType,
        requestsByStatus,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentRequests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get available workers for assignment
// @route   GET /api/waste/admin/workers
// @access  Private/Admin
const getAvailableWorkers = async (req, res) => {
  try {
    const { date, requestId, timeSlot } = req.query;
    const assignmentDate = date ? new Date(date) : new Date();
    assignmentDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(assignmentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const User = require('../models/User');
    const Route = require('../models/Route');

    // Get all active workers
    const workers = await User.find({
      role: { $in: ['wc1', 'wc2', 'wc3'] },
      isActive: true
    }).select('_id name role email');

    // Get workload and assignment details for each worker
    const workersWithLoad = await Promise.all(
      workers.map(async (worker) => {
        const routeCount = await Route.countDocuments({
          collectorId: worker._id,
          assignedDate: {
            $gte: assignmentDate,
            $lt: nextDay
          }
        });

        // Check for existing assignments on the scheduled date
        const assignmentQuery = {
          assignedWorker: worker._id,
          scheduledDate: {
            $gte: assignmentDate,
            $lt: nextDay
          },
          status: { $in: ['approved', 'completed'] }
        };

        // Exclude current request if updating existing assignment
        if (requestId) {
          assignmentQuery.requestId = { $ne: requestId };
        }

        const assignedRequests = await WasteRequest.find(assignmentQuery)
          .populate('userId', 'name')
          .select('requestId scheduledDate scheduledTimeSlot collectionType userId');

        // Check for time slot conflicts if a specific time slot is provided
        let timeSlotConflict = null;
        const timeSlotAssignments = [];
        
        if (timeSlot) {
          timeSlotConflict = assignedRequests.find(req => req.scheduledTimeSlot === timeSlot);
        }

        // Group assignments by time slot
        const timeSlotMap = {};
        assignedRequests.forEach(req => {
          const slot = req.scheduledTimeSlot || 'unassigned';
          if (!timeSlotMap[slot]) {
            timeSlotMap[slot] = [];
          }
          timeSlotMap[slot].push(req);
        });

        const assignedCount = assignedRequests.length;
        const totalLoad = routeCount + assignedCount;

        // Determine availability based on time slot conflicts
        let availability = 'available';
        let conflictInfo = null;

        if (timeSlot && timeSlotConflict) {
          // Worker is already assigned to this specific time slot
          availability = 'not available';
          conflictInfo = {
            type: 'time_slot_conflict',
            conflictingRequest: timeSlotConflict.requestId,
            customerName: timeSlotConflict.userId.name,
            collectionType: timeSlotConflict.collectionType,
            scheduledDate: timeSlotConflict.scheduledDate,
            timeSlot: timeSlotConflict.scheduledTimeSlot
          };
        } else if (assignedCount >= 5) {
          // Worker has too many assignments for the day (max 5 per day, one per time slot)
          availability = 'busy';
          conflictInfo = {
            type: 'daily_limit',
            assignedCount,
            maxDaily: 5
          };
        }

        // Get available time slots for this worker on this date
        const allTimeSlots = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];
        const occupiedSlots = assignedRequests.map(req => req.scheduledTimeSlot).filter(slot => slot);
        const availableTimeSlots = allTimeSlots.filter(slot => !occupiedSlots.includes(slot));

        return {
          ...worker.toObject(),
          currentLoad: totalLoad,
          availability,
          assignedRequests: assignedCount,
          conflictInfo,
          timeSlotAssignments: Object.keys(timeSlotMap).map(slot => ({
            timeSlot: slot,
            requests: timeSlotMap[slot].map(req => ({
              requestId: req.requestId,
              customerName: req.userId.name,
              collectionType: req.collectionType
            }))
          })),
          availableTimeSlots,
          occupiedTimeSlots: occupiedSlots,
          maxDailyCapacity: 5,
          remainingCapacity: Math.max(0, 5 - assignedCount)
        };
      })
    );

    // Sort workers - available first, then by load
    workersWithLoad.sort((a, b) => {
      if (a.availability === 'available' && b.availability !== 'available') return -1;
      if (b.availability === 'available' && a.availability !== 'available') return 1;
      return a.currentLoad - b.currentLoad;
    });

    res.json({
      success: true,
      count: workersWithLoad.length,
      data: {
        workers: workersWithLoad,
        date: assignmentDate.toISOString(),
        timeSlot: timeSlot || null,
        availableTimeSlots: ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'],
        summary: {
          totalWorkers: workersWithLoad.length,
          availableWorkers: workersWithLoad.filter(w => w.availability === 'available').length,
          busyWorkers: workersWithLoad.filter(w => w.availability === 'busy').length,
          unavailableWorkers: workersWithLoad.filter(w => w.availability === 'not available').length,
          dateFormatted: assignmentDate.toDateString(),
          timeSlotRequested: timeSlot || 'any'
        }
      }
    });
  } catch (error) {
    console.error('[GET_WORKERS] Error fetching available workers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available workers',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create new waste type (admin only)
// @route   POST /api/waste/types
// @access  Private/Admin
const createWasteType = async (req, res) => {
  try {
    console.log('Creating waste type:', req.body);
    
    const {
      type,
      name,
      description,
      baseCost,
      restrictions = [],
      maxWeight,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!type || !name || !description || baseCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Type, name, description, and base cost are required'
      });
    }

    // Validate type enum
    const validTypes = ['food', 'polythene', 'paper', 'hazardous', 'ewaste'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be one of: food, polythene, paper, hazardous, ewaste'
      });
    }

    const wasteType = await WasteType.create({
      type,
      name,
      description,
      baseCost: parseFloat(baseCost),
      restrictions: Array.isArray(restrictions) ? restrictions : [],
      maxWeight: maxWeight ? parseInt(maxWeight) : undefined,
      isActive
    });

    console.log('Waste type created:', wasteType);

    res.status(201).json({
      success: true,
      message: 'Waste type created successfully',
      data: { wasteType }
    });
  } catch (error) {
    console.error('Error creating waste type:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Waste type with this type key already exists'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create waste type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Update waste type (admin only)
// @route   PUT /api/waste/types/:id
// @access  Private/Admin
const updateWasteType = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const wasteType = await WasteType.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!wasteType) {
      return res.status(404).json({
        success: false,
        message: 'Waste type not found'
      });
    }

    res.json({
      success: true,
      message: 'Waste type updated successfully',
      data: { wasteType }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Failed to update waste type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Delete waste type (admin only)
// @route   DELETE /api/waste/types/:id
// @access  Private/Admin
const deleteWasteType = async (req, res) => {
  try {
    const { id } = req.params;

    const wasteType = await WasteType.findByIdAndDelete(id);

    if (!wasteType) {
      return res.status(404).json({
        success: false,
        message: 'Waste type not found'
      });
    }

    res.json({
      success: true,
      message: 'Waste type deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete waste type',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get all waste types (admin only - includes inactive)
// @route   GET /api/waste/admin/types
// @access  Private/Admin
const getAllWasteTypesAdmin = async (req, res) => {
  try {
    console.log('Fetching all waste types for admin');
    
    const wasteTypes = await WasteType.find({}).sort({ createdAt: -1 });
    
    console.log(`Found ${wasteTypes.length} waste types`);

    res.json({
      success: true,
      count: wasteTypes.length,
      data: { wasteTypes }
    });
  } catch (error) {
    console.error('Error fetching waste types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch waste types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create default waste types (admin only)
// @route   POST /api/waste/admin/initialize-defaults
// @access  Private/Admin
const createDefaultWasteTypes = async (req, res) => {
  try {
    console.log('Creating default waste types...');
    
    // Check if waste types already exist
    const existingCount = await WasteType.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot create defaults. ${existingCount} waste types already exist. Please manage them individually.`
      });
    }

    const defaultWasteTypes = [
      {
        type: 'food',
        name: 'Food Waste Collection',
        description: 'Organic food waste and biodegradable materials collection service',
        baseCost: 20.00,
        restrictions: [
          'Only organic food materials',
          'No packaging materials',
          'Must be separated from other waste',
          'Maximum weight: 15kg per collection'
        ],
        maxWeight: 15,
        isActive: true
      },
      {
        type: 'polythene',
        name: 'Polythene Waste Collection',
        description: 'Plastic bags, polythene covers and plastic packaging collection service',
        baseCost: 30.00,
        restrictions: [
          'Clean plastic materials only',
          'No contaminated plastics',
          'Remove all labels and stickers',
          'Bundle plastics properly'
        ],
        maxWeight: 25,
        isActive: true
      },
      {
        type: 'paper',
        name: 'Paper Waste Collection',
        description: 'Newspapers, cardboard, office papers and books collection service',
        baseCost: 25.00,
        restrictions: [
          'Dry paper materials only',
          'No wet or contaminated paper',
          'Remove plastic covers and bindings',
          'Bundle papers neatly'
        ],
        maxWeight: 30,
        isActive: true
      },
      {
        type: 'hazardous',
        name: 'Hazardous Waste Disposal',
        description: 'Safe disposal of chemicals, batteries, paints and dangerous materials',
        baseCost: 50.00,
        restrictions: [
          'Items must be in original containers',
          'No mixing of different chemicals',
          'Requires special handling certification',
          'Advance booking required (48 hours minimum)',
          'Valid ID required for pickup'
        ],
        maxWeight: 10,
        isActive: true
      },
      {
        type: 'ewaste',
        name: 'E-Waste Collection',
        description: 'Electronic items, computers, phones and electronic appliances collection service',
        baseCost: 45.00,
        restrictions: [
          'Remove batteries before disposal',
          'Wipe personal data from devices',
          'No broken screens or sharp edges exposed',
          'Small electronics in boxes'
        ],
        maxWeight: 50,
        isActive: true
      }
    ];

    const createdTypes = await WasteType.insertMany(defaultWasteTypes);
    console.log(`Successfully created ${createdTypes.length} default waste types`);

    res.status(201).json({
      success: true,
      message: `Successfully created ${createdTypes.length} default waste types`,
      data: { 
        wasteTypes: createdTypes,
        count: createdTypes.length
      }
    });
  } catch (error) {
    console.error('Error creating default waste types:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Some default waste types already exist. Please check existing types.'
      });
    }
    
    res.status(400).json({
      success: false,
      message: 'Failed to create default waste types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Reset all waste types (admin only) - DANGEROUS
// @route   DELETE /api/waste/admin/reset-all
// @access  Private/Admin
const resetAllWasteTypes = async (req, res) => {
  try {
    const { confirmReset } = req.body;
    
    if (confirmReset !== 'CONFIRM_RESET_ALL_WASTE_TYPES') {
      return res.status(400).json({
        success: false,
        message: 'Reset confirmation text is required. This action will delete ALL waste types.'
      });
    }

    console.log('ADMIN RESET: Deleting all waste types...');
    
    const deletedCount = await WasteType.deleteMany({});
    
    console.log(`Deleted ${deletedCount.deletedCount} waste types`);

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount.deletedCount} waste types. You can now create new defaults.`,
      data: {
        deletedCount: deletedCount.deletedCount
      }
    });
  } catch (error) {
    console.error('Error resetting waste types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset waste types',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Helper function to find available worker
const findAvailableWorker = async (wasteRequest) => {
  try {
    const User = require('../models/User');
    const Route = require('../models/Route');
    
    // Get all active workers
    const workers = await User.find({
      role: { $in: ['wc1', 'wc2', 'wc3'] },
      isActive: true
    }).select('_id role');

    if (workers.length === 0) {
      console.log('[WORKER_ASSIGNMENT] No active workers found');
      return null;
    }

    console.log(`[WORKER_ASSIGNMENT] Found ${workers.length} active workers`);

    // Get request date for assignment
    const requestDate = new Date(wasteRequest.preferredDate);
    requestDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(requestDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check worker workload for the request date
    const workerWorkloads = await Promise.all(
      workers.map(async (worker) => {
        // Count existing assignments for this worker on this date
        const existingRoutes = await Route.countDocuments({
          collectorId: worker._id,
          assignedDate: {
            $gte: requestDate,
            $lt: nextDay
          }
        });

        // Count assigned requests directly
        const assignedRequests = await WasteRequest.countDocuments({
          assignedWorker: worker._id,
          preferredDate: {
            $gte: requestDate,
            $lt: nextDay
          },
          status: { $in: ['approved', 'completed'] }
        });

        const totalLoad = existingRoutes + assignedRequests;

        return {
          workerId: worker._id,
          role: worker.role,
          currentLoad: totalLoad
        };
      })
    );

    // Sort by workload (ascending) and select the least loaded worker
    workerWorkloads.sort((a, b) => a.currentLoad - b.currentLoad);
    
    const selectedWorker = workerWorkloads[0];
    console.log(`[WORKER_ASSIGNMENT] Selected worker ${selectedWorker.workerId} (${selectedWorker.role}) with load: ${selectedWorker.currentLoad}`);

    return selectedWorker.workerId;
  } catch (error) {
    console.error('[WORKER_ASSIGNMENT] Error finding available worker:', error);
    return null;
  }
};

// Helper function to create or update route for worker
const createOrUpdateRouteForWorker = async (wasteRequest, workerId, scheduledDate, adminId) => {
  try {
    const Route = require('../models/Route');
    const Bin = require('../models/Bin');
    
    const routeDate = new Date(scheduledDate);
    routeDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(routeDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Check if route already exists for this worker on this date (only active routes)
    let route = await Route.findOne({
      collectorId: workerId,
      assignedDate: {
        $gte: routeDate,
        $lt: nextDay
      },
      status: { $in: ['assigned', 'in_progress'] } // Only consider active routes
    });
    
    console.log(`[CREATE_ROUTE] Searching for existing route for worker ${workerId} on ${routeDate.toDateString()}`);
    if (route) {
      console.log(`[CREATE_ROUTE] Found existing route ${route.routeId} with ${route.bins.length} bins`);
    } else {
      console.log(`[CREATE_ROUTE] No existing active route found for worker ${workerId} on ${routeDate.toDateString()}`);
    }

    // Get bin information for the request
    const bin = await Bin.findOne({ binId: wasteRequest.binId });
    const area = bin?.location?.area || 'Unknown Area';

    if (route) {
      // Check if this request is already in the route (prevent duplicates)
      const existingBin = route.bins.find(b => b.requestId === wasteRequest.requestId);
      if (existingBin) {
        console.log(`[CREATE_ROUTE] Request ${wasteRequest.requestId} already exists in route ${route.routeId}`);
        return route.routeId;
      }
      
      // Add to existing route
      const newBin = {
        binId: wasteRequest.binId,
        requestId: wasteRequest.requestId,
        priority: getCollectionPriority(wasteRequest.collectionType, bin?.fillLevel || 0),
        estimatedTime: getEstimatedTimeByType(wasteRequest.collectionType),
        sequence: route.bins.length + 1,
        customerInfo: {
          name: wasteRequest.userId.name,
          email: wasteRequest.userId.email,
          collectionType: wasteRequest.collectionType,
          cost: wasteRequest.cost
        }
      };

      route.bins.push(newBin);
      route.totalBins = route.bins.length;
      route.estimatedDuration += newBin.estimatedTime;
      
      route.notes = route.notes ? `${route.notes}\n\nManually assigned request ${wasteRequest.requestId}` : `Manually assigned request ${wasteRequest.requestId}`;

      await route.save();
      console.log(`[ROUTE] Added request ${wasteRequest.requestId} to existing route ${route.routeId}`);
      return route.routeId;
    } else {
      // Create new route
      const routeId = `ROUTE-${routeDate.toISOString().split('T')[0].replace(/-/g, '')}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
      
      const newRoute = new Route({
        routeId,
        collectorId: workerId,
        assignedDate: routeDate,
        status: 'assigned',
        bins: [{
          binId: wasteRequest.binId,
          requestId: wasteRequest.requestId,
          priority: getCollectionPriority(wasteRequest.collectionType, bin?.fillLevel || 0),
          estimatedTime: getEstimatedTimeByType(wasteRequest.collectionType),
          sequence: 1,
          customerInfo: {
            name: wasteRequest.userId.name,
            email: wasteRequest.userId.email,
            collectionType: wasteRequest.collectionType,
            cost: wasteRequest.cost
          }
        }],
        totalBins: 1,
        estimatedDuration: getEstimatedTimeByType(wasteRequest.collectionType),
        area,
        notes: `Manually assigned route created for request ${wasteRequest.requestId} by admin on ${scheduledDate}`,
        completedBins: 0
      });

      await newRoute.save();
      console.log(`[ROUTE] Created new route ${routeId} for worker ${workerId} on ${scheduledDate}`);
      route = newRoute; // Set reference for return
      
      // Notify worker about new route assignment
      try {
        await notifyWorkerOfRouteAssignment(workerId, routeId, scheduledDate, 1);
      } catch (notificationError) {
        console.error('Failed to notify worker (non-critical):', notificationError);
      }
    }

    console.log(`[ROUTE] Request ${wasteRequest.requestId} successfully assigned to worker ${workerId} for ${scheduledDate}`);
    return route.routeId;
  } catch (error) {
    console.error('[ROUTE] Error creating/updating route:', error);
    throw error;
  }
};

// Helper function to get collection priority
const getCollectionPriority = (collectionType, fillLevel = 0) => {
  if (collectionType === 'hazardous') return 'urgent';
  if (fillLevel > 90) return 'urgent';
  if (collectionType === 'ewaste' || fillLevel > 70) return 'high';
  return 'normal';
};

// Helper function to get estimated time by collection type
const getEstimatedTimeByType = (collectionType) => {
  const timeEstimates = {
    'food': 15,
    'polythene': 12,
    'paper': 10,
    'hazardous': 25,
    'ewaste': 20
  };
  return timeEstimates[collectionType] || 15;
};

// Helper function to notify customer of status change
const notifyCustomerOfStatusChange = async (wasteRequest, oldStatus, newStatus) => {
  try {
    if (oldStatus === newStatus) return; // No change, no notification needed

    let type, title, message;
    
    switch (newStatus) {
      case 'approved':
        if (oldStatus !== 'approved') {
          type = 'waste_request_approved';
          title = 'Waste Collection Approved';
          message = `Your waste collection request ${wasteRequest.requestId} has been approved. Collection will be scheduled soon.`;
        }
        break;
      case 'completed':
        if (oldStatus !== 'completed') {
          type = 'waste_request_completed';
          title = 'Waste Collection Completed';
          message = `Your waste collection request ${wasteRequest.requestId} has been completed successfully. Thank you for using UrbanCleanse!`;
        }
        break;
      case 'cancelled':
        if (oldStatus !== 'cancelled') {
          type = 'waste_request_cancelled';
          title = 'Waste Collection Cancelled';
          message = `Your waste collection request ${wasteRequest.requestId} has been cancelled. Please contact support for more information.`;
        }
        break;
      default:
        return; // No notification for other status changes
    }

    if (type && title && message) {
      await createNotification(
        wasteRequest.userId._id, 
        type, 
        title, 
        message, 
        wasteRequest.requestId
      );
      console.log(`[NOTIFICATION] Customer notification created for ${wasteRequest.userId.email}: ${title}`);
    }
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying customer of status change:', error);
    throw error;
  }
};

// @desc    Get approved requests for today (debugging endpoint)
// @route   GET /api/waste/admin/approved-today
// @access  Private/Admin
const getApprovedRequestsToday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    console.log(`[DEBUG] Fetching approved requests for ${today.toDateString()}`);
    
    const approvedRequests = await WasteRequest.find({
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    console.log(`[DEBUG] Found ${approvedRequests.length} approved requests for today`);
    
    // Get bin details
    const binIds = [...new Set(approvedRequests.map(req => req.binId))];
    const Bin = require('../models/Bin');
    const bins = await Bin.find({ binId: { $in: binIds } });
    
    // Get existing collections
    const Collection = require('../models/Collection');
    const collections = await Collection.find({
      binId: { $in: binIds },
      timestamp: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    res.json({
      success: true,
      count: approvedRequests.length,
      data: {
        requests: approvedRequests,
        bins: bins,
        collections: collections,
        summary: {
          totalApproved: approvedRequests.length,
          uniqueBins: binIds.length,
          completedCollections: collections.filter(c => c.status === 'collected').length,
          collectionTypes: [...new Set(approvedRequests.map(r => r.collectionType))],
          date: today.toDateString()
        }
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error fetching approved requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved requests',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Debug worker assignments (admin only)
// @route   GET /api/waste/admin/debug-assignments
// @access  Private/Admin
const debugWorkerAssignments = async (req, res) => {
  try {
    const { date } = req.query;
    const checkDate = date ? new Date(date) : new Date();
    checkDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log(`[DEBUG] Checking assignments for ${checkDate.toDateString()}`);
    
    // Get all approved and paid requests for the date
    const approvedRequests = await WasteRequest.find({
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: checkDate,
        $lt: nextDay
      }
    }).populate('userId', 'name email')
      .populate('assignedWorker', 'name role');
    
    // Get all routes for the date
    const routes = await Route.find({
      assignedDate: {
        $gte: checkDate,
        $lt: nextDay
      }
    }).populate('collectorId', 'name role');
    
    // Get all active workers
    const workers = await User.find({
      role: { $in: ['wc1', 'wc2', 'wc3'] },
      isActive: true
    }).select('name role email');
    
    // Analyze the data
    const unassignedRequests = approvedRequests.filter(req => !req.assignedWorker);
    const assignedRequests = approvedRequests.filter(req => req.assignedWorker);
    
    const workersWithTasks = workers.map(worker => {
      const workerRoutes = routes.filter(r => r.collectorId._id.toString() === worker._id.toString());
      const workerRequests = assignedRequests.filter(r => r.assignedWorker._id.toString() === worker._id.toString());
      
      return {
        workerId: worker._id,
        workerName: worker.name,
        workerRole: worker.role,
        routeCount: workerRoutes.length,
        assignedRequestCount: workerRequests.length,
        totalTasks: workerRoutes.reduce((total, route) => total + route.bins.length, 0)
      };
    });
    
    res.json({
      success: true,
      debug: true,
      data: {
        date: checkDate.toDateString(),
        summary: {
          totalApprovedRequests: approvedRequests.length,
          assignedRequests: assignedRequests.length,
          unassignedRequests: unassignedRequests.length,
          totalRoutes: routes.length,
          activeWorkers: workers.length
        },
        workers: workersWithTasks,
        unassignedRequests: unassignedRequests.map(req => ({
          requestId: req.requestId,
          binId: req.binId,
          collectionType: req.collectionType,
          customerName: req.userId.name,
          cost: req.cost
        })),
        routes: routes.map(route => ({
          routeId: route.routeId,
          collectorName: route.collectorId.name,
          binCount: route.bins.length,
          status: route.status
        })),
        recommendations: unassignedRequests.length > 0 ? [
          `There are ${unassignedRequests.length} unassigned approved requests`,
          'Use the admin panel to approve requests with worker assignment',
          'Or manually assign workers using the update request status endpoint'
        ] : [
          'All approved requests are properly assigned to workers'
        ]
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error in debug assignments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug assignments',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get dashboard alerts for admin
// @route   GET /api/waste/admin/alerts
// @access  Private/Admin
const getAdminAlerts = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get pending requests
    const pendingRequests = await WasteRequest.countDocuments({ 
      status: 'pending',
      paymentStatus: 'paid'
    });

    // Get overdue collections (approved but past scheduled date)
    const overdueCollections = await WasteRequest.countDocuments({
      status: 'approved',
      scheduledDate: { $lt: today }
    });

    // Get failed payments
    const failedPayments = await WasteRequest.countDocuments({
      paymentStatus: 'failed',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // Get unassigned approved requests
    const unassignedRequests = await WasteRequest.countDocuments({
      status: 'approved',
      paymentStatus: 'paid',
      assignedWorker: null
    });

    const alerts = [];

    if (pendingRequests > 0) {
      alerts.push({
        type: 'pending_requests',
        severity: 'medium',
        count: pendingRequests,
        message: `${pendingRequests} paid request(s) pending approval`,
        action: 'Review and approve pending requests'
      });
    }

    if (overdueCollections > 0) {
      alerts.push({
        type: 'overdue_collections',
        severity: 'high',
        count: overdueCollections,
        message: `${overdueCollections} collection(s) are overdue`,
        action: 'Check collection status and reschedule if needed'
      });
    }

    if (failedPayments > 0) {
      alerts.push({
        type: 'failed_payments',
        severity: 'low',
        count: failedPayments,
        message: `${failedPayments} payment(s) failed in the last 24 hours`,
        action: 'Follow up with customers on payment issues'
      });
    }

    if (unassignedRequests > 0) {
      alerts.push({
        type: 'unassigned_requests',
        severity: 'medium',
        count: unassignedRequests,
        message: `${unassignedRequests} approved request(s) not assigned to workers`,
        action: 'Assign workers to approved requests'
      });
    }

    res.json({
      success: true,
      count: alerts.length,
      data: {
        alerts,
        summary: {
          pendingRequests,
          overdueCollections,
          failedPayments,
          unassignedRequests
        }
      }
    });
  } catch (error) {
    console.error('[ALERTS] Error fetching admin alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Debug request assignments and routes
// @route   GET /api/waste/admin/debug-requests/:requestId
// @access  Private/Admin
const debugRequestState = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Find the request
    const request = await WasteRequest.findOne({ requestId })
      .populate('userId', 'name email')
      .populate('assignedWorker', 'name email role');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    // Find associated route if any
    let route = null;
    if (request.routeId) {
      const Route = require('../models/Route');
      route = await Route.findOne({ routeId: request.routeId })
        .populate('collectorId', 'name email role');
    }
    
    // Find all routes that might contain this request
    const Route = require('../models/Route');
    const allRoutesWithRequest = await Route.find({
      'bins.requestId': requestId
    }).populate('collectorId', 'name email role');
    
    res.json({
      success: true,
      data: {
        request: {
          requestId: request.requestId,
          status: request.status,
          paymentStatus: request.paymentStatus,
          assignedWorker: request.assignedWorker,
          assignedAt: request.assignedAt,
          routeId: request.routeId,
          scheduledDate: request.scheduledDate,
          customer: request.userId
        },
        associatedRoute: route,
        allRoutesContainingRequest: allRoutesWithRequest,
        summary: {
          isRequestAssigned: !!request.assignedWorker,
          hasRouteId: !!request.routeId,
          routeExists: !!route,
          foundInMultipleRoutes: allRoutesWithRequest.length,
          canBeReassigned: request.status === 'pending' && !request.assignedWorker
        }
      }
    });
  } catch (error) {
    console.error('[DEBUG] Error debugging request state:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug request state',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
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
};

// Helper function to notify worker of route assignment (from waste request approval)
const notifyWorkerOfRouteAssignment = async (workerId, routeId, assignedDate, binCount) => {
  try {
    const title = 'New Route Assigned';
    const message = `You have been assigned a new collection route ${routeId} for ${assignedDate.toDateString()}. Total bins: ${binCount}`;
    
    await createNotification(
      workerId, 
      'route_assigned', 
      title, 
      message, 
      routeId
    );
    
    console.log(`[NOTIFICATION] Worker notification created for route assignment ${routeId}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying worker of route assignment:', error);
    throw error;
  }
};
