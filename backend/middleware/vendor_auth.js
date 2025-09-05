const jwt = require('jsonwebtoken');
const Vendor = require('../models/Vendor');
require('dotenv').config();

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'Authentication required: No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const vendor = await Vendor.findById(decoded.vendorId);

    if (!vendor || !vendor.isVerified) {
      return res.status(401).json({ message: 'Unauthorized: Vendor not found or unverified' });
    }

    req.vendor = { id: vendor._id, email: vendor.email, name: vendor.name };
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(403).json({
      message: err.name === 'TokenExpiredError' ? 'Token expired, please log in again' : 'Authentication failed',
      error: err.message,
    });
  }
};

module.exports = authenticateToken;