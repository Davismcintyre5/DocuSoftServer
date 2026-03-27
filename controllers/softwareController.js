const Software = require('../models/Software');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const pathManager = require('../config/pathManager');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Get all software (public) – with regex search
exports.getSoftware = async (req, res) => {
  try {
    const { category, limit, search } = req.query;
    let filter = {};

    // Category filter
    if (category) {
      const cat = await Category.findOne({ slug: category });
      if (cat) filter.category = cat._id;
    }

    // Search filter (case‑insensitive regex, partial match)
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex }
      ];
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
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid software ID format' });
    const software = await Software.findById(id).populate('category', 'name slug');
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
      const relativePath = `software/${file.filename}`;
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
      finalFileUrl = fileUrl;
    }

    const software = new Software({
      title,
      description: description || '',
      category,
      price: priceNum,
      isFree: isFreeBool,
      fileUrl: finalFileUrl,
      fileInfo,
      downloadCount: 0
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
    const { title, description, category, price, isFree, fileUrl } = req.body;
    const file = req.file;

    const software = await Software.findById(req.params.id);
    if (!software) return res.status(404).json({ message: 'Software not found' });

    if (title) software.title = title;
    if (description !== undefined) software.description = description;
    if (category) {
      const cat = await Category.findById(category);
      if (!cat) return res.status(400).json({ message: 'Category does not exist' });
      software.category = category;
    }
    if (isFree !== undefined) {
      software.isFree = isFree === 'true' || isFree === true;
      if (software.isFree) software.price = 0;
      else if (price) software.price = Number(price);
    } else if (price) software.price = Number(price);
    if (fileUrl) software.fileUrl = fileUrl;

    if (file) {
      if (software.fileInfo?.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
        fs.unlinkSync(software.fileInfo.absolutePath);
      }
      const relativePath = `software/${file.filename}`;
      software.fileInfo = {
        originalName: file.originalname,
        storedName: file.filename,
        relativePath,
        absolutePath: file.path,
        publicUrl: `${process.env.BASE_URL}/uploads/${relativePath}`,
        mimeType: file.mimetype,
        size: file.size,
        extension: path.extname(file.originalname)
      };
      software.fileUrl = software.fileInfo.publicUrl;
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

    if (software.fileUrl && software.fileUrl.startsWith('http')) {
      software.downloadCount += 1;
      await software.save();
      return res.redirect(software.fileUrl);
    }

    if (software.isFree) {
      if (software.fileInfo && software.fileInfo.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
        software.downloadCount += 1;
        await software.save();
        return serveFile(software.fileInfo, res);
      }
      return res.status(404).json({ message: 'File not found' });
    }

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

    let order = await Order.findOne({ user: userId, 'items.itemId': software._id, 'items.itemType': 'software', status: 'completed' });
    if (!order) {
      const transaction = await Transaction.findOne({ user: userId, itemId: software._id, status: 'completed' });
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

    if (!order) return res.status(403).json({ message: 'You have not purchased this software' });

    const item = order.items.find(i => i.itemId.toString() === software._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    software.downloadCount += 1;
    await software.save();

    if (software.fileInfo && software.fileInfo.absolutePath && fs.existsSync(software.fileInfo.absolutePath)) {
      return serveFile(software.fileInfo, res);
    }

    return res.status(404).json({ message: 'File not found' });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
};

function serveFile(fileInfo, res) {
  try {
    const filePath = fileInfo.absolutePath;
    const stats = fs.statSync(filePath);
    const fileName = encodeURIComponent(fileInfo.originalName);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Serve file error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Error streaming file' });
  }
}