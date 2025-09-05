// Import required modules
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const vendorRoutes = require('./routes/VendorRoutes');

// Load environment variables from .env
dotenv.config();

const app = express();

connectDB();

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors());


const authRoutes = require('./routes/authRoutes');
app.use('/api/auth' , authRoutes);
app.use('/api/vendor' , vendorRoutes);


app.get('/', (req, res) => res.send('BREADBOX Backend'));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));