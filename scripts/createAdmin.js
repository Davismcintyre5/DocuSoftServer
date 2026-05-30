require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const User = require('../models/docusoft/User');

  // Delete if exists
  await User.deleteOne({ email: 'davismcintyere5@gmail.com' });

  // Create fresh
  const hashedPassword = await bcrypt.hash('Hdm@2002', 10);
  const admin = await User.create({
    name: 'Davis',
    email: 'davismcintyere5@gmail.com',
    password: hashedPassword,
    role: 'admin',
    isActive: true,
    phone: '0700000000',
    acceptedTerms: true,
    acceptedPrivacy: true
  });

  console.log('✅ Admin created:', admin.email, admin.role);
  await mongoose.disconnect();
};

createAdmin();