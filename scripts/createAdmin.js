const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * CREATE ADMIN USER FROM PROMPT
 * Usage: node scripts/createAdmin.js
 * 
 * This script prompts for name, email, phone, and password,
 * then creates a new admin user.
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

const createAdmin = async () => {
  try {
    console.log('🔐 Create New Admin User');
    console.log('=======================\n');
    
    // Get user input
    const name = await question('Full Name: ');
    const email = await question('Email: ');
    const phone = await question('Phone Number (e.g., 0712345678): ');
    const password = await question('Password: ');
    const confirmPassword = await question('Confirm Password: ');
    
    // Validate
    if (!name || !email || !phone || !password) {
      console.log('❌ All fields are required');
      process.exit(1);
    }
    
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      process.exit(1);
    }
    
    if (password.length < 6) {
      console.log('❌ Password must be at least 6 characters');
      process.exit(1);
    }
    
    // Connect to MongoDB
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      console.log('❌ User with this email or phone already exists');
      process.exit(1);
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create admin user
    const admin = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${admin._id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Phone: ${admin.phone}`);
    console.log(`   Role: ${admin.role}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
};

createAdmin();