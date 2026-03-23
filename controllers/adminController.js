const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const User = require('../models/User');
const Document = require('../models/Document');
const Software = require('../models/Software');
const Settings = require('../models/Settings');
const mongoose = require('mongoose');

// Get dashboard stats
exports.getStats = async (req, res) => {
  try {
    const [totalUsers, totalDocuments, totalSoftware, totalOrders, pendingPayments] = await Promise.all([
      User.countDocuments(),
      Document.countDocuments(),
      Software.countDocuments(),
      Order.countDocuments({ status: 'completed' }),
      Transaction.countDocuments({ 
        status: 'pending', 
        paymentMethod: 'manual'
      })
    ]);

    res.json({
      totalUsers,
      totalDocuments,
      totalSoftware,
      totalOrders,
      pendingPayments
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('❌ Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('❌ Update user role error:', error);
    res.status(500).json({ message: 'Failed to update user role' });
  }
};

// Toggle user status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('❌ Toggle user status error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
};

// Get pending payments – returns ALL manual pending payments
exports.getPendingPayments = async (req, res) => {
  try {
    const payments = await Transaction.find({
      status: 'pending',
      paymentMethod: 'manual'
    })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${payments.length} pending manual payments`);

    const enhanced = await Promise.all(payments.map(async (p) => {
      try {
        const Model = p.itemType === 'document' ? Document : Software;
        const item = await Model.findById(p.itemId).select('title price');
        
        return {
          ...p.toObject(),
          itemDetails: item || { title: p.itemTitle || 'Unknown', price: p.amount },
          // Ensure metadata is always an object
          metadata: p.metadata || {}
        };
      } catch (err) {
        return {
          ...p.toObject(),
          itemDetails: { title: p.itemTitle || 'Unknown', price: p.amount },
          metadata: p.metadata || {}
        };
      }
    }));

    res.json(enhanced);
  } catch (error) {
    console.error('❌ Get pending payments error:', error);
    res.status(500).json({ message: 'Failed to fetch pending payments' });
  }
};

// Approve payment - creates order and updates transaction
exports.approvePayment = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✅ Approving payment for transaction:', id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }

    const transaction = await Transaction.findById(id).populate('user');
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status === 'completed') {
      const existingOrder = await Order.findOne({ transactionId: transaction._id });
      if (existingOrder) {
        return res.json({ 
          message: 'Payment already approved', 
          transaction,
          order: existingOrder 
        });
      }
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        message: `Transaction already ${transaction.status}` 
      });
    }

    if (!transaction.user) {
      return res.status(400).json({ message: 'Transaction has no associated user' });
    }

    let order = await Order.findOne({ transactionId: transaction._id });
    
    if (!order) {
      let item = null;
      try {
        const Model = transaction.itemType === 'document' ? Document : Software;
        item = await Model.findById(transaction.itemId);
      } catch (err) {
        console.error('Error finding item:', err);
      }
      
      if (!item) {
        item = {
          _id: transaction.itemId,
          title: transaction.itemTitle || 'Unknown Item',
          price: transaction.amount
        };
      }

      console.log('📦 Creating order for item:', item.title);

      order = await Order.create({
        user: transaction.user._id,
        items: [{
          itemId: transaction.itemId,
          itemType: transaction.itemType,
          title: item.title || transaction.itemTitle,
          price: transaction.amount,
          downloadCount: 0
        }],
        totalAmount: transaction.amount,
        paymentMethod: transaction.paymentMethod,
        transactionId: transaction._id,
        status: 'completed',
        completedAt: new Date()
      });

      console.log('✅ Order created successfully:', order._id);
    }

    transaction.status = 'completed';
    transaction.orderCreated = true;
    transaction.orderId = order._id;
    transaction.approvedBy = req.user._id;
    transaction.approvedAt = new Date();
    await transaction.save();

    console.log('🎉 Payment approval complete for transaction:', id);

    res.json({ 
      message: 'Payment approved and order created successfully', 
      transaction,
      order: {
        _id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status
      }
    });

  } catch (error) {
    console.error('❌ Approve payment error:', error);
    res.status(500).json({ 
      message: 'Failed to approve payment',
      error: error.message 
    });
  }
};

// Reject payment
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    console.log('❌ Rejecting payment for transaction:', id, 'Reason:', reason);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction ID format' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot reject transaction with status: ${transaction.status}` 
      });
    }

    transaction.status = 'rejected';
    transaction.rejectionReason = reason || 'Not specified by admin';
    await transaction.save();

    console.log('✅ Payment rejected successfully');

    res.json({ 
      message: 'Payment rejected', 
      transaction 
    });
  } catch (error) {
    console.error('❌ Reject payment error:', error);
    res.status(500).json({ message: 'Failed to reject payment' });
  }
};

// Get settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
      await settings.save();
    }
    res.json(settings);
  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

// Update settings
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    Object.assign(settings, req.body);
    settings.updatedAt = Date.now();
    await settings.save();
    res.json(settings);
  } catch (error) {
    console.error('❌ Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};