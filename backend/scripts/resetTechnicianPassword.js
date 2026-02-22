require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

(async () => {
  try {
    const email = process.argv[2];
    if (!email) {
      console.error('Usage: node scripts/resetTechnicianPassword.js <email>');
      process.exit(1);
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not set');
      process.exit(1);
    }

    await mongoose.connect(uri);

    const user = await User.findOne({ email, role: 'technician' });
    if (!user) {
      console.error('No technician user found with email', email);
      process.exit(1);
    }

    const newPassword = 'Technician@123';
    const hash = await bcrypt.hash(newPassword, 10);

    user.password = hash;
    user.isActive = true;
    await user.save();

    console.log('Password reset for technician', email, 'to', newPassword);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
