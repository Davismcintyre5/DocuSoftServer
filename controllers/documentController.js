const Document = require('../models/Document');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const pathManager = require('../config/pathManager');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Get all documents (public)
exports.getDocuments = async (req, res) => {
  try {
    const { category, limit } = req.query;
    let filter = {};
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }
    let query = Document.find(filter).populate('category', 'name slug').sort({ createdAt: -1 });
    if (limit) query = query.limit(parseInt(limit));
    const documents = await query;
    res.json(documents);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

// Get single document (public)
exports.getDocument = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid document ID format' });
    const document = await Document.findById(id).populate('category', 'name slug');
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
};

// Create document (admin)
exports.createDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree, fileUrl } = req.body;
    const file = req.file;

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!category) return res.status(400).json({ message: 'Category is required' });
    if (!file && !fileUrl) return res.status(400).json({ message: 'Either a file or an external URL is required' });

    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ message: 'Category does not exist' });

    const isFreeBool = isFree === 'true' || isFree === true;
    const priceNum = isFreeBool ? 0 : Number(price);
    if (!isFreeBool && (!price || isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({ message: 'Price must be greater than 0 for paid items' });
    }

    let finalFileUrl = null;
    let fileInfo = null;

    if (file) {
      // Local file upload
      const relativePath = `documents/${file.filename}`;
      fileInfo = {
        originalName: file.originalname,
        storedName: file.filename,
        relativePath,
        absolutePath: file.path,
        publicUrl: `${process.env.BASE_URL}/uploads/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname)
      };
      finalFileUrl = fileInfo.publicUrl;
    } else if (fileUrl) {
      // External URL – store only the URL, no fileInfo
      finalFileUrl = fileUrl;
    }

    const document = new Document({
      title,
      description: description || '',
      category,
      price: priceNum,
      isFree: isFreeBool,
      fileUrl: finalFileUrl,
      fileInfo,
      downloadCount: 0
    });

    await document.save();
    await document.populate('category', 'name slug');
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Failed to create document' });
  }
};

// Update document (admin)
exports.updateDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree, fileUrl } = req.body;
    const file = req.file;

    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ message: 'Category does not exist' });
      document.category = category;
    }
    if (isFree !== undefined) {
      document.isFree = isFree === 'true' || isFree === true;
      if (document.isFree) document.price = 0;
      else if (price) document.price = Number(price);
    } else if (price) document.price = Number(price);
    if (fileUrl) document.fileUrl = fileUrl;

    if (file) {
      // Delete old local file if exists
      if (document.fileInfo?.absolutePath && fs.existsSync(document.fileInfo.absolutePath)) {
        fs.unlinkSync(document.fileInfo.absolutePath);
      }
      const relativePath = `documents/${file.filename}`;
      document.fileInfo = {
        originalName: file.originalname,
        storedName: file.filename,
        relativePath,
        absolutePath: file.path,
        publicUrl: `${process.env.BASE_URL}/uploads/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname)
      };
      document.fileUrl = document.fileInfo.publicUrl;
    }

    document.updatedAt = Date.now();
    await document.save();
    await document.populate('category', 'name slug');
    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

// Delete document (admin)
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    if (document.fileInfo?.absolutePath && fs.existsSync(document.fileInfo.absolutePath)) {
      fs.unlinkSync(document.fileInfo.absolutePath);
    }
    await document.deleteOne();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Download document - with full file serving support
exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      console.log('❌ Document not found:', req.params.id);
      return res.status(404).json({ message: 'Document not found' });
    }

    console.log('📥 Download request:', {
      id: document._id,
      title: document.title,
      isFree: document.isFree,
      hasFileUrl: !!document.fileUrl,
      hasFileInfo: !!document.fileInfo
    });

    // 1. If external URL, redirect
    if (document.fileUrl && document.fileUrl.startsWith('http')) {
      console.log(`🔗 Redirecting to external URL: ${document.fileUrl}`);
      document.downloadCount += 1;
      await document.save();
      return res.redirect(document.fileUrl);
    }

    // 2. Check for free item with local file
    if (document.isFree) {
      if (document.fileInfo && document.fileInfo.absolutePath) {
        const filePath = document.fileInfo.absolutePath;
        if (fs.existsSync(filePath)) {
          document.downloadCount += 1;
          await document.save();
          return serveFile(document.fileInfo, res);
        }
      }
      console.log('❌ Free document has no valid file');
      return res.status(404).json({ message: 'File not found' });
    }

    // 3. Paid item - verify ownership
    let token = req.headers.authorization;
    if (!token && req.query.token) token = `Bearer ${req.query.token}`;
    if (!token) return res.status(401).json({ message: 'Please login to download paid items' });

    token = token.replace(/^Bearer\s+/i, '');
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check if user owns this item
    let order = await Order.findOne({ user: userId, 'items.itemId': document._id, 'items.itemType': 'document', status: 'completed' });
    if (!order) {
      const transaction = await Transaction.findOne({ user: userId, itemId: document._id, status: 'completed' });
      if (transaction) {
        order = await Order.create({
          user: userId,
          items: [{
            itemId: document._id,
            itemType: 'document',
            title: document.title,
            price: document.price,
            downloadCount: 0
          }],
          totalAmount: document.price,
          paymentMethod: transaction.paymentMethod,
          transactionId: transaction._id,
          status: 'completed',
          completedAt: new Date()
        });
        transaction.orderCreated = true;
        transaction.orderId = order._id;
        await transaction.save();
      }
    }

    if (!order) return res.status(403).json({ message: 'You have not purchased this document' });

    // Increment download counts
    const item = order.items.find(i => i.itemId.toString() === document._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    document.downloadCount += 1;
    await document.save();

    // Serve the file
    if (document.fileInfo && document.fileInfo.absolutePath && fs.existsSync(document.fileInfo.absolutePath)) {
      return serveFile(document.fileInfo, res);
    }

    console.error('❌ No valid file found for purchased document');
    return res.status(404).json({ message: 'File not found' });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
};

// Helper function to serve file
function serveFile(fileInfo, res) {
  try {
    const filePath = fileInfo.absolutePath;
    const stats = fs.statSync(filePath);
    const fileName = encodeURIComponent(fileInfo.originalName);
    
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'no-cache');
    
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming file' });
      }
    });
  } catch (error) {
    console.error('Serve file error:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error accessing file' });
    }
  }
}