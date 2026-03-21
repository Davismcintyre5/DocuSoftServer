const express = require('express');
const { getSettings, updateSettings } = require('../controllers/settingsController');
const { protect, admin } = require('../middleware/auth');
const router = express.Router();

// Public route to get settings
router.get('/', getSettings);

// Admin only update
router.put('/', protect, admin, updateSettings);

module.exports = router;