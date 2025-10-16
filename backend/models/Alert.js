const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  binId: {
    type: String,
    required: [true, 'Bin ID is required'],
    ref: 'Bin'
  },
  type: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: ['overflow', 'low_battery', 'maintenance', 'offline']
  },
  severity: {
    type: String,
    required: [true, 'Alert severity is required'],
    enum: ['low', 'medium', 'high', 'critical']
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  acknowledgedAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for efficient queries
alertSchema.index({ binId: 1, isActive: 1 });
alertSchema.index({ type: 1, severity: 1 });
alertSchema.index({ createdAt: -1 });
alertSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model('Alert', alertSchema);
