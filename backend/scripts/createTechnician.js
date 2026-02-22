const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

(async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/maintenance';
    await mongoose.connect(uri);

    const email = 'tech1@example.com';
    const password = 'Technician@123';

    let user = await User.findOne({ email });
    if (user) {
      console.log('Technician user already exists:', user.email);
    } else {
      const hash = await bcrypt.hash(password, 10);
      user = await User.create({
        name: 'Technician One',
        email,
        password: hash,
        role: 'technician',
        phone: '0000000000',
        technicianType: 'Electrician',
        isActive: true,
      });
      console.log('Created technician user:', user.email);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
