require('dotenv').config();
const mongoose = require("mongoose");
const Vendor = require('../models/Vendor');
const emailUtils = require('../utils/Email');
const Restaurant = require('../models/Restaurant');
const Item = require('../models/Item');
const Package = require('../models/Package');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Generate OTP
const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Register Vendor
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phoneNumber, address } = req.body;

    let vendor = await Vendor.findOne({ email });
    if (vendor) return res.status(400).json({ message: 'Vendor already exists' });

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    vendor = new Vendor({ name, email, password, phoneNumber, address, otp, otpExpiry });
    await vendor.save();

    await emailUtils.sendOTPEmail(email, otp, 'register', 'user');
 
    res.status(201).json({ message: 'Vendor registered. Please verify OTP sent to your email.' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering vendor', error: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });
    if (vendor.isVerified) return res.status(400).json({ message: 'Vendor already verified' });

    const isOtpValid = await bcrypt.compare(otp, vendor.otp);
    if (!isOtpValid || vendor.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    vendor.isVerified = true;
    vendor.otp = undefined;
    vendor.otpExpiry = undefined;
    await vendor.save();

    res.json({ message: 'Email verified successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying OTP', error: error.message });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });
    if (vendor.isVerified) return res.status(400).json({ message: 'Vendor already verified' });

    const otp = generateOTP();
    vendor.otp = otp;
    vendor.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await vendor.save();
    await emailUtils.sendOTPEmail(email, otp, 'register', 'user');

    res.json({ message: 'OTP resent successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending OTP', error: error.message });
  }
};

// Login Vendor
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });

    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect password' });

    if (!vendor.isVerified) {
      return res.status(400).json({ message: 'Email not verified. Please verify OTP.' });
    }

    const token = jwt.sign(
      { vendorId: vendor._id, email: vendor.email, name: vendor.name },
      process.env.JWT_SECRET
    );

    res.json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Logout Vendor
exports.logout = async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully. Please clear your token.' });
  } catch (error) {
    res.status(500).json({ message: 'Error logging out', error: error.message });
  }
};

// Update Vendor Profile
exports.updateVendor = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, phoneNumber, address } = req.body;

    if (!req.vendor || req.vendor.email !== email) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });

    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect password' });

    const updatedFields = {};
    if (name && name !== vendor.name) updatedFields.name = name;
    if (phoneNumber && phoneNumber !== vendor.phoneNumber) updatedFields.phoneNumber = phoneNumber;
    if (address && address !== vendor.address) updatedFields.address = address;

    if (Object.keys(updatedFields).length === 0) {
      return res.status(400).json({ message: 'No changes provided' });
    }

    await Vendor.updateOne({ email }, updatedFields);
        await emailUtils.sendUpdateConfirmationEmail(email, vendor.name, updatedFields, 'vendor');

    res.json({ message: 'Vendor profile updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Update Password
exports.updatePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, currentPassword, newPassword } = req.body;

    if (!req.vendor || req.vendor.email !== email) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });

    const isPasswordValid = await vendor.comparePassword(currentPassword);
    if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect current password' });

    vendor.password = newPassword;
    await vendor.save();

        await emailUtils.sendPasswordUpdateConfirmationEmail(email, vendor.name, 'vendor');

    res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating password', error: error.message });
  }
};

// Delete Account
exports.deleteAccount = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    if (!req.vendor || req.vendor.email !== email) {
      return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) return res.status(400).json({ message: 'Vendor not found' });

    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect password' });

    await Restaurant.deleteOne({ vendorId: vendor._id });
    await Item.deleteMany({ vendorId: vendor._id });
    await Package.deleteMany({ vendorId: vendor._id });
    const { name } = vendor;
    await Vendor.deleteOne({ email });

        await emailUtils.sendDeletionConfirmationEmail(email, vendor.name, 'vendor');
    res.json({ message: 'Account deleted successfully. Please clear your token.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account', error: error.message });
  }
};

// Dashboard
exports.dashboard = async (req, res) => {
  try {
    res.json({ message: `Welcome to the vendor dashboard, ${req.vendor.name}` });
  } catch (error) {
    res.status(500).json({ message: 'Error accessing dashboard', error: error.message });
  }
};

// Add Restaurant (Static)
exports.addRestaurant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { name, address, phone, operatingHours } = req.body;

    const existingRestaurant = await Restaurant.findOne({ vendorId: req.vendor.id });
    if (existingRestaurant) {
      return res.status(400).json({ message: 'Restaurant already exists for this vendor' });
    }

    const restaurant = new Restaurant({
      name,
      address,
      phone,
      operatingHours,
      vendorId: req.vendor.id,
    });
    await restaurant.save();

    res.status(201).json({ message: 'Restaurant added successfully', restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Error adding restaurant', error: error.message });
  }
};

// Get Restaurant
exports.getRestaurant = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const restaurant = await Restaurant.findOne({ vendorId: req.vendor.id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.status(200).json(restaurant);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching restaurant', error: error.message });
  }
};

// Update Restaurant
exports.updateRestaurant = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { name, address, phone, operatingHours } = req.body;

    const restaurant = await Restaurant.findOneAndUpdate(
      { vendorId: req.vendor.id },
      { name, address, phone, operatingHours },
      { new: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.status(200).json({ message: 'Restaurant updated successfully', restaurant });
  } catch (error) {
    res.status(500).json({ message: 'Error updating restaurant', error: error.message });
  }
};

// Delete Restaurant
exports.deleteRestaurant = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const restaurant = await Restaurant.findOneAndDelete({ vendorId: req.vendor.id });
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    res.status(200).json({ message: 'Restaurant deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting restaurant', error: error.message });
  }
};

// Add Item
exports.addItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { name, description, price, type, isAvailable } = req.body;

    const item = new Item({
      name,
      description,
      price,
      type,
      isAvailable,
      vendorId: req.vendor.id,
    });
    await item.save();

    res.status(201).json({ message: 'Item added successfully', item });
  } catch (error) {
    res.status(500).json({ message: 'Error adding item', error: error.message });
  }
};

// Get Items
exports.getItems = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const items = await Item.find({ vendorId: req.vendor.id });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error: error.message });
  }
};

// Update Item
exports.updateItem = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { name, description, price, type, isAvailable } = req.body;

    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendor.id },
      { name, description, price, type, isAvailable },
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item updated successfully', item });
  } catch (error) {
    res.status(500).json({ message: 'Error updating item', error: error.message });
  }
};

// Delete Item
exports.deleteItem = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const item = await Item.findOneAndDelete({
      _id: req.params.id,
      vendorId: req.vendor.id,
    });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting item', error: error.message });
  }
};

// Search Items by Name
exports.searchItems = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }

    const items = await Item.find(
      {
        vendorId: req.vendor.id,
        $text: { $search: query },
      },
      { score: { $meta: 'textScore' } }
    ).sort({ score: { $meta: 'textScore' } });

    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Error searching items', error: error.message });
  }
};

// Add Breakfast Package
exports.addBreakfastPackage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { packageName, description, price, items, imageUrl, isActive } = req.body;

    // Validate item IDs
    if (!items.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid item ID format' });
    }

    // Ensure vendor owns all items
    const validItems = await Item.find({ _id: { $in: items }, vendorId: req.vendor.id });
    if (validItems.length !== items.length) {
      return res.status(400).json({ message: 'Some items are invalid or not authorized' });
    }

    const breakfastPackage = new Package({
      packageName,
      description,
      price: Number(price),
      items,
      imageUrl: imageUrl || '',
      isActive: true,
      vendorId: req.vendor.id,
    });

    await breakfastPackage.save();

    res.status(201).json({ message: 'Breakfast package added successfully', breakfastPackage });
  } catch (error) {
    res.status(500).json({ message: 'Error adding breakfast package', error: error.message });
  }
};

// Get Breakfast Packages
exports.getBreakfastPackages = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const packages = await Package.find({ vendorId: req.vendor.id }).populate('items');
    res.status(200).json(packages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching breakfast packages', error: error.message });
  }
};

// Update Breakfast Package
exports.updateBreakfastPackage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const { packageName, description, price, items, imageUrl, isActive } = req.body;

    if (items) {
      const validItems = await Item.find({ _id: { $in: items }, vendorId: req.vendor.id });
      if (validItems.length !== items.length) {
        return res.status(400).json({ message: 'Some items are invalid or not authorized' });
      }
    }

    const breakfastPackage = await Package.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.vendor.id },
      { packageName, description, price, items, imageUrl, isActive },
      { new: true }
    );
    if (!breakfastPackage) {
      return res.status(404).json({ message: 'Breakfast package not found' });
    }

    res.status(200).json({ message: 'Breakfast package updated successfully', breakfastPackage });
  } catch (error) {
    res.status(500).json({ message: 'Error updating breakfast package', error: error.message });
  }
};

// Delete Breakfast Package
exports.deleteBreakfastPackage = async (req, res) => {
  try {
    if (!req.vendor) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    const breakfastPackage = await Package.findOneAndDelete({
      _id: req.params.id,
      vendorId: req.vendor.id,
    });
    if (!breakfastPackage) {
      return res.status(404).json({ message: 'Breakfast package not found' });
    }

    res.status(200).json({ message: 'Breakfast package deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting breakfast package', error: error.message });
  }
};
