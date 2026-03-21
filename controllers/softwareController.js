const Software = require('../models/Software');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const pathManager = require('../config/pathManager');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Get all software (public)
exports.getSoftware = async (req, res) => {
  try {
    const { category, limit } = req.query;
    let filter = {};
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }
    let query = Software.find(filter).populate('category', 'name slug').sort({ createdAt: -1 });
    if (limit) query = query.limit(parseInt(limit));
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
    const software = await Software.findById(req.params.id).populate('category', 'name slug');
    if (!software) return res.status(404).json({ message: 'Software not found' });
    res.json(software);
  } catch (error) {
    console.error('Get software error:', error);
    res.status(500).json({ message: 'Failed to fetch software' });
  }
};

// Create software (admin)
exports.createSoftware = async (req, res) => {
  try {
    const { title, description, category, price, isFree } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'File is required' });

    const relativePath = `software/${file.filename}`;
    const fileInfo = {
      originalName: file.originalname,
      storedName: file.filename,
      relativePath,
      absolutePath: file.path,
      publicUrl: pathManager.getPublicUrl(relativePath),
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname)
    };

    const software = new Software({
      title,
      description: description || '',
      category,
      price: isFree === 'true' ? 0 : Number(price),
      isFree: isFree === 'true',
      fileInfo
    });
    await software.save();
    await software.populate('category', 'name slug');
    res.status(201).json(software);
  } catch (error) {
    console.error('Create software error:', error);
    res.status(500).json({ message: 'Failed to create software' });
  }
};

// Update software (admin)
exports.updateSoftware = async (req, res) => {
  try {
    const software = await Software.findById(req.params.id);
    if (!software) return res.status(404).json({ message: 'Software not found' });

    const { title, description, category, price, isFree } = req.body;
    const file = req.file;

    if (title) software.title = title;
    if (description !== undefined) software.description = description;
    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ message: 'Category does not exist' });
      software.category = category;
    }
    if (isFree !== undefined) {
      software.isFree = isFree === 'true';
      if (software.isFree) software.price = 0;
      else if (price) software.price = Number(price);
    } else if (price) {
      software.price = Number(price);
    }

    if (file) {
      // Delete old file if exists
      if (software.fileInfo?.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
        fs.unlinkSync(software.fileInfo.absolutePath);
      }
      const relativePath = `software/${file.filename}`;
      software.fileInfo = {
        originalName: file.originalname,
        storedName: file.filename,
        relativePath,
        absolutePath: file.path,
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
    if (!software) return res.status(404).json({ message: 'Software not found' });

    if (software.fileInfo?.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
      fs.unlinkSync(software.fileInfo.absolutePath);
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
    if (!software) return res.status(404).json({ message: 'Software not found' });

    // Free item -> stream immediately
    if (software.isFree) {
      return streamFile(software, res);
    }

    // Check authentication
    let token = req.headers.authorization;
    if (!token) return res.status(401).json({ message: 'Please login to download paid items' });

    token = token.replace(/^Bearer\s+/i, '');
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
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
      const transaction = await Transaction.findOne({
        user: userId,
        itemId: software._id,
        status: 'completed'
      });
      if (transaction) {
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
        transaction.orderCreated = true;
        transaction.orderId = order._id;
        await transaction.save();
      }
    }

    if (!order) {
      return res.status(403).json({ message: 'You have not purchased this software' });
    }

    // Update download count
    const item = order.items.find(i => i.itemId.toString() === software._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    return streamFile(software, res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
};

// Helper to stream file
async function streamFile(item, res) {
  let filePath;
  if (item.fileInfo?.relativePath) {
    filePath = pathManager.getAbsolutePath(item.fileInfo.relativePath);
  } else if (item.fileInfo?.absolutePath) {
    filePath = item.fileInfo.absolutePath;
  } else {
    return res.status(404).json({ message: 'File path not found' });
  }

  if (!fs.existsSync(filePath)) {
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
  stream.on('error', (err) => {
    console.error('Stream error:', err);
    if (!res.headersSent) res.status(500).json({ message: 'Error streaming file' });
  });
}