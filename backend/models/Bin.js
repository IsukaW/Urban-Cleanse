const mongoose = require('mongoose');

const binSchema = new mongoose.Schema({
  binId: {
    type: String,
    required: [true, 'Bin ID is required'],
    unique: true,
    trim: true
  },
  location: {
    type: {
      address: {
        type: String,
        required: [true, 'Address is required']
      },
      coordinates: {
        lat: {
          type: Number,
          required: [true, 'Latitude is required'],
          min: [-90, 'Latitude must be between -90 and 90'],
          max: [90, 'Latitude must be between -90 and 90']
        },
        lng: {
          type: Number,
          required: [true, 'Longitude is required'],
          min: [-180, 'Longitude must be between -180 and 180'],
          max: [180, 'Longitude must be between -180 and 180']
        }
      },
      area: {
        type: String,
        required: [true, 'Area is required']
      }
    },
    required: true
  },
  fillLevel: {
    type: Number,
    required: [true, 'Fill level is required'],
    min: [0, 'Fill level cannot be negative'],
    max: [150, 'Fill level cannot exceed 150%']
  },
  battery: {
    type: Number,
    required: [true, 'Battery level is required'],
    min: [0, 'Battery level cannot be negative'],
    max: [100, 'Battery level cannot exceed 100%']
  },
  status: {
    type: String,
    enum: ['Empty', 'Half-Full', 'Full', 'Overflow'],
    required: true,
    default: function() {
      // Calculate default status based on fillLevel
      if (this.fillLevel < 40) return 'Empty';
      if (this.fillLevel < 80) return 'Half-Full';
      if (this.fillLevel <= 100) return 'Full';
      return 'Overflow';
    }
  },
  capacity: {
    type: Number,
    default: 100, // liters
    min: [1, 'Capacity must be positive']
  },
  type: {
    type: String,
    enum: ['food', 'polythene', 'paper', 'hazardous', 'ewaste'],
    default: 'food'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  maintenanceRequired: {
    type: Boolean,
    default: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastMaintenance: {
    type: Date,
    default: Date.now
  },
  lastCollected: {
    type: Date,
    default: null
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true
});

// Middleware to determine status based on fill level
binSchema.pre('save', function(next) {
  // Calculate status based on fill level
  if (this.fillLevel < 40) {
    this.status = 'Empty';
  } else if (this.fillLevel < 80) {
    this.status = 'Half-Full';
  } else if (this.fillLevel <= 100) {
    this.status = 'Full';
  } else {
    this.status = 'Overflow';
  }

  // Check if maintenance is required
  this.maintenanceRequired = this.battery < 20 || this.fillLevel > 100;
  
  // Update lastUpdated timestamp
  this.lastUpdated = new Date();
  
  next();
});

// Index for efficient queries (avoid duplicate index warning)
binSchema.index({ binId: 1 }, { unique: true });
binSchema.index({ status: 1 });
binSchema.index({ 'location.area': 1 });
binSchema.index({ lastUpdated: -1 });

module.exports = mongoose.model('Bin', binSchema);
