const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vendor',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  type: {
    type: String,
    enum: ['Food', 'Juice'],
    required: [true, 'Item type is required'],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });


module.exports = mongoose.model('Item', itemSchema);