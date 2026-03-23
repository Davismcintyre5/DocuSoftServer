// DNS Configuration - Ensures IPv4 first
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Software = require('../models/Software');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');
const Settings = require('../models/Settings');

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const UPLOADS_ROOT = process.env.UPLOADS_ROOT || path.join(__dirname, '../uploads');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/docusoft');
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Get user confirmation
async function confirmAction(prompt) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
  
  rl.close();
  return answer.toLowerCase() === 'yes';
}

// ============ DELETE EXTERNAL ITEMS ============
async function dropExternalDocuments() {
  const externalDocs = await Document.find({
    fileUrl: { $regex: /^http/ }
  });
  
  if (externalDocs.length === 0) {
    console.log('   No external documents found');
    return 0;
  }
  
  console.log(`\n   Found ${externalDocs.length} external documents:`);
  externalDocs.forEach(doc => {
    console.log(`      - ${doc.title} (${doc.fileUrl?.substring(0, 60)}...)`);
  });
  
  const result = await Document.deleteMany({
    fileUrl: { $regex: /^http/ }
  });
  
  console.log(`   ✅ Deleted ${result.deletedCount} external documents`);
  return result.deletedCount;
}

async function dropExternalSoftware() {
  const externalSoftware = await Software.find({
    fileUrl: { $regex: /^http/ }
  });
  
  if (externalSoftware.length === 0) {
    console.log('   No external software found');
    return 0;
  }
  
  console.log(`\n   Found ${externalSoftware.length} external software items:`);
  externalSoftware.forEach(soft => {
    console.log(`      - ${soft.title} (${soft.fileUrl?.substring(0, 60)}...)`);
  });
  
  const result = await Software.deleteMany({
    fileUrl: { $regex: /^http/ }
  });
  
  console.log(`   ✅ Deleted ${result.deletedCount} external software items`);
  return result.deletedCount;
}

async function dropExternalTransactions() {
  const externalTransactions = await Transaction.find({
    screenshotUrl: { $regex: /^http/ }
  });
  
  if (externalTransactions.length === 0) {
    console.log('   No external transaction screenshots found');
    return 0;
  }
  
  console.log(`\n   Found ${externalTransactions.length} transactions with external screenshots:`);
  externalTransactions.forEach(tx => {
    console.log(`      - Transaction ${tx._id}: ${tx.screenshotUrl?.substring(0, 60)}...`);
  });
  
  const result = await Transaction.updateMany(
    { screenshotUrl: { $regex: /^http/ } },
    { $set: { screenshotUrl: null, screenshotPath: null } }
  );
  
  console.log(`   ✅ Updated ${result.modifiedCount} transactions (screenshot URLs removed)`);
  return result.modifiedCount;
}

// ============ DELETE LOCAL ITEMS ============
async function dropLocalDocuments() {
  const localDocs = await Document.find({
    $and: [
      { fileUrl: { $exists: true, $ne: null } },
      { fileUrl: { $not: /^http/ } }
    ]
  });
  
  if (localDocs.length === 0) {
    console.log('   No local documents found');
    return 0;
  }
  
  console.log(`\n   Found ${localDocs.length} local documents:`);
  localDocs.forEach(doc => {
    console.log(`      - ${doc.title} (${doc.fileUrl?.substring(0, 60)}...)`);
  });
  
  // Also delete physical files
  let filesDeleted = 0;
  for (const doc of localDocs) {
    if (doc.fileInfo?.absolutePath && fs.existsSync(doc.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(doc.fileInfo.absolutePath);
        filesDeleted++;
        console.log(`      🗑️  Deleted file: ${path.basename(doc.fileInfo.absolutePath)}`);
      } catch (err) {
        console.log(`      ⚠️  Could not delete file: ${err.message}`);
      }
    }
  }
  
  const result = await Document.deleteMany({
    $and: [
      { fileUrl: { $exists: true, $ne: null } },
      { fileUrl: { $not: /^http/ } }
    ]
  });
  
  console.log(`   ✅ Deleted ${result.deletedCount} local documents (${filesDeleted} files removed)`);
  return result.deletedCount;
}

async function dropLocalSoftware() {
  const localSoftware = await Software.find({
    $and: [
      { fileUrl: { $exists: true, $ne: null } },
      { fileUrl: { $not: /^http/ } }
    ]
  });
  
  if (localSoftware.length === 0) {
    console.log('   No local software found');
    return 0;
  }
  
  console.log(`\n   Found ${localSoftware.length} local software items:`);
  localSoftware.forEach(soft => {
    console.log(`      - ${soft.title} (${soft.fileUrl?.substring(0, 60)}...)`);
  });
  
  // Also delete physical files
  let filesDeleted = 0;
  for (const soft of localSoftware) {
    if (soft.fileInfo?.absolutePath && fs.existsSync(soft.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(soft.fileInfo.absolutePath);
        filesDeleted++;
        console.log(`      🗑️  Deleted file: ${path.basename(soft.fileInfo.absolutePath)}`);
      } catch (err) {
        console.log(`      ⚠️  Could not delete file: ${err.message}`);
      }
    }
  }
  
  const result = await Software.deleteMany({
    $and: [
      { fileUrl: { $exists: true, $ne: null } },
      { fileUrl: { $not: /^http/ } }
    ]
  });
  
  console.log(`   ✅ Deleted ${result.deletedCount} local software items (${filesDeleted} files removed)`);
  return result.deletedCount;
}

async function dropLocalTransactions() {
  const localTransactions = await Transaction.find({
    screenshotUrl: { $exists: true, $ne: null, $not: /^http/ }
  });
  
  if (localTransactions.length === 0) {
    console.log('   No local transaction screenshots found');
    return 0;
  }
  
  console.log(`\n   Found ${localTransactions.length} transactions with local screenshots:`);
  localTransactions.forEach(tx => {
    console.log(`      - Transaction ${tx._id}: ${tx.screenshotUrl?.substring(0, 60)}...`);
  });
  
  // Also delete physical files
  let filesDeleted = 0;
  for (const tx of localTransactions) {
    if (tx.screenshotPath && fs.existsSync(tx.screenshotPath)) {
      try {
        fs.unlinkSync(tx.screenshotPath);
        filesDeleted++;
        console.log(`      🗑️  Deleted screenshot: ${path.basename(tx.screenshotPath)}`);
      } catch (err) {
        console.log(`      ⚠️  Could not delete screenshot: ${err.message}`);
      }
    }
  }
  
  const result = await Transaction.updateMany(
    { screenshotUrl: { $exists: true, $ne: null, $not: /^http/ } },
    { $set: { screenshotUrl: null, screenshotPath: null } }
  );
  
  console.log(`   ✅ Updated ${result.modifiedCount} transactions (screenshot references removed, ${filesDeleted} files deleted)`);
  return result.modifiedCount;
}

// ============ DELETE ALL ITEMS ============
async function dropAllDocuments() {
  const count = await Document.countDocuments();
  if (count === 0) {
    console.log('   No documents found');
    return 0;
  }
  
  console.log(`\n   Found ${count} documents`);
  
  // Delete physical files
  const docs = await Document.find({});
  let filesDeleted = 0;
  for (const doc of docs) {
    if (doc.fileInfo?.absolutePath && fs.existsSync(doc.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(doc.fileInfo.absolutePath);
        filesDeleted++;
      } catch (err) {
        // Ignore
      }
    }
  }
  
  const result = await Document.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} documents (${filesDeleted} files removed)`);
  return result.deletedCount;
}

async function dropAllSoftware() {
  const count = await Software.countDocuments();
  if (count === 0) {
    console.log('   No software found');
    return 0;
  }
  
  console.log(`\n   Found ${count} software items`);
  
  // Delete physical files
  const softwareList = await Software.find({});
  let filesDeleted = 0;
  for (const soft of softwareList) {
    if (soft.fileInfo?.absolutePath && fs.existsSync(soft.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(soft.fileInfo.absolutePath);
        filesDeleted++;
      } catch (err) {
        // Ignore
      }
    }
  }
  
  const result = await Software.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} software items (${filesDeleted} files removed)`);
  return result.deletedCount;
}

async function dropAllTransactions() {
  const count = await Transaction.countDocuments();
  if (count === 0) {
    console.log('   No transactions found');
    return 0;
  }
  
  console.log(`\n   Found ${count} transactions`);
  
  // Delete physical screenshots
  const transactions = await Transaction.find({});
  let filesDeleted = 0;
  for (const tx of transactions) {
    if (tx.screenshotPath && fs.existsSync(tx.screenshotPath)) {
      try {
        fs.unlinkSync(tx.screenshotPath);
        filesDeleted++;
      } catch (err) {
        // Ignore
      }
    }
  }
  
  const result = await Transaction.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} transactions (${filesDeleted} screenshots removed)`);
  return result.deletedCount;
}

async function dropAllOrders() {
  const count = await Order.countDocuments();
  if (count === 0) {
    console.log('   No orders found');
    return 0;
  }
  
  const result = await Order.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} orders`);
  return result.deletedCount;
}

async function dropAllUsers() {
  const count = await User.countDocuments();
  if (count === 0) {
    console.log('   No users found');
    return 0;
  }
  
  // Keep at least one admin user? Let's ask
  console.log(`\n   Found ${count} users`);
  const result = await User.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} users`);
  return result.deletedCount;
}

async function dropAllCategories() {
  const count = await Category.countDocuments();
  if (count === 0) {
    console.log('   No categories found');
    return 0;
  }
  
  const result = await Category.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} categories`);
  return result.deletedCount;
}

async function dropAllSettings() {
  const result = await Settings.deleteMany({});
  console.log(`   ✅ Deleted ${result.deletedCount} settings documents`);
  return result.deletedCount;
}

// ============ MAIN MENU ============
async function showMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  DocuSoft Database Cleanup Tool');
  console.log('='.repeat(60));
  console.log('1. Delete ALL External Items (GitHub URLs)');
  console.log('2. Delete ALL Local Items (Uploaded Files)');
  console.log('3. Delete ALL Items (Complete Reset)');
  console.log('4. Delete Specific Collections');
  console.log('5. Exit');
  console.log('='.repeat(60));
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise((resolve) => {
    rl.question('\nSelect option (1-5): ', resolve);
  });
  
  rl.close();
  return answer;
}

async function showSpecificMenu() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  Delete Specific Collections');
  console.log('='.repeat(60));
  console.log('1. Documents Only');
  console.log('2. Software Only');
  console.log('3. Transactions Only');
  console.log('4. Orders Only');
  console.log('5. Users Only');
  console.log('6. Categories Only');
  console.log('7. Settings Only');
  console.log('8. Back to Main Menu');
  console.log('='.repeat(60));
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const answer = await new Promise((resolve) => {
    rl.question('\nSelect option (1-8): ', resolve);
  });
  
  rl.close();
  return answer;
}

// ============ MAIN ============
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🗑️  DocuSoft Database Cleanup Tool');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Uploads Root: ${UPLOADS_ROOT}`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/docusoft'}`);
  console.log('='.repeat(60));
  
  console.log('\n⚠️  WARNING: This tool permanently deletes data!');
  console.log('⚠️  Make sure you have a backup before proceeding.\n');
  
  try {
    await connectDB();
    
    while (true) {
      const choice = await showMenu();
      
      if (choice === '1') {
        console.log('\n🗑️  Deleting ALL External Items...');
        console.log('='.repeat(50));
        
        const confirmed = await confirmAction('\n⚠️  Delete ALL external items (GitHub URLs)? (yes/no): ');
        if (!confirmed) {
          console.log('❌ Deletion cancelled');
          continue;
        }
        
        const docCount = await dropExternalDocuments();
        const softCount = await dropExternalSoftware();
        const txCount = await dropExternalTransactions();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 EXTERNAL DELETION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Documents deleted:   ${docCount}`);
        console.log(`Software deleted:    ${softCount}`);
        console.log(`Transactions updated: ${txCount}`);
        console.log('='.repeat(50));
        
      } else if (choice === '2') {
        console.log('\n🗑️  Deleting ALL Local Items...');
        console.log('='.repeat(50));
        
        const confirmed = await confirmAction('\n⚠️  Delete ALL local items (uploaded files)? (yes/no): ');
        if (!confirmed) {
          console.log('❌ Deletion cancelled');
          continue;
        }
        
        const docCount = await dropLocalDocuments();
        const softCount = await dropLocalSoftware();
        const txCount = await dropLocalTransactions();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 LOCAL DELETION SUMMARY');
        console.log('='.repeat(50));
        console.log(`Documents deleted:   ${docCount}`);
        console.log(`Software deleted:    ${softCount}`);
        console.log(`Transactions updated: ${txCount}`);
        console.log('='.repeat(50));
        
      } else if (choice === '3') {
        console.log('\n🗑️  Deleting ALL Items (Complete Reset)...');
        console.log('='.repeat(50));
        
        const confirmed = await confirmAction('\n⚠️  ⚠️  ⚠️  COMPLETE DATABASE RESET! This will delete EVERYTHING! (yes/no): ');
        if (!confirmed) {
          console.log('❌ Deletion cancelled');
          continue;
        }
        
        const secondConfirm = await confirmAction('\n⚠️  Are you ABSOLUTELY sure? Type "yes" to confirm: ');
        if (!secondConfirm) {
          console.log('❌ Deletion cancelled');
          continue;
        }
        
        const docCount = await dropAllDocuments();
        const softCount = await dropAllSoftware();
        const txCount = await dropAllTransactions();
        const orderCount = await dropAllOrders();
        const userCount = await dropAllUsers();
        const catCount = await dropAllCategories();
        const settingsCount = await dropAllSettings();
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 COMPLETE RESET SUMMARY');
        console.log('='.repeat(50));
        console.log(`Documents:   ${docCount}`);
        console.log(`Software:    ${softCount}`);
        console.log(`Transactions: ${txCount}`);
        console.log(`Orders:      ${orderCount}`);
        console.log(`Users:       ${userCount}`);
        console.log(`Categories:  ${catCount}`);
        console.log(`Settings:    ${settingsCount}`);
        console.log('='.repeat(50));
        console.log('\n✅ Database has been completely reset!');
        console.log('💡 Tip: Run "npm run seed" to create default admin and categories if needed.');
        
      } else if (choice === '4') {
        while (true) {
          const subChoice = await showSpecificMenu();
          
          if (subChoice === '1') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL documents? (yes/no): ');
            if (confirmed) await dropAllDocuments();
            break;
          } else if (subChoice === '2') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL software? (yes/no): ');
            if (confirmed) await dropAllSoftware();
            break;
          } else if (subChoice === '3') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL transactions? (yes/no): ');
            if (confirmed) await dropAllTransactions();
            break;
          } else if (subChoice === '4') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL orders? (yes/no): ');
            if (confirmed) await dropAllOrders();
            break;
          } else if (subChoice === '5') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL users? (yes/no): ');
            if (confirmed) await dropAllUsers();
            break;
          } else if (subChoice === '6') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL categories? (yes/no): ');
            if (confirmed) await dropAllCategories();
            break;
          } else if (subChoice === '7') {
            const confirmed = await confirmAction('\n⚠️  Delete ALL settings? (yes/no): ');
            if (confirmed) await dropAllSettings();
            break;
          } else if (subChoice === '8') {
            break;
          }
        }
        
      } else if (choice === '5') {
        console.log('\n👋 Exiting...');
        break;
      }
    }
    
  } catch (error) {
    console.error('❌ Operation failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
    process.exit(0);
  }
}

// Run the script
main();