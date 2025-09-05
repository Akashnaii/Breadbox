const express = require('express');
const { register, verifyOTP, resendOTP, login, logout, dashboard, updateUser, updatePassword, deleteAccount, adminStats } = require('../controllers/authcontroller');
const { authenticateToken, restrictTo } = require('../middleware/authmiddleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/login', login);

// Protected routes (accessible to all authenticated users)
router.post('/logout', authenticateToken, logout);
router.put('/update-user', authenticateToken, updateUser);
router.put('/update-password', authenticateToken, updatePassword);
router.delete('/delete-account', authenticateToken, deleteAccount);
router.get('/dashboard', authenticateToken, dashboard);

// Admin-only route
router.get('/admin-stats', authenticateToken, restrictTo('admin'), adminStats);

module.exports = router;