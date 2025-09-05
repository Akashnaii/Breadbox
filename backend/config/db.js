
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Async function to connect to local MongoDB
const connectDB = async () => {
  try {
    // Connect to local MongoDB using the MONGO_URI from .env
    await mongoose.connect(process.env.ATLAS_URL);
    console.log('MongoDB connected on on atlas');
  } catch (err) {
    // Log error and exit process if connection fails
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Export the connection function
module.exports = connectDB;