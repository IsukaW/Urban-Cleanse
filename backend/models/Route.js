const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: [true, 'Route ID is required'],
    unique: true,
    trim: true
  },
  collectorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Collector ID is required']
  },
  assignedDate: {
    type: Date,
    required: [true, 'Assigned date is required']
  },
  status: {
    type: String,
    enum: ['assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'assigned'
  },
  bins: [{
    binId: {
      type: String,
      required: true
    },
    requestId: {
      type: String,  // Reference to WasteRequest.requestId
      default: null
    },
    priority: {
      type: String,
      enum: ['normal', 'high', 'urgent'],
      default: 'normal'
    },
    estimatedTime: {
      type: Number,
      default: 15 // minutes
    },
    sequence: {
      type: Number,
      required: true
    },
    customerInfo: {
      name: String,
      email: String,
      collectionType: String,
      cost: Number
    },
    completedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  startTime: {
    type: Date,
    default: null
  },
  endTime: {
    type: Date,
    default: null
  },
  estimatedDuration: {
    type: Number, // minutes
    required: true
  },
  actualDuration: {
    type: Number, // minutes
    default: null
  },
  completedBins: {
    type: Number,
    default: 0
  },
  totalBins: {
    type: Number,
    required: true
  },
  area: {
    type: String,
    required: [true, 'Area is required']
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
}, {
  timestamps: true
});

// Index for efficient queries
routeSchema.index({ collectorId: 1, assignedDate: -1 });
routeSchema.index({ status: 1 });
routeSchema.index({ routeId: 1 }, { unique: true });

module.exports = mongoose.model('Route', routeSchema);
