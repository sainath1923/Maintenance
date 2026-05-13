const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maintenance_db';
    await mongoose.connect(uri);

    const email = 'procurement1@example.com';
    const password = 'Procurement@123';

    let user = await User.findOne({ email });
    if (user) {
      console.log('Procurement user already exists:', user.email);
    } else {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Procurement One',
        email,
        password: hash,
        role: 'procurement',
        phone: '0000000000',
        isActive: true
      });
      console.log('Created procurement user:', user.email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
