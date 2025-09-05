const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: [true, 'Restaurant name is required'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number format'],
  },
  operatingHours: {
    type: String,
    required: [true, 'Operating hours are required'],
    trim: true,
  },

}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);