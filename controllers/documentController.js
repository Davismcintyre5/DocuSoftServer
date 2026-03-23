const Document = require('../models/Document');
const Category = require('../models/Category');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const pathManager = require('../config/pathManager');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

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

exports.createDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree, fileUrl } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });
    if (!category) return res.status(400).json({ message: 'Category is required' });
    if (!fileUrl) return res.status(400).json({ message: 'File URL is required' });

    const categoryExists = await Category.findById(category);
    if (!categoryExists) return res.status(400).json({ message: 'Category does not exist' });

    const isFreeBool = isFree === 'true' || isFree === true;
    const priceNum = isFreeBool ? 0 : Number(price);
    if (!isFreeBool && (!price || isNaN(priceNum) || priceNum <= 0)) {
      return res.status(400).json({ message: 'Price must be greater than 0 for paid items' });
    }

    const document = new Document({ title, description: description || '', category, price: priceNum, isFree: isFreeBool, fileUrl, downloadCount: 0 });
    await document.save();
    await document.populate('category', 'name slug');
    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ message: 'Failed to create document' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const { title, description, category, price, isFree, fileUrl } = req.body;
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

    document.updatedAt = Date.now();
    await document.save();
    await document.populate('category', 'name slug');
    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ message: 'Failed to update document' });
  }
};

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

exports.downloadDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    // GitHub URL redirect
    if (document.fileUrl && document.fileUrl.startsWith('http')) {
      return res.redirect(document.fileUrl);
    }

    // Free item -> stream
    if (document.isFree) return streamFile(document, res);

    // Token from header or query
    let token = req.headers.authorization;
    if (!token && req.query.token) token = `Bearer ${req.query.token}`;
    if (!token) return res.status(401).json({ message: 'Please login to download paid items' });

    token = token.replace(/^Bearer\s+/i, '');
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    let order = await Order.findOne({ user: userId, 'items.itemId': document._id, 'items.itemType': 'document', status: 'completed' });
    if (!order) {
      const transaction = await Transaction.findOne({ user: userId, itemId: document._id, status: 'completed' });
      if (transaction) {
        order = await Order.create({
          user: userId,
          items: [{ itemId: document._id, itemType: 'document', title: document.title, price: document.price, downloadCount: 0 }],
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

    const item = order.items.find(i => i.itemId.toString() === document._id.toString());
    if (item) {
      item.downloadCount += 1;
      item.lastDownloaded = new Date();
      await order.save();
    }

    return streamFile(document, res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Download failed' });
  }
};

async function streamFile(item, res) {
  try {
    let filePath = item.fileInfo?.relativePath ? pathManager.getAbsolutePath(item.fileInfo.relativePath) : item.fileInfo?.absolutePath;
    if (!filePath || !fs.existsSync(filePath)) {
      if (item.fileUrl && item.fileUrl.startsWith('http')) return res.redirect(item.fileUrl);
      return res.status(404).json({ message: 'File not found' });
    }
    const stats = fs.statSync(filePath);
    const fileName = encodeURIComponent(item.fileInfo?.originalName || item.title);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Type', item.fileInfo?.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ message: 'Error streaming file' });
  }
}