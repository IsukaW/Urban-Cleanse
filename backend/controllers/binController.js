const Bin = require('../models/Bin');
const Alert = require('../models/Alert');
const User = require('../models/User');
const { createNotification } = require('./notificationController');


// @desc    Update bin sensor data
// @route   POST /api/bins/update
// @access  Public (for sensors)
const updateBinData = async (req, res) => {
  try {
    const { binId, fillLevel, battery, timestamp } = req.body;

    // Validate required fields
    if (!binId || fillLevel === undefined || battery === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Bin ID, fill level, and battery level are required'
      });
    }

    // Find and update bin or create if doesn't exist
    let bin = await Bin.findOne({ binId });
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found. Please register the bin first.'
      });
    }

    // Update bin data
    bin.fillLevel = fillLevel;
    bin.battery = battery;
    
    if (timestamp) {
      bin.lastUpdated = new Date(timestamp);
    }

    await bin.save();

    // Generate alerts if needed
    await generateAlerts(bin);

    // Emit real-time update to connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('binUpdate', {
        binId: bin.binId,
        fillLevel: bin.fillLevel,
        battery: bin.battery,
        status: bin.status,
        maintenanceRequired: bin.maintenanceRequired,
        lastUpdated: bin.lastUpdated
      });
    }

    res.json({
      success: true,
      message: 'Bin data updated successfully',
      data: {
        bin
      }
    });
  } catch (error) {
    console.error('Error updating bin data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bin data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get all bin status data
// @route   GET /api/bins/status
// @access  Private
const getBinStatus = async (req, res) => {
  try {
    const { status, area, maintenance } = req.query;
    
    // Build filter object
    const filter = { isActive: true };
    
    if (status) {
      filter.status = status;
    }
    
    if (area) {
      filter['location.area'] = area;
    }
    
    if (maintenance === 'true') {
      filter.maintenanceRequired = true;
    }

    const bins = await Bin.find(filter).sort({ lastUpdated: -1 });

    // Get areas for filter options
    const areas = await Bin.distinct('location.area', { isActive: true });

    res.json({
      success: true,
      count: bins.length,
      data: {
        bins,
        areas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bin status',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get single bin details
// @route   GET /api/bins/:id
// @access  Private
const getBinById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const bin = await Bin.findOne({ 
      $or: [
        { _id: id },
        { binId: id }
      ]
    });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    // Get recent alerts for this bin
    const alerts = await Alert.find({ 
      binId: bin.binId,
      isActive: true 
    }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        bin,
        alerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bin details',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get active alerts
// @route   GET /api/alerts
// @access  Private
const getActiveAlerts = async (req, res) => {
  try {
    const { type, severity, binId } = req.query;
    
    const filter = { isActive: true };
    
    if (type) {
      filter.type = type;
    }
    
    if (severity) {
      filter.severity = severity;
    }
    
    if (binId) {
      filter.binId = binId;
    }

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    // Get alert counts by type
    const alertCounts = await Alert.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      count: alerts.length,
      data: {
        alerts,
        alertCounts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Create new bin
// @route   POST /api/bins
// @access  Private/Admin
const createBin = async (req, res) => {
  try {
    const {
      binId,
      location,
      capacity,
      type,
      fillLevel = 0,
      battery = 100
    } = req.body;

    // Check if bin already exists
    const existingBin = await Bin.findOne({ binId });
    if (existingBin) {
      return res.status(400).json({
        success: false,
        message: 'Bin with this ID already exists'
      });
    }

    const bin = await Bin.create({
      binId,
      location,
      capacity,
      type,
      fillLevel,
      battery
    });

    res.status(201).json({
      success: true,
      message: 'Bin created successfully',
      data: {
        bin
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create bin',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Acknowledge alert
// @route   PUT /api/alerts/:id/acknowledge
// @access  Private
const acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await Alert.findById(id);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedAt = new Date();
    
    await alert.save();

    // Emit update to connected clients
    const io = req.app.get('io');
    if (io) {
      io.emit('alertAcknowledged', {
        alertId: alert._id,
        acknowledgedBy: req.user.name,
        acknowledgedAt: alert.acknowledgedAt
      });
    }

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: { alert }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to acknowledge alert',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Find nearest bins to location
// @route   GET /api/bins/nearest
// @access  Private
const findNearestBin = async (req, res) => {
  try {
    const { latitude, longitude, collectionType = 'food' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Find all active bins of the specified type
    const bins = await Bin.find({
      isActive: true,
      type: collectionType,
      fillLevel: { $lt: 90 } // Not almost full
    });

    // Calculate distance for each bin using Haversine formula
    const binsWithDistance = bins.map(bin => {
      const distance = calculateDistance(
        lat, lng,
        bin.location.coordinates.lat,
        bin.location.coordinates.lng
      );
      
      return {
        ...bin.toObject(),
        distance: Math.round(distance * 100) / 100 // Round to 2 decimal places
      };
    });

    // Sort by distance and limit to nearest 10
    const nearestBins = binsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    res.json({
      success: true,
      count: nearestBins.length,
      data: {
        bins: nearestBins
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to find nearest bins',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Register new bin (for users/property owners)
// @route   POST /api/bins/register
// @access  Private
const registerBin = async (req, res) => {
  try {
    const {
      address,
      area,
      coordinates,
      capacity = 100,
      type = 'food'
    } = req.body;

    // Validate required fields
    if (!address || !area || !coordinates?.lat || !coordinates?.lng) {
      return res.status(400).json({
        success: false,
        message: 'Address, area, and coordinates are required'
      });
    }

    // Generate unique bin ID with consistent format
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    const binId = `BIN-${timestamp}-${random}`;

    console.log('Generated Bin ID:', binId); // Debug log

    const bin = await Bin.create({
      binId,
      location: {
        address,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng
        },
        area
      },
      capacity,
      type,
      fillLevel: 0,
      battery: 100,
      isActive: false, // Needs admin approval
      registeredBy: req.user._id
    });

    console.log('Bin created successfully with ID:', bin.binId); // Debug log

    // Notify admins about new bin registration
    try {
      await notifyAdminsOfNewBinRegistration(bin, req.user);
    } catch (notificationError) {
      console.error('Failed to notify admins (non-critical):', notificationError);
    }

    res.status(201).json({
      success: true,
      message: 'Bin registered successfully. Awaiting admin approval.',
      data: { bin }
    });
  } catch (error) {
    console.error('Error in registerBin:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to register bin',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get pending bin registrations (admin only)
// @route   GET /api/bins/admin/pending
// @access  Private/Admin
const getPendingBins = async (req, res) => {
  try {
    console.log('Admin fetching pending bins...');
    
    // Find bins that are not active and not yet approved or rejected
    const pendingBins = await Bin.find({ 
      isActive: false,
      $and: [
        {
          $or: [
            { approvedBy: { $exists: false } },
            { approvedBy: null }
          ]
        },
        {
          $or: [
            { rejectedBy: { $exists: false } },
            { rejectedBy: null }
          ]
        }
      ]
    })
    .populate('registeredBy', 'name email')
    .sort({ createdAt: -1 });

    console.log(`Found ${pendingBins.length} pending bins for approval`);

    res.json({
      success: true,
      count: pendingBins.length,
      data: { bins: pendingBins }
    });
  } catch (error) {
    console.error('Error fetching pending bins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending bins',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Approve bin registration (admin only)
// @route   PUT /api/bins/admin/:id/approve
// @access  Private/Admin
const approveBin = async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, notes } = req.body;
    
    console.log(`Admin ${approved ? 'approving' : 'rejecting'} bin with ID: ${id}`);
    
    const bin = await Bin.findById(id)
      .populate('registeredBy', 'name email');
    
    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found'
      });
    }

    if (approved) {
      // Approve the bin
      bin.isActive = true;
      bin.approvedBy = req.user._id;
      bin.approvedAt = new Date();
      
      // Clear any rejection data if previously rejected
      bin.rejectedBy = undefined;
      bin.rejectedAt = undefined;
      
      if (notes) {
        bin.notes = bin.notes ? `${bin.notes}\n\nAdmin Approval Note: ${notes}` : `Admin Approval Note: ${notes}`;
      }
      
      await bin.save();
      
      console.log(`Bin ${bin.binId} approved successfully`);
      
      // Notify user about bin approval
      try {
        await notifyUserOfBinApproval(bin, true);
      } catch (notificationError) {
        console.error('Failed to notify user (non-critical):', notificationError);
      }
      
      res.json({
        success: true,
        message: 'Bin approved successfully',
        data: { bin }
      });
    } else {
      // Reject the bin
      bin.isActive = false;
      bin.rejectedBy = req.user._id;
      bin.rejectedAt = new Date();
      
      // Clear any approval data if previously approved
      bin.approvedBy = undefined;
      bin.approvedAt = undefined;
      
      if (notes) {
        bin.notes = bin.notes ? `${bin.notes}\n\nAdmin Rejection Note: ${notes}` : `Admin Rejection Note: ${notes}`;
      }
      
      await bin.save();
      
      console.log(`Bin ${bin.binId} rejected`);
      
      // Notify user about bin rejection
      try {
        await notifyUserOfBinApproval(bin, false);
      } catch (notificationError) {
        console.error('Failed to notify user (non-critical):', notificationError);
      }
      
      res.json({
        success: true,
        message: 'Bin registration rejected',
        data: { bin }
      });
    }
  } catch (error) {
    console.error('Error processing bin approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bin approval',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get user's registered bins (all statuses)
// @route   GET /api/bins/user/registered
// @access  Private
const getUserRegisteredBins = async (req, res) => {
  try {
    console.log('Fetching all registered bins for user:', req.user._id);
    
    // Find all bins registered by the user (regardless of approval status)
    const userBins = await Bin.find({ 
      registeredBy: req.user._id
    })
    .populate('registeredBy', 'name email')
    .populate('approvedBy', 'name')
    .populate('rejectedBy', 'name')
    .sort({ createdAt: -1 });

    console.log(`Found ${userBins.length} bins for user`);

    res.json({
      success: true,
      count: userBins.length,
      data: { bins: userBins }
    });
  } catch (error) {
    console.error('Error fetching user bins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your registered bins',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI/180);
};

// Helper function to generate alerts
const generateAlerts = async (bin) => {
  try {
    const alerts = [];

    // Check for overflow
    if (bin.fillLevel > 100) {
      const existingAlert = await Alert.findOne({
        binId: bin.binId,
        type: 'overflow',
        isActive: true
      });

      if (!existingAlert) {
        alerts.push({
          binId: bin.binId,
          type: 'overflow',
          severity: 'critical',
          message: `Bin ${bin.binId} is overflowing (${bin.fillLevel}%)`
        });
      }
    }

    // Check for low battery
    if (bin.battery < 20) {
      const existingAlert = await Alert.findOne({
        binId: bin.binId,
        type: 'low_battery',
        isActive: true
      });

      if (!existingAlert) {
        const severity = bin.battery < 10 ? 'critical' : 'high';
        alerts.push({
          binId: bin.binId,
          type: 'low_battery',
          severity,
          message: `Bin ${bin.binId} has low battery (${bin.battery}%)`
        });
      }
    }

    // Check if bin is offline (no updates for 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (bin.lastUpdated < twoHoursAgo) {
      const existingAlert = await Alert.findOne({
        binId: bin.binId,
        type: 'offline',
        isActive: true
      });

      if (!existingAlert) {
        alerts.push({
          binId: bin.binId,
          type: 'offline',
          severity: 'medium',
          message: `Bin ${bin.binId} has been offline since ${bin.lastUpdated.toLocaleString()}`
        });
      }
    }

    // Insert new alerts into the database
    if (alerts.length > 0) {
      await Alert.insertMany(alerts);

      // Emit alerts to connected clients
      const io = req.app.get('io');
      if (io) {
        alerts.forEach(alert => {
          io.emit('newAlert', alert);
        });
      }
    } else {
      // Resolve alerts that are no longer applicable
      await Alert.updateMany(
        { binId: bin.binId, type: 'overflow', isActive: true },
        { isActive: false, resolvedAt: new Date() }
      );

      if (bin.battery >= 20) {
        await Alert.updateMany(
          { binId: bin.binId, type: 'low_battery', isActive: true },
          { isActive: false, resolvedAt: new Date() }
        );
      }
    }
  } catch (error) {
    console.error('Error generating alerts:', error);
    if (bin.battery >= 20) {
      await Alert.updateMany(
        { binId: bin.binId, type: 'low_battery', isActive: true },
        { isActive: false, resolvedAt: new Date() }
      );
    }
  }
};

// @desc    Update bin fill level and battery by user
// @route   PUT /api/bins/user/:id/update
// @access  Private
const updateUserBinData = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, battery } = req.body;

    // Validate inputs
    if (!status || battery === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Fill status and battery level are required'
      });
    }

    // Validate status
    const validStatuses = ['Empty', 'Half-Full', 'Full', 'Overflow'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: Empty, Half-Full, Full, Overflow'
      });
    }

    if (battery < 0 || battery > 100) {
      return res.status(400).json({
        success: false,
        message: 'Battery level must be between 0 and 100%'
      });
    }

    // Find bin by ID or binId and ensure it belongs to the user
    const bin = await Bin.findOne({
      $and: [
        {
          $or: [
            { _id: id },
            { binId: id }
          ]
        },
        { registeredBy: req.user._id },
        { isActive: true } // Only allow updates for approved bins
      ]
    });

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found or you do not have permission to update it'
      });
    }

    // Convert status to fillLevel for internal calculations
    let fillLevel = 0;
    switch (status) {
      case 'Empty':
        fillLevel = 10;
        break;
      case 'Half-Full':
        fillLevel = 50;
        break;
      case 'Full':
        fillLevel = 90;
        break;
      case 'Overflow':
        fillLevel = 120;
        break;
    }

    // Update bin data
    bin.fillLevel = fillLevel;
    bin.status = status;
    bin.battery = battery;
    bin.lastUpdated = new Date();

    await bin.save();

    // Generate alerts if needed
    await generateAlerts(bin);

    console.log(`User ${req.user.name} updated bin ${bin.binId}: Status=${status}, Battery=${battery}%`);

    res.json({
      success: true,
      message: 'Bin data updated successfully',
      data: { bin }
    });
  } catch (error) {
    console.error('Error updating user bin data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bin data',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// @desc    Get user-wise bin data for admin
// @route   GET /api/bins/users
// @access  Private (Admin only)
const getUserBinData = async (req, res) => {
  try {
    // Find all users who have registered bins
    const usersWithBins = await User.aggregate([
      {
        $lookup: {
          from: 'bins',
          localField: '_id',
          foreignField: 'registeredBy',
          as: 'bins'
        }
      },
      {
        $match: {
          bins: { $ne: [] } // Only users with bins
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'bins.approvedBy',
          foreignField: '_id',
          as: 'approvers'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'bins.rejectedBy',
          foreignField: '_id',
          as: 'rejectors'
        }
      },
      {
        $project: {
          user: {
            _id: '$_id',
            name: '$name',
            email: '$email',
            phone: '$phone'
          },
          bins: {
            $map: {
              input: '$bins',
              as: 'bin',
              in: {
                _id: '$$bin._id',
                binId: '$$bin.binId',
                location: '$$bin.location',
                capacity: '$$bin.capacity',
                type: '$$bin.type',
                fillLevel: '$$bin.fillLevel',
                battery: '$$bin.battery',
                status: '$$bin.status',
                isActive: '$$bin.isActive',
                approvedBy: {
                  $cond: {
                    if: '$$bin.approvedBy',
                    then: {
                      $let: {
                        vars: {
                          approver: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$approvers',
                                  cond: { $eq: ['$$this._id', '$$bin.approvedBy'] }
                                }
                              },
                              0
                            ]
                          }
                        },
                        in: {
                          _id: '$$approver._id',
                          name: '$$approver.name'
                        }
                      }
                    },
                    else: null
                  }
                },
                approvedAt: '$$bin.approvedAt',
                rejectedBy: {
                  $cond: {
                    if: '$$bin.rejectedBy',
                    then: {
                      $let: {
                        vars: {
                          rejector: {
                            $arrayElemAt: [
                              {
                                $filter: {
                                  input: '$rejectors',
                                  cond: { $eq: ['$$this._id', '$$bin.rejectedBy'] }
                                }
                              },
                              0
                            ]
                          }
                        },
                        in: {
                          _id: '$$rejector._id',
                          name: '$$rejector.name'
                        }
                      }
                    },
                    else: null
                  }
                },
                rejectedAt: '$$bin.rejectedAt',
                notes: '$$bin.notes',
                createdAt: '$$bin.createdAt',
                updatedAt: '$$bin.updatedAt'
              }
            }
          },
          totalBins: { $size: '$bins' },
          activeBins: {
            $size: {
              $filter: {
                input: '$bins',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          },
          pendingBins: {
            $size: {
              $filter: {
                input: '$bins',
                cond: {
                  $and: [
                    { $eq: ['$$this.isActive', false] },
                    { $eq: ['$$this.approvedBy', null] },
                    { $eq: ['$$this.rejectedBy', null] }
                  ]
                }
              }
            }
          },
          rejectedBins: {
            $size: {
              $filter: {
                input: '$bins',
                cond: { 
                  $ifNull: ['$$this.rejectedBy', false]
                }
              }
            }
          }
        }
      },
      {
        $sort: { 'user.name': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'User bin data retrieved successfully',
      data: usersWithBins
    });

  } catch (error) {
    console.error('Error in getUserBinData:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user bin data',
      error: error.message
    });
  }
};

module.exports = {
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
};

// Helper function to notify admins of new bin registrations
const notifyAdminsOfNewBinRegistration = async (bin, user) => {
  try {
    console.log(`[NOTIFICATION] Notifying admins of new bin registration: ${bin.binId}`);
    
    // Find all admin users
    const adminUsers = await User.find({ 
      role: 'admin', 
      isActive: true 
    }).select('_id name email');

    // Create notifications for each admin
    for (const admin of adminUsers) {
      const title = 'New Bin Registration';
      const message = `New bin registration from ${user.name} at ${bin.location.address}. Bin ID: ${bin.binId}`;
      
      try {
        await createNotification(
          admin._id, 
          'new_bin_request', 
          title, 
          message, 
          bin.binId
        );
        console.log(`📧 Admin notification created for ${admin.email}: ${bin.binId}`);
      } catch (notificationError) {
        console.error(`Failed to create notification for admin ${admin.email}:`, notificationError);
      }
    }

    console.log(`[NOTIFICATION] Successfully notified ${adminUsers.length} admins about bin registration`);
    
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying admins of bin registration:', error);
    throw error;
  }
};

// Helper function to notify user of bin approval/rejection
const notifyUserOfBinApproval = async (bin, approved) => {
  try {
    const type = approved ? 'bin_approved' : 'bin_rejected';
    const title = approved ? 'Bin Registration Approved' : 'Bin Registration Rejected';
    const message = approved 
      ? `Your bin registration ${bin.binId} has been approved and is now active. You can start requesting waste collections.`
      : `Your bin registration ${bin.binId} has been rejected. Please contact support for more information.`;
    
    await createNotification(
      bin.registeredBy, 
      type, 
      title, 
      message, 
      bin.binId
    );
    
    console.log(`[NOTIFICATION] User notification created for bin ${approved ? 'approval' : 'rejection'}: ${bin.binId}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error notifying user of bin approval:', error);
    throw error;
  }
};
