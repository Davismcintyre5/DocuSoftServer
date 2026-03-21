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
    
    let query = Document.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
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
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid document ID format' });
    }

    const document = await Document.findById(id).populate('category', 'name slug');
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
};

// Create document (admin)
exports.createDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree } = req.body;
    const file = req.file;

    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!category) return res.status(400).json({ message: 'Category is required' });
    if (!file) return res.status(400).json({ message: 'File is required' });

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    const isFreeBool = isFree === 'true' || isFree === true;
    const priceNum = isFreeBool ? 0 : Number(price);
    
    if (!isFreeBool && (!price || isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({ message: 'Price must be greater than 0 for paid items' });
    }

    const relativePath = `documents/${file.filename}`;
    const fileInfo = {
      originalName: file.originalname,
      storedName: file.filename,
      relativePath: relativePath,
      absolutePath: file.path.replace(/\\/g, '/'),
      publicUrl: pathManager.getPublicUrl(relativePath),
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname)
    };

    const document = new Document({
      title,
      description: description || '',
      category,
      price: priceNum,
      isFree: isFreeBool,
      fileInfo,
      downloadCount: 0
    });

    const savedDocument = await document.save();
    await savedDocument.populate('category', 'name slug');

    res.status(201).json(savedDocument);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Failed to create document' });
  }
};

// Update document (admin)
exports.updateDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree } = req.body;
    const file = req.file;

    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (title) document.title = title;
    if (description !== undefined) document.description = description;
    
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Category does not exist' });
      }
      document.category = category;
    }
    
    if (isFree !== undefined) {
      document.isFree = isFree === 'true' || isFree === true;
      if (document.isFree) {
        document.price = 0;
      } else if (price) {
        document.price = Number(price);
      }
    } else if (price) {
      document.price = Number(price);
    }

    if (file) {
      if (document.fileInfo?.absolutePath && fs.existsSync(document.fileInfo.absolutePath)) {
        try {
          fs.unlinkSync(document.fileInfo.absolutePath);
        } catch (unlinkError) {
          console.error('Failed to delete old file:', unlinkError);
        }
      }

      const relativePath = `documents/${file.filename}`;
      document.fileInfo = {
        originalName: file.originalname,
        storedName: file.filename,
        relativePath: relativePath,
        absolutePath: file.path.replace(/\\/g, '/'),
        publicUrl: pathManager.getPublicUrl(relativePath),
        mimeType: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname)
      };
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
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    if (document.fileInfo?.absolutePath && fs.existsSync(document.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(document.fileInfo.absolutePath);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }

    await document.deleteOne();
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
};

// Download document - FIXED
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
      hasAuthHeader: !!req.headers.authorization
    });

    // Free item -> stream immediately
    if (document.isFree) {
      console.log('✅ Free document - allowing download');
      return streamFile(document, res);
    }

    // Check authentication for paid items
    let token = req.headers.authorization;
    if (!token) {
      console.log('❌ No authorization header for paid document');
      return res.status(401).json({ message: 'Please login to download paid items' });
    }

    token = token.replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ message: 'Invalid authorization header format' });
    }

    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
      console.log('✅ Token verified for user:', userId);
    } catch (err) {
      console.error('Token verification failed:', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    // Check if order exists
    let order = await Order.findOne({
      user: userId,
      'items.itemId': document._id,
      'items.itemType': 'document',
      status: 'completed'
    });

    // If no order, try to create from a completed transaction
    if (!order) {
      console.log('🔍 No order found, checking for completed transaction');
      
      const transaction = await Transaction.findOne({
        user: userId,
        itemId: document._id,
        status: 'completed'
      });

      if (transaction) {
        console.log('✅ Found completed transaction, creating order');
        
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

        console.log('✅ Order created from transaction:', order._id);
        
        transaction.orderCreated = true;
        transaction.orderId = order._id;
        await transaction.save();
      }
    }

    if (!order) {
      console.log('❌ User has not purchased this document');
      return res.status(403).json({ message: 'You have not purchased this document' });
    }

    console.log('✅ User has purchased this document - allowing download');

    // Update download count
    const item = order.items.find(i => i.itemId.toString() === document._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    return streamFile(document, res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed: ' + error.message });
  }
};

// Helper to stream file
async function streamFile(item, res) {
  try {
    let filePath;
    
    // Try relative path first (new method)
    if (item.fileInfo?.relativePath) {
      filePath = pathManager.getAbsolutePath(item.fileInfo.relativePath);
    } 
    // Fallback to absolute path (old data)
    else if (item.fileInfo?.absolutePath) {
      filePath = item.fileInfo.absolutePath;
    } 
    else {
      console.error('No file path found in item:', item._id);
      return res.status(404).json({ message: 'File path not found' });
    }

    console.log('📁 Looking for file at:', filePath);

    if (!fs.existsSync(filePath)) {
      console.error('File not found on server:', filePath);
      return res.status(404).json({ message: 'File not found on server' });
    }

    const stats = fs.statSync(filePath);
    
    const fileName = encodeURIComponent(item.fileInfo?.originalName || item.title);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', item.fileInfo?.mimeType || 'application/octet-stream');
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
    console.error('Stream file error:', error);
    res.status(500).json({ message: 'Error accessing file' });
  }
}