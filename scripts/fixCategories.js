const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

/**
 * FIX CATEGORIES - Update slugs for existing categories
 * Usage: node scripts/fixCategories.js
 */

require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Category = require('../models/Category');

const fixCategories = async () => {
  try {
    console.log('🔧 Fixing category slugs...');
    
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    
    const categories = await Category.find();
    console.log(`📁 Found ${categories.length} categories\n`);
    
    for (const category of categories) {
      const newSlug = category.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (category.slug !== newSlug) {
        category.slug = newSlug;
        await category.save();
        console.log(`✅ Updated: ${category.name} -> slug: ${newSlug}`);
      } else {
        console.log(`✓ Already correct: ${category.name}`);
      }
    }
    
    console.log('\n✅ All categories fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
};

fixCategories();