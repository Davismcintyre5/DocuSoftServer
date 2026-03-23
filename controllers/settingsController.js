const Settings = require('../models/Settings');

// Get settings (public)
exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

// Update settings (admin only)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    
    // Handle terms and privacy updates
    const { termsAndConditions, privacyPolicy, requireTermsAcceptance, ...otherSettings } = req.body;
    
    if (termsAndConditions) {
      settings.termsAndConditions = {
        content: termsAndConditions,
        lastUpdated: new Date()
      };
    }
    
    if (privacyPolicy) {
      settings.privacyPolicy = {
        content: privacyPolicy,
        lastUpdated: new Date()
      };
    }
    
    if (requireTermsAcceptance !== undefined) {
      settings.requireTermsAcceptance = requireTermsAcceptance;
    }
    
    Object.assign(settings, otherSettings);
    settings.updatedAt = Date.now();
    await settings.save();
    
    res.json(settings);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};