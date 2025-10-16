const mongoose = require('mongoose');

const wasteRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    // Remove required: true to allow generation in pre-save middleware
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  binId: {
    type: String,
    required: [true, 'Bin ID is required'],
    validate: {
      validator: function(v) {
        // Updated to match the actual bin ID format: BIN-timestamp-randomString
        return /^BIN-\d+-[A-Z0-9]+$/.test(v);
      },
      message: 'Bin ID must be in format BIN-timestamp-randomString (e.g., BIN-1234567890-ABC123)'
    }
  },
  collectionType: {
    type: String,
    required: [true, 'Collection type is required'],
    enum: ['food', 'polythene', 'paper', 'hazardous', 'ewaste'], // Updated to match new WasteType
    default: 'food'
  },
  preferredDate: {
    type: Date,
    required: [true, 'Preferred date is required'],
    validate: {
      validator: function(v) {
        // Allow today and future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of today
        const requestDate = new Date(v);
        requestDate.setHours(0, 0, 0, 0); // Set to start of request date
        return requestDate >= today;
      },
      message: 'Preferred date must be today or in the future'
    }
  },
  preferredTimeSlot: {
    type: String,
    enum: ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'],
    required: [true, 'Preferred time slot is required'],
    default: '08:00-10:00'
  },
  scheduledDate: {
    type: Date,
    default: null
  },
  scheduledTimeSlot: {
    type: String,
    enum: ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'],
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'completed', 'cancelled'],
    default: 'pending'
  },
  cost: {
    type: Number,
    required: true,
    min: [0, 'Cost cannot be negative']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  address: {
    street: String,
    city: String,
    postalCode: String
  },
  location: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    },
    address: {
      type: String,
      maxlength: [200, 'Location address cannot exceed 200 characters']
    }
  },
  // Add worker assignment fields
  assignedWorker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  routeId: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Generate unique request ID before saving
wasteRequestSchema.pre('save', async function(next) {
  if (!this.requestId) {
    try {
      // Generate a more robust unique ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 6).toUpperCase();
      this.requestId = `WR-${timestamp}-${random}`;
      
      // Check if this ID already exists (very unlikely but good to be safe)
      const existingRequest = await mongoose.model('WasteRequest').findOne({ requestId: this.requestId });
      if (existingRequest) {
        // If somehow we get a duplicate, add more randomness
        this.requestId = `WR-${timestamp}-${random}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Validate that requestId exists after pre-save middleware
wasteRequestSchema.pre('validate', function(next) {
  if (!this.requestId) {
    // Generate requestId if it doesn't exist during validation
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    this.requestId = `WR-${timestamp}-${random}`;
  }
  next();
});

// Index for efficient queries
wasteRequestSchema.index({ userId: 1, createdAt: -1 });
wasteRequestSchema.index({ binId: 1, preferredDate: 1 });
wasteRequestSchema.index({ status: 1 });
wasteRequestSchema.index({ requestId: 1 }, { unique: true });

module.exports = mongoose.model('WasteRequest', wasteRequestSchema);
