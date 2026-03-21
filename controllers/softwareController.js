const Software = require('../models/Software');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const pathManager = require('../config/pathManager');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Get all software (public)
exports.getSoftware = async (req, res) => {
  try {
    const { category, limit } = req.query;
    let filter = {};
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }
    
    let query = Software.find(filter)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
    
    if (limit) {
      query = query.limit(parseInt(limit));
    }
    
    const software = await query;
    res.json(software);
  } catch (error) {
    console.error('Get software error:', error);
    res.status(500).json({ message: 'Failed to fetch software' });
  }
};

// Get single software (public)
exports.getSoftwareItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid software ID format' });
    }

    const software = await Software.findById(id).populate('category', 'name slug');
    
    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    res.json(software);
  } catch (error) {
    console.error('Get software error:', error);
    res.status(500).json({ message: 'Failed to fetch software' });
  }
};

// Create software (admin)
exports.createSoftware = async (req, res) => {
  try {
    console.log('📝 Creating software with data:', {
      body: req.body,
      file: req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      } : 'No file'
    });

    const { title, description, category, price, isFree } = req.body;
    const file = req.file;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!file) {
      return res.status(400).json({ message: 'File is required' });
    }

    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Category does not exist' });
    }

    const isFreeBool = isFree === 'true' || isFree === true;
    const priceNum = isFreeBool ? 0 : Number(price);
    
    if (!isFreeBool && (!price || isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({ message: 'Price must be greater than 0 for paid items' });
    }

    // Store file with relative path - SAME AS DOCUMENTS
    const relativePath = `software/${file.filename}`;
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

    const software = new Software({
      title,
      description: description || '',
      category,
      price: priceNum,
      isFree: isFreeBool,
      fileInfo,
      downloadCount: 0
    });

    const savedSoftware = await software.save();
    await savedSoftware.populate('category', 'name slug');

    res.status(201).json(savedSoftware);
  } catch (error) {
    console.error('❌ Create software error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    res.status(500).json({ message: 'Failed to create software' });
  }
};

// Update software (admin)
exports.updateSoftware = async (req, res) => {
  try {
    const { title, description, category, price, isFree } = req.body;
    const file = req.file;

    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    if (title) software.title = title;
    if (description !== undefined) software.description = description;
    
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Category does not exist' });
      }
      software.category = category;
    }
    
    if (isFree !== undefined) {
      software.isFree = isFree === 'true' || isFree === true;
      if (software.isFree) {
        software.price = 0;
      } else if (price) {
        software.price = Number(price);
      }
    } else if (price) {
      software.price = Number(price);
    }

    if (file) {
      // Delete old file if exists
      if (software.fileInfo?.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
        try {
          fs.unlinkSync(software.fileInfo.absolutePath);
        } catch (unlinkError) {
          console.error('Failed to delete old file:', unlinkError);
        }
      }

      const relativePath = `software/${file.filename}`;
      software.fileInfo = {
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

    software.updatedAt = Date.now();
    await software.save();
    await software.populate('category', 'name slug');
    
    res.json(software);
  } catch (error) {
    console.error('Update software error:', error);
    res.status(500).json({ message: 'Failed to update software' });
  }
};

// Delete software (admin)
exports.deleteSoftware = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    if (software.fileInfo?.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
      try {
        fs.unlinkSync(software.fileInfo.absolutePath);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }

    await software.deleteOne();
    res.json({ message: 'Software deleted successfully' });
  } catch (error) {
    console.error('Delete software error:', error);
    res.status(500).json({ message: 'Failed to delete software' });
  }
};

// Download software
exports.downloadSoftware = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) {
      return res.status(404).json({ message: 'Software not found' });
    }

    console.log('📥 Download request for software:', {
      id: software._id,
      title: software.title,
      isFree: software.isFree,
      headers: req.headers.authorization ? 'Has Auth Header' : 'No Auth Header'
    });

    // Free item -> stream immediately
    if (software.isFree) {
      console.log('✅ Free software - allowing download');
      return streamFile(software, res);
    }

    // Check authentication
    let token = req.headers.authorization;
    if (!token) {
      console.log('❌ No authorization header for paid software');
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
      'items.itemId': software._id,
      'items.itemType': 'software',
      status: 'completed'
    });

    // If no order, try to create from a completed transaction
    if (!order) {
      console.log('🔍 No order found, checking for completed transaction');
      
      const transaction = await Transaction.findOne({
        user: userId,
        itemId: software._id,
        status: 'completed'
      });

      if (transaction) {
        console.log('✅ Found completed transaction, creating order');
        
        order = await Order.create({
          user: userId,
          items: [{
            itemId: software._id,
            itemType: 'software',
            title: software.title,
            price: software.price,
            downloadCount: 0
          }],
          totalAmount: software.price,
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
      console.log('❌ User has not purchased this software');
      return res.status(403).json({ message: 'You have not purchased this software' });
    }

    console.log('✅ User has purchased this software - allowing download');

    // Update download count
    const item = order.items.find(i => i.itemId.toString() === software._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    return streamFile(software, res);
  } catch (error) {
    console.error('❌ Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
};

// Helper to stream file - SAME AS DOCUMENTS
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