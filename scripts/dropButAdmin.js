const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * DROP EVERYTHING EXCEPT ADMIN USERS
 * Usage: node scripts/dropButAdmin.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const User = require('../models/User');
const Document = require('../models/Document');
const Software = require('../models/Software');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');

const dropButKeepAdmins = async () => {
  try {
    console.log('⚠️  This will DELETE all data EXCEPT admin users!');
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database: ${mongoose.connection.name}\n`);

    const admins = await User.find({ role: 'admin' });
    const adminIds = admins.map(admin => admin._id);
    
    console.log(`👑 Found ${admins.length} admin user(s) to preserve:`);
    admins.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.name})`);
    });
    console.log('');

    console.log('❓ This will delete:');
    console.log('   • All non-admin users');
    console.log('   • All documents');
    console.log('   • All software');
    console.log('   • All categories');
    console.log('   • All orders');
    console.log('   • All transactions');
    console.log('');
    console.log('Type "CONFIRM DELETE" to proceed:');

    process.stdin.once('data', async (data) => {
      const input = data.toString().trim();
      
      if (input === 'CONFIRM DELETE') {
        console.log('\n🧹 Cleaning up...');
        
        await Order.deleteMany({});
        await Transaction.deleteMany({});
        await Document.deleteMany({});
        await Software.deleteMany({});
        await Category.deleteMany({});
        await User.deleteMany({ role: { $ne: 'admin' } });
        
        console.log('\n✅ All data except admin users has been deleted!');
        console.log(`✅ ${admins.length} admin user(s) preserved.`);
        
      } else {
        console.log('❌ Confirmation failed. No data was deleted.');
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropButKeepAdmins();