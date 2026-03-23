const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validatePhone } = require('../utils/helpers');
const Settings = require('../models/Settings');

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password, acceptedTerms, acceptedPrivacy } = req.body;

    // Validate phone
    if (!validatePhone(phone)) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or phone already registered' });
    }

    // Get settings to check if terms acceptance is required
    const settings = await Settings.getSettings();
    
    // Check terms acceptance if required
    if (settings.requireTermsAcceptance !== false) {
      if (!acceptedTerms) {
        return res.status(400).json({ message: 'You must accept the Terms & Conditions' });
      }
      if (!acceptedPrivacy) {
        return res.status(400).json({ message: 'You must accept the Privacy Policy' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
      acceptedTerms: acceptedTerms || false,
      acceptedPrivacy: acceptedPrivacy || false,
      termsAcceptedAt: acceptedTerms ? new Date() : null,
      privacyAcceptedAt: acceptedPrivacy ? new Date() : null
    });

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
};