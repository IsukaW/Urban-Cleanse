const Route = require('../models/Route');
const Bin = require('../models/Bin');
const User = require('../models/User');
const WasteRequest = require('../models/WasteRequest');
const { createNotification } = require('./notificationController');
const pdfService = require('../services/pdfService');

// @desc    Get bins by area for route creation
// @route   GET /api/routes/bins-by-area
// @access  Private/Admin
const getBinsByArea = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log(`[ROUTE] Getting bins by area for date: ${targetDate.toDateString()}`);
    
    // Get approved and paid waste requests for the target date
    const approvedRequests = await WasteRequest.find({
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: targetDate,
        $lt: nextDay
      }
    }).populate('userId', 'name email phone');
    
    console.log(`[ROUTE] Found ${approvedRequests.length} approved requests for the date`);
    
    if (approvedRequests.length === 0) {
      return res.json({
        success: true,
        message: 'No approved requests found for the selected date',
        data: { areas: [] }
      });
    }
    
    // Get unique bin IDs from requests
    const binIds = [...new Set(approvedRequests.map(req => req.binId))];
    
    // Get bin details for these requests
    const bins = await Bin.find({
      binId: { $in: binIds },
      isActive: true
    });
    
    // Group bins by area with request information
    const binsByArea = {};
    
    for (const request of approvedRequests) {
      const bin = bins.find(b => b.binId === request.binId);
      if (!bin) continue;
      
      const area = bin.location.area;
      if (!binsByArea[area]) {
        binsByArea[area] = {
          area,
          bins: [],
          totalRequests: 0,
          estimatedDuration: 0
        };
      }
      
      // Check if bin is already added (multiple requests for same bin)
      const existingBin = binsByArea[area].bins.find(b => b.binId === bin.binId);
      
      if (!existingBin) {
        binsByArea[area].bins.push({
          binId: bin.binId,
          location: bin.location,
          fillLevel: bin.fillLevel,
          battery: bin.battery,
          status: bin.status,
          requests: [request]
        });
      } else {
        // Add request to existing bin
        existingBin.requests.push(request);
      }
      
      binsByArea[area].totalRequests++;
      binsByArea[area].estimatedDuration += 15; // 15 minutes per collection
    }
    
    // Convert to array and sort by area name
    const areas = Object.values(binsByArea).sort((a, b) => a.area.localeCompare(b.area));
    
    console.log(`[ROUTE] Grouped bins into ${areas.length} areas`);
    
    res.json({
      success: true,
      message: `Found ${approvedRequests.length} requests across ${areas.length} areas`,
      data: { areas }
    });
  } catch (error) {
    console.error('[ROUTE] Error getting bins by area:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bins by area',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get available workers for route assignment
// @route   GET /api/routes/available-workers
// @access  Private/Admin
const getAvailableWorkers = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get all workers
    const workers = await User.find({
      role: { $in: ['wc1', 'wc2', 'wc3'] },
      isActive: true
    }).select('_id name email role');
    
    // Get workers who already have routes assigned for this date
    const assignedRoutes = await Route.find({
      assignedDate: {
        $gte: targetDate,
        $lt: nextDay
      },
      status: { $in: ['assigned', 'in_progress'] }
    });
    
    const assignedWorkerIds = assignedRoutes.map(route => route.collectorId.toString());
    
    // Categorize workers
    const availableWorkers = workers.filter(worker => 
      !assignedWorkerIds.includes(worker._id.toString())
    );
    
    const assignedWorkers = workers.filter(worker => 
      assignedWorkerIds.includes(worker._id.toString())
    );
    
    console.log(`[ROUTE] Found ${availableWorkers.length} available workers and ${assignedWorkers.length} assigned workers`);
    
    res.json({
      success: true,
      data: {
        available: availableWorkers,
        assigned: assignedWorkers,
        totalWorkers: workers.length
      }
    });
  } catch (error) {
    console.error('[ROUTE] Error getting available workers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available workers',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create new route for collection
// @route   POST /api/routes/create
// @access  Private/Admin
const createRoute = async (req, res) => {
  try {
    // Double-check admin authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can create routes.'
      });
    }

    const {
      collectorId,
      assignedDate,
      area,
      selectedBins,
      notes
    } = req.body;
    
    console.log(`[ROUTE] Admin ${req.user.name} creating route for collector ${collectorId}, area: ${area}`);
    
    // Validate required fields
    if (!collectorId || !assignedDate || !area || !selectedBins || selectedBins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Collector ID, assigned date, area, and selected bins are required'
      });
    }
    
    // Verify collector exists and is a worker
    const collector = await User.findById(collectorId);
    if (!collector || !['wc1', 'wc2', 'wc3'].includes(collector.role)) {
      return res.status(404).json({
        success: false,
        message: 'Invalid collector ID or collector is not a worker'
      });
    }
    
    // Parse and validate date
    const routeDate = new Date(assignedDate);
    routeDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(routeDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Check if collector already has a route for this date
    const existingRoute = await Route.findOne({
      collectorId,
      assignedDate: {
        $gte: routeDate,
        $lt: nextDay
      },
      status: { $in: ['assigned', 'in_progress'] }
    });
    
    if (existingRoute) {
      return res.status(400).json({
        success: false,
        message: `Collector ${collector.name} already has a route assigned for ${routeDate.toDateString()}`
      });
    }
    
    // Get waste requests for these bins on this date
    const wasteRequests = await WasteRequest.find({
      binId: { $in: selectedBins },
      status: 'approved',
      paymentStatus: 'paid',
      preferredDate: {
        $gte: routeDate,
        $lt: nextDay
      }
    }).populate('userId', 'name email phone');
    
    if (wasteRequests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No approved and paid requests found for selected bins on this date'
      });
    }
    
    // Get bin details
    const bins = await Bin.find({
      binId: { $in: selectedBins },
      isActive: true
    });
    
    // Generate unique route ID
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const routeId = `RT-${timestamp}-${random}`;
    
    // Prepare route bins with enhanced information
    const routeBins = [];
    let sequence = 1;
    
    for (const binId of selectedBins) {
      const bin = bins.find(b => b.binId === binId);
      const requests = wasteRequests.filter(wr => wr.binId === binId);
      
      if (!bin || requests.length === 0) continue;
      
      // Use the first request for primary customer info (in case of multiple requests)
      const primaryRequest = requests[0];
      
      routeBins.push({
        binId,
        requestId: primaryRequest.requestId,
        priority: primaryRequest.urgent ? 'high' : 'normal',
        estimatedTime: 15, // minutes
        sequence,
        customerInfo: {
          name: primaryRequest.userId.name,
          email: primaryRequest.userId.email,
          collectionType: primaryRequest.collectionType,
          cost: primaryRequest.cost
        },
        status: 'pending'
      });
      
      sequence++;
    }
    
    // Calculate total estimated duration
    const estimatedDuration = routeBins.length * 15; // 15 minutes per bin
    
    // Create route
    const route = new Route({
      routeId,
      collectorId,
      assignedDate: routeDate,
      status: 'assigned',
      bins: routeBins,
      estimatedDuration,
      totalBins: routeBins.length,
      area,
      notes: notes || `Route created for ${area} area on ${routeDate.toDateString()}`
    });
    
    await route.save();
    
    // Update waste requests to mark them as assigned to route
    await WasteRequest.updateMany(
      { requestId: { $in: routeBins.map(b => b.requestId) } },
      { 
        assignedWorker: collectorId,
        assignedAt: new Date(),
        routeId: routeId
      }
    );
    
    // Populate the route for response
    const populatedRoute = await Route.findById(route._id)
      .populate('collectorId', 'name email role');
    
    console.log(`[ROUTE] Created route ${routeId} with ${routeBins.length} bins for ${collector.name}`);
    
    // Send notification to worker about new route
    try {
      await notifyWorkerOfNewRoute(collector._id, routeId, routeDate, routeBins.length);
    } catch (notificationError) {
      console.error('Failed to notify worker (non-critical):', notificationError);
    }
    
    res.status(201).json({
      success: true,
      message: `Route created successfully for ${collector.name} in ${area} area`,
      data: { route: populatedRoute }
    });
  } catch (error) {
    console.error('[ROUTE] Error creating route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get all routes with filters
// @route   GET /api/routes
// @access  Private/Admin
const getRoutes = async (req, res) => {
  try {
    const { 
      date, 
      status, 
      collectorId, 
      area,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build filter
    const filter = {};
    
    // Authorization: Workers can only see their own routes
    if (req.user.role !== 'admin') {
      // For workers, force collectorId to be their own ID
      filter.collectorId = req.user._id;
    } else if (collectorId) {
      // Admins can filter by any collectorId
      filter.collectorId = collectorId;
    }
    
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      filter.assignedDate = {
        $gte: targetDate,
        $lt: nextDay
      };
    }
    
    if (status) {
      // Handle multiple statuses (comma-separated)
      if (status.includes(',')) {
        filter.status = { $in: status.split(',').map(s => s.trim()) };
      } else {
        filter.status = status;
      }
    }
    
    if (area) {
      filter.area = area;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get routes with populated collector info
    const routes = await Route.find(filter)
      .populate('collectorId', 'name email role')
      .sort({ assignedDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Route.countDocuments(filter);
    
    // Get summary statistics
    const stats = await Route.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBins: { $sum: '$totalBins' },
          completedBins: { $sum: '$completedBins' }
        }
      }
    ]);
    
    console.log(`[ROUTE] Retrieved ${routes.length} routes with filters:`, filter);
    
    res.json({
      success: true,
      count: routes.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: {
        routes,
        stats
      }
    });
  } catch (error) {
    console.error('[ROUTE] Error getting routes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get routes',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get single route details
// @route   GET /api/routes/:id
// @access  Private
const getRouteById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find route by ID or routeId
    const route = await Route.findOne({
      $or: [
        { _id: id },
        { routeId: id }
      ]
    }).populate('collectorId', 'name email role phone');
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Get additional bin and request details
    const binIds = route.bins.map(b => b.binId);
    const requestIds = route.bins.map(b => b.requestId).filter(Boolean);
    
    const bins = await Bin.find({ binId: { $in: binIds } });
    const requests = await WasteRequest.find({ 
      requestId: { $in: requestIds } 
    }).populate('userId', 'name email phone');
    
    // Enhance route data with detailed information
    const enhancedBins = route.bins.map(routeBin => {
      const bin = bins.find(b => b.binId === routeBin.binId);
      const request = requests.find(r => r.requestId === routeBin.requestId);
      
      return {
        ...routeBin.toObject(),
        binDetails: bin,
        requestDetails: request
      };
    });
    
    const enhancedRoute = {
      ...route.toObject(),
      bins: enhancedBins
    };
    
    res.json({
      success: true,
      data: { route: enhancedRoute }
    });
  } catch (error) {
    console.error('[ROUTE] Error getting route by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route details',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Update route status
// @route   PUT /api/routes/:id/status
// @access  Private/Admin
const updateRouteStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    if (!['assigned', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: assigned, in_progress, completed, or cancelled'
      });
    }
    
    const route = await Route.findOne({
      $or: [
        { _id: id },
        { routeId: id }
      ]
    });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Authorization: Workers can only update their own routes, admins can update any
    if (req.user.role !== 'admin' && route.collectorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this route'
      });
    }
    
    const oldStatus = route.status;
    route.status = status;
    
    // Update timestamps based on status
    if (status === 'in_progress' && !route.startTime) {
      route.startTime = new Date();
    } else if (status === 'completed' && !route.endTime) {
      route.endTime = new Date();
      
      // Calculate actual duration
      if (route.startTime) {
        route.actualDuration = Math.round((route.endTime - route.startTime) / (1000 * 60));
      }
    }
    
    if (notes) {
      route.notes = route.notes ? `${route.notes}\n\nStatus Update: ${notes}` : notes;
    }
    
    await route.save();
    
    console.log(`[ROUTE] Updated route ${route.routeId} status from ${oldStatus} to ${status}`);
    
    res.json({
      success: true,
      message: `Route status updated to ${status}`,
      data: { route }
    });
  } catch (error) {
    console.error('[ROUTE] Error updating route status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update route status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Delete/Cancel route
// @route   DELETE /api/routes/:id
// @access  Private/Admin
const deleteRoute = async (req, res) => {
  try {
    // Double-check admin authorization  
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can delete routes.'
      });
    }

    const { id } = req.params;
    const { reason } = req.body;
    
    const route = await Route.findOne({
      $or: [
        { _id: id },
        { routeId: id }
      ]
    });
    
    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }
    
    // Don't allow deletion of completed routes
    if (route.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed routes'
      });
    }
    
    // Update waste requests to unassign them and reset to pending for reassignment
    const requestIds = route.bins.map(b => b.requestId).filter(Boolean);
    if (requestIds.length > 0) {
      console.log(`[ROUTE_DELETE] Attempting to reset requests: ${requestIds.join(', ')}`);
      
      const updateResult = await WasteRequest.updateMany(
        { requestId: { $in: requestIds } },
        { 
          $unset: { 
            assignedWorker: 1, 
            assignedAt: 1, 
            assignedBy: 1,
            routeId: 1, 
            scheduledDate: 1 
          },
          $set: {
            status: 'pending' // Reset to pending to allow reassignment
          }
        }
      );
      
      console.log(`[ROUTE_DELETE] Reset result: ${updateResult.modifiedCount}/${requestIds.length} requests updated`);
      
      // Double-check by querying the updated requests
      const updatedRequests = await WasteRequest.find({ requestId: { $in: requestIds } });
      console.log(`[ROUTE_DELETE] Verification - Updated requests:`, 
        updatedRequests.map(r => ({
          requestId: r.requestId,
          status: r.status,
          assignedWorker: r.assignedWorker,
          routeId: r.routeId
        }))
      );
    }
    
    // Add cancellation reason
    route.status = 'cancelled';
    route.notes = route.notes ? 
      `${route.notes}\n\nRoute Cancelled: ${reason || 'No reason provided'}` : 
      `Route Cancelled: ${reason || 'No reason provided'}`;
    
    await route.save();
    
    console.log(`[ROUTE] Cancelled route ${route.routeId}, unassigned ${requestIds.length} requests`);
    
    res.json({
      success: true,
      message: 'Route cancelled and requests unassigned',
      data: { route }
    });
  } catch (error) {
    console.error('[ROUTE] Error deleting route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete route',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get route statistics and summary
// @route   GET /api/routes/stats
// @access  Private/Admin
const getRouteStats = async (req, res) => {
  try {
    const { date } = req.query;
    
    // Use provided date or default to today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get routes for the date
    const routes = await Route.find({
      assignedDate: {
        $gte: targetDate,
        $lt: nextDay
      }
    }).populate('collectorId', 'name role');
    
    // Calculate statistics
    const stats = {
      totalRoutes: routes.length,
      routesByStatus: {
        assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      totalBins: 0,
      completedBins: 0,
      totalWorkers: 0,
      estimatedDuration: 0,
      actualDuration: 0,
      areas: new Set(),
      workerTypes: {
        wc1: 0, // Residential
        wc2: 0, // Commercial  
        wc3: 0  // Industrial
      }
    };
    
    routes.forEach(route => {
      stats.routesByStatus[route.status]++;
      stats.totalBins += route.totalBins || 0;
      stats.completedBins += route.completedBins || 0;
      stats.estimatedDuration += route.estimatedDuration || 0;
      stats.actualDuration += route.actualDuration || 0;
      stats.areas.add(route.area);
      
      if (route.collectorId) {
        stats.workerTypes[route.collectorId.role]++;
        stats.totalWorkers++;
      }
    });
    
    // Convert Set to array
    stats.areas = Array.from(stats.areas);
    
    // Calculate completion rate
    stats.completionRate = stats.totalBins > 0 ? 
      Math.round((stats.completedBins / stats.totalBins) * 100) : 0;
    
    // Calculate efficiency (actual vs estimated time)
    stats.efficiency = stats.estimatedDuration > 0 && stats.actualDuration > 0 ? 
      Math.round((stats.estimatedDuration / stats.actualDuration) * 100) : 0;
    
    console.log(`[ROUTE] Generated stats for ${targetDate.toDateString()}:`, {
      totalRoutes: stats.totalRoutes,
      completionRate: stats.completionRate
    });
    
    res.json({
      success: true,
      data: { 
        stats,
        date: targetDate.toISOString()
      }
    });
  } catch (error) {
    console.error('[ROUTE] Error getting route stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get route statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Generate PDF report for route management
// @route   POST /api/routes/generate-pdf
// @access  Private/Admin
const generateRoutePDF = async (req, res) => {
  try {
    // Double-check admin authorization
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only administrators can generate PDF reports.'
      });
    }

    const { startDate, endDate, statusFilter, areaFilter } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    console.log(`[PDF] Admin ${req.user.name} generating PDF report from ${startDate} to ${endDate}`);
    
    // Parse dates
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Build filter for routes
    const filter = {
      assignedDate: {
        $gte: start,
        $lte: end
      }
    };
    
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter.includes(',')) {
        filter.status = { $in: statusFilter.split(',').map(s => s.trim()) };
      } else {
        filter.status = statusFilter;
      }
    }
    
    if (areaFilter && areaFilter !== 'all') {
      filter.area = new RegExp(areaFilter, 'i');
    }
    
    // Get routes for the date range
    const routes = await Route.find(filter)
      .populate('collectorId', 'name email role')
      .sort({ assignedDate: -1, createdAt: -1 });
    
    // Calculate comprehensive statistics
    const stats = {
      totalRoutes: routes.length,
      routesByStatus: {
        assigned: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      totalBins: 0,
      completedBins: 0,
      totalWorkers: new Set(),
      estimatedDuration: 0,
      actualDuration: 0,
      areas: new Set(),
      workerTypes: {
        wc1: 0, // Residential
        wc2: 0, // Commercial  
        wc3: 0  // Industrial
      }
    };
    
    routes.forEach(route => {
      stats.routesByStatus[route.status]++;
      stats.totalBins += route.totalBins || 0;
      stats.completedBins += route.completedBins || 0;
      stats.estimatedDuration += route.estimatedDuration || 0;
      stats.actualDuration += route.actualDuration || 0;
      stats.areas.add(route.area);
      
      if (route.collectorId) {
        stats.totalWorkers.add(route.collectorId._id.toString());
        stats.workerTypes[route.collectorId.role]++;
      }
    });
    
    // Convert Set to count and array
    stats.totalWorkers = stats.totalWorkers.size;
    stats.areas = Array.from(stats.areas);
    
    // Calculate completion rate
    stats.completionRate = stats.totalBins > 0 ? 
      Math.round((stats.completedBins / stats.totalBins) * 100) : 0;
    
    // Calculate efficiency (actual vs estimated time)
    stats.efficiency = stats.estimatedDuration > 0 && stats.actualDuration > 0 ? 
      Math.round((stats.estimatedDuration / stats.actualDuration) * 100) : 0;
    
    // Create summary for detailed overview
    const summary = {
      ...stats,
      avgDuration: stats.totalRoutes > 0 ? 
        Math.round(stats.actualDuration / stats.totalRoutes) : 0,
      dateRange: {
        start: startDate,
        end: endDate
      },
      filters: {
        status: statusFilter || 'all',
        area: areaFilter || 'all'
      }
    };
    
    // Prepare data for PDF generation
    const pdfData = {
      startDate: start,
      endDate: end,
      routes: routes.map(route => ({
        ...route.toObject(),
        // Ensure we have safe fallbacks
        routeId: route.routeId || 'N/A',
        collectorId: route.collectorId || { name: 'Unassigned' },
        area: route.area || 'Unknown',
        status: route.status || 'unknown',
        totalBins: route.totalBins || 0,
        completedBins: route.completedBins || 0,
        estimatedDuration: route.estimatedDuration || 0,
        actualDuration: route.actualDuration || null,
        assignedDate: route.assignedDate
      })),
      stats,
      summary
    };
    
    // Generate PDF
    const pdfBuffer = await pdfService.generateRouteReport(pdfData);
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF generation failed - empty buffer');
    }
    
    // Set response headers for PDF download
    const filename = `route-report-${startDate}-to-${endDate}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log(`[PDF] Generated PDF report with ${routes.length} routes, size: ${pdfBuffer.length} bytes`);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF] Error generating PDF report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getBinsByArea,
  getAvailableWorkers,
  createRoute,
  getRoutes,
  getRouteById,
  updateRouteStatus,
  deleteRoute,
  getRouteStats,
  generateRoutePDF
};

// Helper function to notify worker of new route
const notifyWorkerOfNewRoute = async (workerId, routeId, assignedDate, binCount) => {
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
    
    console.log(`[NOTIFICATION] Worker notification created for route ${routeId}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying worker of new route:', error);
    throw error;
  }
};