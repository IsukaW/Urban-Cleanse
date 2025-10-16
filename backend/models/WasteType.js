const mongoose = require('mongoose');

const wasteTypeSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    unique: true,
    enum: ['food', 'polythene', 'paper', 'hazardous', 'ewaste']
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  baseCost: {
    type: Number,
    required: true,
    min: 0
  },
  restrictions: [{
    type: String
  }],
  maxWeight: {
    type: Number, // in kg
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WasteType', wasteTypeSchema);
