require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/maintenance_db';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const email = 'tenant1@example.com';
    const password = 'Tenant@123';

    let user = await User.findOne({ email });
    if (user) {
      console.log('Tenant already exists with email', email);
    } else {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Test Tenant',
        email,
        password: hash,
        role: 'tenant',
        isActive: true
      });
      console.log('Tenant user created with email', email, 'and password', password);
    }
  } catch (err) {
    console.error('Error creating tenant user', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
