const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * SET HDM ADMIN USER - Davix HDM
 * Usage: node scripts/setHDM.js
 * 
 * Creates/updates HDM admin with:
 * Email: davismcintyre5@gmail.com
 * Password: Hdm@2002
 * Name: Davix HDM
 * Phone: 0768784909
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');

const setHDM = async () => {
  try {
    console.log('🔐 Setting up HDM Admin User (Davix HDM)');
    console.log('===========================\n');
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const hdmEmail = 'davismcintyre5@gmail.com';
    const hdmData = {
      name: 'Davix HDM',
      email: hdmEmail,
      phone: '0768784909',
      password: await bcrypt.hash('Hdm@2002', 10),
      role: 'admin',
      isActive: true
    };
    
    let user = await User.findOne({ email: hdmEmail });
    
    if (user) {
      console.log('📝 HDM user found. Updating...');
      user.name = hdmData.name;
      user.phone = hdmData.phone;
      user.password = hdmData.password;
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log('✅ HDM user updated successfully!');
    } else {
      console.log('➕ Creating new HDM user...');
      user = await User.create(hdmData);
      console.log('✅ HDM user created successfully!');
    }
    
    console.log('\n📋 HDM Admin Details:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Password: Hdm@2002`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
};

setHDM();