const jwt = require('jsonwebtoken');
const { getHdmDB } = require('../../../config/hdm/db');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getHdmDB();
    const User = db.model('HdmUser');
    const user = await User.findOne({ email, isActive: true });
    if (!user || !user.isAdmin) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('HDM login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const db = getHdmDB();
    const user = await db.model('HdmUser').findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};