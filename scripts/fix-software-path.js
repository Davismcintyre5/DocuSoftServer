const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);


const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// IMPORT MODELS IN CORRECT ORDER
const Category = require('./models/Category');
const Document = require('./models/Document');
const Software = require('./models/Software');
const Order = require('./models/Order');
const Transaction = require('./models/Transaction');
const User = require('./models/User');
const Settings = require('./models/Settings');

async function fixSoftwarePath() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Find the software with title "vj"
    const software = await Software.findOne({ title: "vj" }).populate('category');
    
    if (!software) {
      console.log('❌ Software "vj" not found');
      console.log('Available software:');
      const allSoftware = await Software.find({}, { title: 1 });
      allSoftware.forEach(s => console.log(`   - ${s.title}`));
      process.exit(1);
    }

    console.log(`📦 Found software: ${software.title}`);
    console.log(`   ID: ${software._id}`);
    console.log(`   Current path: ${software.fileInfo?.absolutePath || 'Not set'}`);
    console.log(`   Current URL: ${software.fileInfo?.publicUrl || 'Not set'}\n`);

    // Correct file path
    const correctPath = "C:\\Users\\FAITH WANJIKU\\Desktop\\document-software-store\\server\\uploads\\software\\soft-1774075401394-453112565.exe";
    const correctUrl = "https://docusoftserver.pxxl.click/uploads/software/soft-1774075401394-453112565.exe";
    
    // Update the software
    software.fileInfo = {
      ...software.fileInfo,
      absolutePath: correctPath,
      storedName: "soft-1774075401394-453112565.exe",
      originalName: software.fileInfo?.originalName || "vj.exe",
      publicUrl: correctUrl,
      size: 11476408,
      mimeType: "application/x-msdownload"
    };

    await software.save();
    
    console.log('✅ Software updated successfully!');
    console.log(`   New path: ${software.fileInfo.absolutePath}`);
    console.log(`   New URL: ${software.fileInfo.publicUrl}`);
    
    // Verify file exists
    const fs = require('fs');
    if (fs.existsSync(correctPath)) {
      console.log(`   ✅ File exists at: ${correctPath}`);
    } else {
      console.log(`   ❌ File NOT found at: ${correctPath}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) console.error(error.stack);
    process.exit(1);
  }
}

fixSoftwarePath();