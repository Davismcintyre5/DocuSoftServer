const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * CHANGE ADMIN USER DETAILS
 * Usage: node scripts/changeAdmin.js
 * 
 * Prompts for admin email and new details to update.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const User = require('../models/User');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const changeAdmin = async () => {
  try {
    console.log('👑 Change Admin User Details');
    console.log('==========================\n');
    
    const email = await question('Admin Email: ');
    
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      console.log(`❌ Admin with email "${email}" not found`);
      process.exit(1);
    }
    
    console.log(`Current Admin: ${admin.name} (${admin.email})`);
    console.log('\nLeave fields empty to keep current value\n');
    
    const name = await question(`Name (${admin.name}): `);
    const phone = await question(`Phone (${admin.phone || 'Not set'}): `);
    const password = await question('New Password (leave empty to keep): ');
    
    if (name) admin.name = name;
    if (phone) admin.phone = phone;
    if (password) {
      admin.password = await bcrypt.hash(password, 10);
    }
    
    await admin.save();
    
    console.log('\n✅ Admin details updated successfully!');
    console.log(`\n📋 Updated Admin Details:`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Phone: ${admin.phone}`);
    if (password) console.log(`   Password: ${password} (changed)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
};

changeAdmin();