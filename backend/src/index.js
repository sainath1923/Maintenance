require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Ensure uploads and uploads/invoices directories exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, '..', 'uploads');
const invoicesDir = path.join(uploadsDir, 'invoices');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Static files (for uploaded invoices, etc.)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const userRoutes = require('./routes/userRoutes');
const companyProfileRoutes = require('./routes/companyProfileRoutes');
const stockRoutes = require('./routes/stockRoutes');

app.get('/', (req, res) => {
  res.json({ message: 'Building Maintenance Management API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/stocks', stockRoutes);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/maintenance_db';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error', err);
    process.exit(1);
  });
