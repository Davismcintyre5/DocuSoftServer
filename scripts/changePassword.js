const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * CHANGE USER PASSWORD
 * Usage: node scripts/changePassword.js [email] [newPassword]
 * 
 * Example: node scripts/changePassword.js user@example.com newpass123
 * 
 * If no arguments provided, prompts interactively.
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

const changePassword = async () => {
  try {
    const args = process.argv.slice(2);
    let email, newPassword;
    
    if (args.length >= 2) {
      email = args[0];
      newPassword = args[1];
    } else {
      console.log('🔐 Change User Password');
      console.log('======================\n');
      email = await question('Email: ');
      newPassword = await question('New Password: ');
      const confirm = await question('Confirm Password: ');
      
      if (newPassword !== confirm) {
        console.log('❌ Passwords do not match');
        process.exit(1);
      }
    }
    
    if (!email || !newPassword) {
      console.log('❌ Email and password are required');
      process.exit(1);
    }
    
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email "${email}" not found`);
      process.exit(1);
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    console.log(`✅ Password changed successfully for ${user.name} (${user.email})`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
};

changePassword();