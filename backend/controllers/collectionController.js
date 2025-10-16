const Collection = require('../models/Collection');
const Route = require('../models/Route');
const Bin = require('../models/Bin');
const User = require('../models/User');
const WasteRequest = require('../models/WasteRequest');
const { createNotification } = require('./notificationController');

// @desc    Get collector's assigned tasks from routes
// @route   GET /api/collection/collectors/:id/route
// @access  Private/Worker
const getCollectorRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    console.log(`[TASKS] Fetching assigned tasks for collector: ${id}, date: ${date}`);
    console.log(`[TASKS] Requesting user role: ${req.user.role}, user ID: ${req.user._id}`);
    
    // Use provided date or default to today
    const taskDate = date ? new Date(date) : new Date();
    taskDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(taskDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log(`[TASKS] Date range: ${taskDate.toISOString()} to ${nextDay.toISOString()}`);
    
    // Check authorization
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access these tasks'
      });
    }
    
    // DEBUG: Check if there are any routes for this collector
    const allRoutes = await Route.find({ collectorId: id });
    console.log(`[DEBUG] Total routes for collector ${id}: ${allRoutes.length}`);
    if (allRoutes.length > 0) {
      console.log(`[DEBUG] Sample route dates:`, allRoutes.map(r => ({
        routeId: r.routeId,
        assignedDate: r.assignedDate,
        status: r.status,
        binCount: r.bins.length
      })));
    }
    
    // DEBUG: Check waste requests assigned to this worker
    const allWasteRequests = await WasteRequest.find({ assignedWorker: id });
    console.log(`[DEBUG] Total waste requests assigned to worker ${id}: ${allWasteRequests.length}`);
    if (allWasteRequests.length > 0) {
      console.log(`[DEBUG] Sample waste requests:`, allWasteRequests.map(wr => ({
        requestId: wr.requestId,
        status: wr.status,
        paymentStatus: wr.paymentStatus,
        preferredDate: wr.preferredDate,
        assignedAt: wr.assignedAt
      })));
    }
    
    // DEBUG: Check approved and paid requests for today
    const approvedRequestsToday = await WasteRequest.find({
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: taskDate,
        $lt: nextDay
      }
    });
    console.log(`[DEBUG] Total approved & paid requests for ${taskDate.toDateString()}: ${approvedRequestsToday.length}`);
    
    // Get routes assigned to this collector for the date
    const assignedRoutes = await Route.find({
      collectorId: id,
      assignedDate: {
        $gte: taskDate,
        $lt: nextDay
      }
    }).populate('collectorId', 'name email role')
      .sort({ createdAt: -1 });

    console.log(`[TASKS] Found ${assignedRoutes.length} assigned routes for the date`);
    
    if (assignedRoutes.length === 0) {
      // Check if there are any approved requests that should be assigned
      if (approvedRequestsToday.length > 0) {
        console.log(`[WARNING] Found ${approvedRequestsToday.length} approved requests but no routes assigned to worker ${id}`);
        console.log(`[INFO] You may need to manually assign these requests to workers via the admin panel`);
      }
      
      return res.json({
        success: true,
        message: 'No tasks assigned for today',
        debug: {
          totalRoutesForWorker: allRoutes.length,
          totalWasteRequestsAssigned: allWasteRequests.length,
          approvedRequestsToday: approvedRequestsToday.length,
          suggestion: approvedRequestsToday.length > 0 ? 
            'There are approved requests available. Admin should assign them to workers.' : 
            'No approved requests found for today.'
        },
        data: {
          route: {
            routeId: `EMPTY-${taskDate.toISOString().split('T')[0]}`,
            collectorId: id,
            assignedDate: taskDate.toISOString(),
            status: 'assigned',
            bins: [],
            totalBins: 0,
            completedBins: 0,
            estimatedDuration: 0,
            area: 'No Area Assigned'
          }
        }
      });
    }

    // Take the first route (primary route for the day)
    const route = assignedRoutes[0];
    
    // Collect all bin IDs from the route
    const allBinIds = route.bins.map(bin => bin.binId);
    
    // Get bin details and waste requests
    const bins = await Bin.find({ 
      binId: { $in: allBinIds },
      isActive: true
    });

    const wasteRequests = await WasteRequest.find({
      requestId: { $in: route.bins.map(b => b.requestId).filter(Boolean) },
      assignedWorker: id
    }).populate('userId', 'name email phone');

    // Get existing collections for today - match by binId AND routeId for specificity
    const existingCollections = await Collection.find({
      binId: { $in: allBinIds },
      collectorId: id,
      timestamp: {
        $gte: taskDate,
        $lt: nextDay
      }
    });
    
    console.log(`[TASKS] Found ${existingCollections.length} existing collections for this worker today`);
    
    // Enhance route bins with additional data
    const enhancedBins = route.bins.map(routeBin => {
      const bin = bins.find(b => b.binId === routeBin.binId);
      const wasteRequest = wasteRequests.find(wr => wr.requestId === routeBin.requestId);
      
      // Find collection that matches both binId and the current request/route context
      const collection = existingCollections.find(c => 
        c.binId === routeBin.binId && 
        (c.routeId === route.routeId || 
         // If no routeId match, check if this collection is for the current request
         wasteRequest?.status === 'completed')
      );
      
      // Determine collection status more accurately
      let collectionStatus = 'pending';
      if (collection) {
        collectionStatus = collection.status;
      } else if (wasteRequest?.status === 'completed') {
        // If waste request is completed but no collection found, it was likely collected
        collectionStatus = 'collected';
      }
      
      return {
        ...routeBin.toObject(),
        // Use the more accurate collection status
        collectionStatus: collectionStatus,
        collectionId: collection?.collectionId || null,
        lastUpdated: bin?.lastUpdated || null,
        fillLevel: bin?.fillLevel || 0,
        battery: bin?.battery || 0,
        location: bin?.location || null,
        
        // Enhanced customer information from waste request
        customerInfo: wasteRequest ? {
          name: wasteRequest.userId.name,
          email: wasteRequest.userId.email,
          phone: wasteRequest.userId.phone || 'Not provided',
          requestNotes: wasteRequest.notes || '',
          collectionType: wasteRequest.collectionType,
          cost: wasteRequest.cost,
          paymentStatus: wasteRequest.paymentStatus,
          requestStatus: wasteRequest.status
        } : routeBin.customerInfo,
        
        // Bin data
        binData: bin || null,
        wasteRequest: wasteRequest || null
      };
    });
    
    // Calculate completed bins more accurately - count bins with 'collected' status
    const completedCount = enhancedBins.filter(bin => bin.collectionStatus === 'collected').length;
    
    // Prepare route response
    const routeResponse = {
      ...route.toObject(),
      bins: enhancedBins,
      completedBins: completedCount
    };
    
    console.log(`[TASKS] Prepared route with ${enhancedBins.length} bins, ${completedCount} completed`);
    
    res.json({
      success: true,
      message: `Found route with ${enhancedBins.length} assigned tasks for ${taskDate.toDateString()}`,
      data: {
        route: routeResponse
      }
    });
  } catch (error) {
    console.error('[TASKS] Error fetching collector route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch route data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Mark bin as collected (via scan)
// @route   POST /api/collection/scan
// @access  Private/Worker
const scanBinCollection = async (req, res) => {
  try {
    const { 
      binId, 
      routeId, 
      locationData, 
      notes 
    } = req.body;
    
    console.log('[SCAN] Collection request:', { binId, routeId, userId: req.user._id });
    
    // Validate required fields
    if (!binId || !routeId) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID and Route ID are required'
      });
    }
    
    // Check for approved AND paid waste requests for this bin
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const approvedRequest = await WasteRequest.findOne({
      binId,
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('userId', 'name email');
    
    if (!approvedRequest) {
      return res.status(404).json({
        success: false,
        message: 'No approved and paid collection request found for this bin today'
      });
    }
    
    console.log('[SCAN] Found approved request:', approvedRequest.requestId);
    
    // Check if bin is already collected today
    const existingCollection = await Collection.findOne({
      binId,
      status: 'collected',
      timestamp: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (existingCollection) {
      return res.status(400).json({
        success: false,
        message: 'Bin has already been collected today'
      });
    }
    
    // Create collection record
    const collection = new Collection({
      collectorId: req.user._id,
      binId,
      routeId,
      status: 'collected',
      collectionMethod: 'scan',
      collectedAt: new Date(),
      locationData,
      notes
    });
    
    await collection.save();
    
    // Update the bin status consistently
    const updatedBin = await updateBinStatusAfterCollection(binId, 'scan');
    
    console.log(`[SCAN] Updated bin ${binId} status to Empty (fillLevel: 0) after collection`);
    
    // Mark waste request as completed
    approvedRequest.status = 'completed';
    await approvedRequest.save();
    
    // Update route progress
    const route = await Route.findOne({ routeId });
    if (route) {
      const binTask = route.bins.find(b => b.binId === binId);
      if (binTask) {
        binTask.status = 'completed';
        binTask.completedAt = new Date();
        
        const completedCount = route.bins.filter(b => b.status === 'completed').length;
        route.completedBins = completedCount;
        
        if (completedCount === route.bins.length) {
          route.status = 'completed';
          route.endTime = new Date();
        } else if (!route.startTime) {
          route.status = 'in_progress';
          route.startTime = new Date();
        }
        
        await route.save();
      }
    }
    
    // Send notification
    await notifyUserOfCollection(binId);
    
    // Get updated route progress
    const updatedRoute = await Route.findOne({ routeId });
    const routeProgress = {
      completed: updatedRoute ? updatedRoute.completedBins : 0,
      total: updatedRoute ? updatedRoute.totalBins : 0,
      routeStatus: updatedRoute ? updatedRoute.status : 'assigned'
    };
    
    res.json({
      success: true,
      message: 'Bin collection recorded successfully',
      data: {
        collection,
        completedTask: {
          binId,
          requestId: approvedRequest.requestId,
          customerName: approvedRequest.userId.name,
          completedAt: collection.collectedAt
        },
        routeProgress,
        wasteRequestStatus: 'completed'
      }
    });
  } catch (error) {
    console.error('[SCAN] Error in scanBinCollection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record bin collection',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Manual bin collection update
// @route   POST /api/collection/manual
// @access  Private/Worker
const manualBinCollection = async (req, res) => {
  try {
    const { 
      binId, 
      routeId, 
      reason, 
      locationData, 
      notes 
    } = req.body;
    
    console.log('[MANUAL] Collection request:', { binId, routeId, userId: req.user._id });
    
    // Validate required fields
    if (!binId || !routeId) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID and Route ID are required'
      });
    }
    
    // Check for approved AND paid waste requests for this bin
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const approvedRequest = await WasteRequest.findOne({
      binId,
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: today,
        $lt: tomorrow
      }
    }).populate('userId', 'name email');
    
    if (!approvedRequest) {
      return res.status(404).json({
        success: false,
        message: 'No approved and paid collection request found for this bin today'
      });
    }
    
    console.log('[MANUAL] Found approved request:', approvedRequest.requestId);
    
    // Check if bin is already collected
    const existingCollection = await Collection.findOne({
      binId,
      status: 'collected',
      timestamp: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (existingCollection) {
      return res.status(400).json({
        success: false,
        message: 'Bin has already been collected today'
      });
    }
    
    // Create collection record
    const collection = new Collection({
      collectorId: req.user._id,
      binId,
      routeId,
      status: 'collected',
      collectionMethod: 'manual',
      collectedAt: new Date(),
      locationData,
      notes: `Manual entry - Reason: ${reason || 'QR scan failed'}${notes ? `. Notes: ${notes}` : ''}`
    });
    
    await collection.save();
    
    // Update bin status consistently
    const updatedBin = await updateBinStatusAfterCollection(binId, 'manual');
    
    console.log(`[MANUAL] Updated bin ${binId} status to Empty (fillLevel: 0) after manual collection`);
    
    // Mark waste request as completed
    approvedRequest.status = 'completed';
    await approvedRequest.save();
    
    // Update route progress
    const route = await Route.findOne({ routeId });
    if (route) {
      const binTask = route.bins.find(b => b.binId === binId);
      if (binTask) {
        binTask.status = 'completed';
        binTask.completedAt = new Date();
        
        const completedCount = route.bins.filter(b => b.status === 'completed').length;
        route.completedBins = completedCount;
        
        if (completedCount === route.bins.length) {
          route.status = 'completed';
          route.endTime = new Date();
        } else if (!route.startTime) {
          route.status = 'in_progress';
          route.startTime = new Date();
        }
        
        await route.save();
      }
    }
    
    // Send notification
    await notifyUserOfCollection(binId);
    
    // Get updated route progress
    const updatedRoute = await Route.findOne({ routeId });
    const routeProgress = {
      completed: updatedRoute ? updatedRoute.completedBins : 0,
      total: updatedRoute ? updatedRoute.totalBins : 0,
      routeStatus: updatedRoute ? updatedRoute.status : 'assigned'
    };
    
    res.json({
      success: true,
      message: 'Manual collection recorded successfully',
      data: {
        collection,
        completedTask: {
          binId,
          requestId: approvedRequest.requestId,
          customerName: approvedRequest.userId.name,
          completedAt: collection.collectedAt
        },
        routeProgress,
        wasteRequestStatus: 'completed'
      }
    });
  } catch (error) {
    console.error('[MANUAL] Error in manualBinCollection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record manual collection',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Report collection issue
// @route   POST /api/collection/report-issue
// @access  Private/Worker
const reportCollectionIssue = async (req, res) => {
  try {
    const {
      binId,
      routeId,
      issueType,
      description,
      requiresAdmin = true,
      locationData
    } = req.body;
    
    console.log('[ISSUE] Report request:', { binId, routeId, issueType });
    
    // Validate required fields
    if (!binId || !routeId || !issueType) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID, Route ID, and issue type are required'
      });
    }
    
    // Create collection record with issue
    const collection = new Collection({
      collectorId: req.user._id,
      binId,
      routeId,
      status: 'failed',
      issue: {
        issueType,
        description,
        requiresAdmin,
        reportedAt: new Date()
      },
      locationData,
      notes: `Issue reported: ${issueType} - ${description}`
    });
    
    await collection.save();
    
    // Create alert if admin attention required
    if (requiresAdmin) {
      const Alert = require('../models/Alert');
      try {
        await Alert.create({
          binId,
          type: 'maintenance',
          severity: 'high',
          message: `Collection issue reported by ${req.user.name}: ${issueType} - ${description}`
        });
        console.log('[ISSUE] Alert created for admin attention');
      } catch (alertError) {
        console.error('[ISSUE] Error creating alert:', alertError);
      }
    }
    
    res.json({
      success: true,
      message: 'Issue reported successfully',
      data: {
        collection,
        issue: {
          issueType,
          description,
          requiresAdmin,
          reportedAt: collection.issue.reportedAt
        },
        adminNotified: requiresAdmin
      }
    });
  } catch (error) {
    console.error('[ISSUE] Error reporting issue:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to report issue',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get collection history
// @route   GET /api/collection/history
// @access  Private/Worker
const getCollectionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { collectorId: req.user._id };
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    const collections = await Collection.find(filter)
      .populate('collectorId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Collection.countDocuments(filter);
    
    res.json({
      success: true,
      count: collections.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        collections
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch collection history',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Helper function to notify user of collection
const notifyUserOfCollection = async (binId) => {
  try {
    console.log(`[NOTIFY] Sending collection notification for bin ${binId}`);
    
    // Find recent completed requests for this bin
    const requests = await WasteRequest.find({ 
      binId, 
      status: 'completed'
    }).populate('userId', 'name email').limit(1);
    
    // Simulate sending notifications
    for (const request of requests) {
      console.log(`📧 Collection notification sent to ${request.userId.email} for bin ${binId}`);
      console.log(`✅ Request ${request.requestId} completed`);
    }
  } catch (error) {
    console.error('[NOTIFY] Error sending notification:', error);
  }
};

// Helper function to update bin status consistently
const updateBinStatusAfterCollection = async (binId, collectionMethod = 'scan') => {
  try {
    const updatedBin = await Bin.findOneAndUpdate(
      { binId },
      { 
        fillLevel: 0, // Completely empty after collection
        status: 'Empty', // Reset to Empty status
        lastUpdated: new Date(),
        lastCollected: new Date() // Track when it was last collected
      },
      { new: true }
    );
    
    if (updatedBin) {
      console.log(`[STATUS_UPDATE] Bin ${binId} status updated to Empty (fillLevel: 0) after ${collectionMethod} collection`);
      return updatedBin;
    } else {
      console.warn(`[STATUS_UPDATE] Bin ${binId} not found for status update`);
      return null;
    }
  } catch (error) {
    console.error(`[STATUS_UPDATE] Error updating bin ${binId} status:`, error);
    throw error;
  }
};

module.exports = {
  getCollectorRoute,
  scanBinCollection,
  manualBinCollection,
  reportCollectionIssue,
  getCollectionHistory
};

// Helper function to notify customer of collection completion
const notifyCustomerOfCompletion = async (wasteRequest) => {
  try {
    await wasteRequest.populate('userId', 'name email');
    
    const title = 'Waste Collection Completed';
    const message = `Your waste collection request ${wasteRequest.requestId} has been completed successfully. Thank you for using UrbanCleanse!`;
    
    await createNotification(
      wasteRequest.userId._id, 
      'waste_request_completed', 
      title, 
      message, 
      wasteRequest.requestId
    );
    
    console.log(`[NOTIFICATION] Customer completion notification created for ${wasteRequest.userId.email}: ${wasteRequest.requestId}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying customer of completion:', error);
    throw error;
  }
};

