const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  collectionId: {
    type: String,
    unique: true,
    // Will be generated in pre-save middleware
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Collector ID is required']
  },
  binId: {
    type: String,
    required: [true, 'Bin ID is required']
  },
  routeId: {
    type: String,
    required: [true, 'Route ID is required']
  },
  status: {
    type: String,
    enum: ['pending', 'collected', 'failed', 'priority'],
    default: 'pending'
  },
  collectionMethod: {
    type: String,
    enum: ['scan', 'manual'],
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  collectedAt: {
    type: Date,
    default: null
  },
  issue: {
    issueType: {
      type: String,
      enum: ['damaged_bin', 'blocked_access', 'qr_damaged', 'overflow', 'hazardous_material', 'other']
    },
    description: {
      type: String,
      maxlength: [500, 'Issue description cannot exceed 500 characters']
    },
    requiresAdmin: {
      type: Boolean,
      default: false
    },
    reportedAt: {
      type: Date
    }
  },
  locationData: {
    coordinates: {
      lat: {
        type: Number,
        min: [-90, 'Latitude must be between -90 and 90'],
        max: [90, 'Latitude must be between -90 and 90']
      },
      lng: {
        type: Number,
        min: [-180, 'Longitude must be between -180 and 180'],
        max: [180, 'Longitude must be between -180 and 180']
      }
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative']
    },
    timestamp: {
      type: Date
    }
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Generate unique collection ID before saving
collectionSchema.pre('save', async function(next) {
  if (!this.collectionId) {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      this.collectionId = `COL-${timestamp}-${random}`;
      
      // Check if this ID already exists (very unlikely but good to be safe)
      const existingCollection = await mongoose.model('Collection').findOne({ collectionId: this.collectionId });
      if (existingCollection) {
        this.collectionId = `COL-${timestamp}-${random}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Index for efficient queries
collectionSchema.index({ collectorId: 1, timestamp: -1 });
collectionSchema.index({ binId: 1, routeId: 1 });
collectionSchema.index({ status: 1 });
collectionSchema.index({ collectionId: 1 }, { unique: true });

module.exports = mongoose.model('Collection', collectionSchema);
