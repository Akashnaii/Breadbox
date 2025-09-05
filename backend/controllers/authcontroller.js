require('dotenv').config();
const User = require('../models/User');
const emailUtils = require('../utils/Email');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

// Register User and Send OTP
async function register(req, res) {
    try {
        const { name, email, password, phoneNumber, address, role } = req.body;

        // Basic validation
        if (!name || !email || !password || !phoneNumber || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if (!email.includes('@')) {
            return res.status(400).json({ message: 'Invalid email format' });
        }
        if (role && !['user', 'vendor', 'deliverypartner', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user = new User({ name, email, password, phoneNumber, address, otp, otpExpiry, role: role || 'user' });
        await user.save();

        await emailUtils.sendOTPEmail(email, otp, 'register', 'user');

        res.status(201).json({ message: 'User registered. Please verify OTP sent to your email.' });
    } catch (error) {
        res.status(500).json({ message: 'Error registering user', error: error.message });
    }
}

// Verify OTP
async function verifyOTP(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

        if (user.otp !== otp || user.otpExpiry < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpiry = undefined;
        await user.save();

        res.json({ message: 'Email verified successfully. You can now log in.' });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying OTP', error: error.message });
    }
}

// Resend OTP
async function resendOTP(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ message: 'User already verified' });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();

        await emailUtils.sendOTPEmail(email, otp, 'register', 'user');

        res.json({ message: 'OTP resent successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error resending OTP', error: error.message });
    }
}

// Login User
async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect password' });

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Email not verified. Please verify OTP.' });
        }

        const token = jwt.sign(
            { _id: user._id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET,
        );

        res.json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
}

// Logout User
async function logout(req, res) {
    try {
        res.json({ message: 'Logged out successfully. Please clear your token.' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging out', error: error.message });
    }
}

// Update User Information
async function updateUser(req, res) {
    try {
        const { email, name, phoneNumber, address } = req.body;

        if (!req.user || req.user.email !== email) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
        }
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Email not verified.' });
        }

        const updatedFields = {};
        if (name && name !== user.name) updatedFields.name = name;
        if (phoneNumber && phoneNumber !== user.phoneNumber) updatedFields.phoneNumber = phoneNumber;
        if (address && address !== user.address) updatedFields.address = address;

        if (Object.keys(updatedFields).length === 0) {
            return res.status(400).json({ message: 'No changes provided' });
        }

        await User.updateOne({ email }, updatedFields);

        await emailUtils.sendUpdateConfirmationEmail(email, user.name, updatedFields, 'user');

        res.json({ message: 'Account updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating account', error: error.message });
    }
}

// Update Password
async function updatePassword(req, res) {
    try {
        const { email, currentPassword, newPassword } = req.body;

        if (!req.user || req.user.email !== email) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
        }
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Email, current password, and new password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect current password' });

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Email not verified.' });
        }

        user.password = newPassword;
        await user.save();
        await emailUtils.sendPasswordUpdateConfirmationEmail(email, user.name, 'user');
        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password', error: error.message });
    }
}

// Delete Account
async function deleteAccount(req, res) {
    try {
        const { email, password } = req.body;

        if (!req.user || req.user.email !== email) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token or email' });
        }
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(400).json({ message: 'Incorrect password' });

        if (!user.isVerified) {
            return res.status(400).json({ message: 'Email not verified.' });
        }

        const { name } = user;
        await User.deleteOne({ email });

        await emailUtils.sendDeletionConfirmationEmail(email, user.name, 'user');
        res.json({ message: 'Account deleted successfully. Please clear your token.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting account', error: error.message });
    }
}

// Dashboard (Protected Route)
async function dashboard(req, res) {
    try {
        res.json({ message: `Welcome to the dashboard, ${req.user.name}` });
    } catch (error) {
        res.status(500).json({ message: 'Error accessing dashboard', error: error.message });
    }
}

// Admin Stats (Admin-only)
async function adminStats(req, res) {
    try {
        const totalUsers = await User.countDocuments();
        const usersByRole = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        res.json({
            message: 'Admin statistics',
            stats: {
                totalUsers,
                usersByRole: usersByRole.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching admin stats', error: error.message });
    }
}

module.exports = {
    register,verifyOTP,resendOTP,
    login,logout,
    updateUser,updatePassword,
    deleteAccount,
    dashboard,
    adminStats
};