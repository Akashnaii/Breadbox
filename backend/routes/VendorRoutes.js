const express = require('express');
const router = express.Router();
const { body, validationResult, query } = require('express-validator');
const vendorController = require('../controllers/vendorController');
const authenticateToken = require('../middleware/vendor_auth');

// Validation middleware
const validate = (validations) => [
  ...validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Register
router.post(
  '/register',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    body('phoneNumber').matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian phone number format'),
    body('address').notEmpty().withMessage('Address is required'),
  ]),
  vendorController.register
);

// Verify OTP
router.post(
  '/verify-otp',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp').notEmpty().withMessage('OTP is required'),
  ]),
  vendorController.verifyOTP
);

// Resend OTP
router.post(
  '/resend-otp',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
  ]),
  vendorController.resendOTP
);

// Login
router.post(
  '/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  vendorController.login
);

// Logout
router.post('/logout', authenticateToken, vendorController.logout);

// Update Vendor
router.put(
  '/update',
  authenticateToken,
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('name').optional().isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    body('phoneNumber').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian phone number format'),
    body('address').optional().notEmpty().withMessage('Address is required'),
  ]),
  vendorController.updateVendor
);

// Update Password
router.put(
  '/update-password',
  authenticateToken,
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ]),
  vendorController.updatePassword
);

// Delete Account
router.delete(
  '/delete',
  authenticateToken,
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  vendorController.deleteAccount
);

// Dashboard
router.get('/dashboard', authenticateToken, vendorController.dashboard);

// Restaurant Routes
router.post(
  '/restaurant',
  authenticateToken,
  validate([
    body('name').notEmpty().withMessage('Restaurant name is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('phone').matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian phone number format'),
    body('operatingHours').notEmpty().withMessage('Operating hours are required'),
  ]),
  vendorController.addRestaurant
);

router.get(
  '/restaurant',
  authenticateToken,
  vendorController.getRestaurant
);

router.put(
  '/restaurant/:id',
  authenticateToken,
  validate([
    body('name').optional().notEmpty().withMessage('Restaurant name cannot be empty'),
    body('address').optional().notEmpty().withMessage('Address cannot be empty'),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid Indian phone number format'),
    body('operatingHours').optional().notEmpty().withMessage('Operating hours cannot be empty'),
  ]),
  vendorController.updateRestaurant
);

router.delete(
  '/restaurant/:id',
  authenticateToken,
  vendorController.deleteRestaurant
);

// Items
router.post(
  '/item',
  authenticateToken,
  validate([
    body('name').notEmpty().withMessage('Item name is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    body('price').isNumeric().withMessage('Price must be a number').custom((value) => value >= 0).withMessage('Price must be non-negative'),
    body('type').isIn(['Food', 'Juice']).withMessage('Type must be Food or Juice'),
    body('isAvailable').optional().isBoolean().withMessage('Availability must be a boolean'),
  ]),
  vendorController.addItem
);
router.get('/items', authenticateToken, vendorController.getItems);
router.put(
  '/item/:id',
  authenticateToken,
  validate([
    body('name').optional().notEmpty().withMessage('Item name is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    body('price').optional().isNumeric().withMessage('Price must be a number').custom((value) => value >= 0).withMessage('Price must be non-negative'),
    body('type').optional().isIn(['Food', 'Juice']).withMessage('Type must be Food or Juice'),
    body('isAvailable').optional().isBoolean().withMessage('Availability must be a boolean'),
  ]),
  vendorController.updateItem
);
router.delete('/item/:id', authenticateToken, vendorController.deleteItem);
router.get(
  '/items/search',
  authenticateToken,
  validate([
    query('query').notEmpty().withMessage('Search query is required'),
  ]),
  vendorController.searchItems
);

// Breakfast Packages
router.post(
  '/breakfast-package',
  authenticateToken,
  validate([
    body('packageName').notEmpty().withMessage('Package name is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    body('price').isNumeric().withMessage('Price must be a number').custom((value) => value >= 0).withMessage('Price must be non-negative'),
    body('items').isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('imageUrl').optional().isString().withMessage('Image URL must be a string'),
    body('isActive').optional().isBoolean().withMessage('Active status must be a boolean'),
  ]),
  vendorController.addBreakfastPackage
);
router.get('/breakfast-packages', authenticateToken, vendorController.getBreakfastPackages);
router.put(
  '/breakfast-package/:id',
  authenticateToken,
  validate([
    body('packageName').optional().notEmpty().withMessage('Package name is required'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description must not exceed 500 characters'),
    body('price').optional().isNumeric().withMessage('Price must be a number').custom((value) => value >= 0).withMessage('Price must be non-negative'),
    body('items').optional().isArray({ min: 1 }).withMessage('Items must be a non-empty array'),
    body('imageUrl').optional().isString().withMessage('Image URL must be a string'),
    body('isActive').optional().isBoolean().withMessage('Active status must be a boolean'),
  ]),
  vendorController.updateBreakfastPackage
);
router.delete('/breakfast-package/:id', authenticateToken, vendorController.deleteBreakfastPackage);

module.exports = router;