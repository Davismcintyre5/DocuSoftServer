// DNS Configuration - Ensures IPv4 first
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const Software = require('../models/Software');

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

// Helper to get file extension from filename
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

// Helper to determine MIME type
function getMimeType(extension) {
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.rtf': 'application/rtf',
    '.odt': 'application/vnd.oasis.opendocument.text',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.exe': 'application/vnd.microsoft.portable-executable',
    '.msi': 'application/x-msi',
    '.dmg': 'application/x-apple-diskimage',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
  };
  return mimeTypes[extension] || 'application/octet-stream';
}

// Fix documents
async function fixDocuments() {
  console.log('\n📄 Fixing Documents...');
  console.log('='.repeat(50));
  
  const docs = await Document.find({
    $or: [
      { fileUrl: { $exists: false } },
      { fileUrl: null },
      { fileInfo: { $exists: false } },
      { 'fileInfo.absolutePath': { $exists: false } }
    ]
  });
  
  console.log(`Found ${docs.length} documents with missing file references\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const doc of docs) {
    console.log(`Processing: ${doc.title} (${doc._id})`);
    
    // Search for file in uploads/documents
    const documentsDir = path.join(UPLOADS_ROOT, 'documents');
    
    if (fs.existsSync(documentsDir)) {
      const files = fs.readdirSync(documentsDir);
      
      // Try to find matching file by title or ID
      let matchingFile = null;
      
      // Method 1: Look for file with ID in filename
      matchingFile = files.find(f => f.includes(doc._id.toString()));
      
      // Method 2: Look for file with sanitized title
      if (!matchingFile) {
        const sanitizedTitle = doc.title.replace(/[^a-z0-9]/gi, '').toLowerCase();
        matchingFile = files.find(f => 
          f.toLowerCase().includes(sanitizedTitle) || 
          sanitizedTitle.includes(f.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
      }
      
      // Method 3: Look for any file that might match by date pattern (last resort)
      if (!matchingFile && files.length > 0) {
        // Get the most recent file that might belong to this document
        const sortedFiles = files.sort((a, b) => {
          const statA = fs.statSync(path.join(documentsDir, a));
          const statB = fs.statSync(path.join(documentsDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
        matchingFile = sortedFiles[0];
        console.log(`   ⚠️ No exact match found, using most recent: ${matchingFile}`);
      }
      
      if (matchingFile) {
        const filePath = path.join(documentsDir, matchingFile);
        const stats = fs.statSync(filePath);
        const extension = getFileExtension(matchingFile);
        const relativePath = `documents/${matchingFile}`;
        
        const fileInfo = {
          originalName: matchingFile,
          storedName: matchingFile,
          relativePath,
          absolutePath: filePath,
          publicUrl: `${BASE_URL}/uploads/${relativePath}`,
          mimeType: getMimeType(extension),
          size: stats.size,
          extension: extension,
          fileType: (extension === '.zip' || extension === '.rar') ? 'archive' : 'document'
        };
        
        doc.fileInfo = fileInfo;
        doc.fileUrl = fileInfo.publicUrl;
        
        await doc.save();
        console.log(`   ✅ Fixed: ${matchingFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        fixed++;
      } else {
        console.log(`   ❌ No file found for document: ${doc.title}`);
        failed++;
      }
    } else {
      console.log(`   ❌ Documents directory not found: ${documentsDir}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Documents Summary: ${fixed} fixed, ${failed} failed\n`);
  return { fixed, failed };
}

// Fix software
async function fixSoftware() {
  console.log('\n💻 Fixing Software...');
  console.log('='.repeat(50));
  
  const softwareList = await Software.find({
    $or: [
      { fileUrl: { $exists: false } },
      { fileUrl: null },
      { fileInfo: { $exists: false } },
      { 'fileInfo.absolutePath': { $exists: false } }
    ]
  });
  
  console.log(`Found ${softwareList.length} software items with missing file references\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const soft of softwareList) {
    console.log(`Processing: ${soft.title} (${soft._id})`);
    
    // Search for file in uploads/software
    const softwareDir = path.join(UPLOADS_ROOT, 'software');
    
    if (fs.existsSync(softwareDir)) {
      const files = fs.readdirSync(softwareDir);
      
      // Try to find matching file by title or ID
      let matchingFile = null;
      
      // Method 1: Look for file with ID in filename
      matchingFile = files.find(f => f.includes(soft._id.toString()));
      
      // Method 2: Look for file with sanitized title
      if (!matchingFile) {
        const sanitizedTitle = soft.title.replace(/[^a-z0-9]/gi, '').toLowerCase();
        matchingFile = files.find(f => 
          f.toLowerCase().includes(sanitizedTitle) || 
          sanitizedTitle.includes(f.toLowerCase().replace(/[^a-z0-9]/g, ''))
        );
      }
      
      // Method 3: Look for any file that might match by date pattern (last resort)
      if (!matchingFile && files.length > 0) {
        const sortedFiles = files.sort((a, b) => {
          const statA = fs.statSync(path.join(softwareDir, a));
          const statB = fs.statSync(path.join(softwareDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        });
        matchingFile = sortedFiles[0];
        console.log(`   ⚠️ No exact match found, using most recent: ${matchingFile}`);
      }
      
      if (matchingFile) {
        const filePath = path.join(softwareDir, matchingFile);
        const stats = fs.statSync(filePath);
        const extension = getFileExtension(matchingFile);
        const relativePath = `software/${matchingFile}`;
        
        const fileInfo = {
          originalName: matchingFile,
          storedName: matchingFile,
          relativePath,
          absolutePath: filePath,
          publicUrl: `${BASE_URL}/uploads/${relativePath}`,
          mimeType: getMimeType(extension),
          size: stats.size,
          extension: extension
        };
        
        soft.fileInfo = fileInfo;
        soft.fileUrl = fileInfo.publicUrl;
        
        await soft.save();
        console.log(`   ✅ Fixed: ${matchingFile} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        fixed++;
      } else {
        console.log(`   ❌ No file found for software: ${soft.title}`);
        failed++;
      }
    } else {
      console.log(`   ❌ Software directory not found: ${softwareDir}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Software Summary: ${fixed} fixed, ${failed} failed\n`);
  return { fixed, failed };
}

// Fix transaction screenshots (optional)
async function fixTransactions() {
  console.log('\n📸 Fixing Transaction Screenshots...');
  console.log('='.repeat(50));
  
  const Transaction = require('../models/Transaction');
  
  const transactions = await Transaction.find({
    $or: [
      { screenshotUrl: { $exists: false } },
      { screenshotUrl: null }
    ]
  });
  
  console.log(`Found ${transactions.length} transactions with missing screenshot references\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const tx of transactions) {
    console.log(`Processing transaction: ${tx._id}`);
    
    // Search for screenshot in uploads/screenshots
    const screenshotsDir = path.join(UPLOADS_ROOT, 'screenshots');
    
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      
      // Try to find matching screenshot by transaction ID
      let matchingFile = files.find(f => f.includes(tx._id.toString()));
      
      if (matchingFile) {
        const filePath = path.join(screenshotsDir, matchingFile);
        const relativePath = `screenshots/${matchingFile}`;
        
        tx.screenshotUrl = `${BASE_URL}/uploads/${relativePath}`;
        tx.screenshotPath = filePath;
        
        if (!tx.metadata) tx.metadata = {};
        tx.metadata.uploadedAt = new Date().toISOString();
        
        await tx.save();
        console.log(`   ✅ Fixed: ${matchingFile}`);
        fixed++;
      } else {
        console.log(`   ❌ No screenshot found for transaction: ${tx._id}`);
        failed++;
      }
    } else {
      console.log(`   ❌ Screenshots directory not found: ${screenshotsDir}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Transactions Summary: ${fixed} fixed, ${failed} failed\n`);
  return { fixed, failed };
}

// Main function
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 DocuSoft File Migration Tool');
  console.log('='.repeat(60));
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Base URL: ${BASE_URL}`);
  console.log(`📁 Uploads Root: ${UPLOADS_ROOT}`);
  console.log(`💾 MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/docusoft'}`);
  console.log('='.repeat(60));
  
  try {
    await connectDB();
    
    // Run fixes
    const docResults = await fixDocuments();
    const softResults = await fixSoftware();
    const txResults = await fixTransactions();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Documents: ${docResults.fixed} fixed, ${docResults.failed} failed`);
    console.log(`Software:  ${softResults.fixed} fixed, ${softResults.failed} failed`);
    console.log(`Transactions: ${txResults.fixed} fixed, ${txResults.failed} failed`);
    console.log('='.repeat(60));
    console.log('✅ Migration completed!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
    process.exit(0);
  }
}

// Run the script
main();