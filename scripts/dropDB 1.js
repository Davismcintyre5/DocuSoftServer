const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * DROP ENTIRE DATABASE
 * Usage: node scripts/dropDB.js
 * 
 * WARNING: This will delete ALL data including users, documents, orders, etc.
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const dropDatabase = async () => {
  try {
    console.log('⚠️  WARNING: This will DELETE THE ENTIRE DATABASE!');
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database: ${mongoose.connection.name}`);
    
    console.log('\n❓ Are you ABSOLUTELY SURE you want to drop the entire database?');
    console.log('Type "DELETE EVERYTHING" to confirm:');
    
    process.stdin.once('data', async (data) => {
      const input = data.toString().trim();
      
      if (input === 'DELETE EVERYTHING') {
        console.log('\n💣 Dropping database...');
        await mongoose.connection.dropDatabase();
        console.log('✅ Database dropped successfully!');
      } else {
        console.log('❌ Confirmation failed. Database NOT dropped.');
      }
      
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropDatabase();