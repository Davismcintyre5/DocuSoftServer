const Settings = require('../../models/docusoft/Settings');
const { encrypt, decrypt } = require('../../utils/encryptKey');
const axios = require('axios');

exports.getSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const data = settings.toObject();

    data.ai = {
      ...data.ai,
      hasApiKey: !!data.ai?.apiKey,
      apiKey: data.ai?.apiKey ? '••••••••' : ''
    };

    res.json(data);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    const { termsAndConditions, privacyPolicy, requireTermsAcceptance, ai, ...otherSettings } = req.body;

    if (termsAndConditions) {
      if (typeof termsAndConditions === 'string') {
        settings.termsAndConditions.content = termsAndConditions;
      } else if (termsAndConditions.content) {
        settings.termsAndConditions.content = termsAndConditions.content;
      }
      settings.termsAndConditions.lastUpdated = new Date();
    }

    if (privacyPolicy) {
      if (typeof privacyPolicy === 'string') {
        settings.privacyPolicy.content = privacyPolicy;
      } else if (privacyPolicy.content) {
        settings.privacyPolicy.content = privacyPolicy.content;
      }
      settings.privacyPolicy.lastUpdated = new Date();
    }

    if (requireTermsAcceptance !== undefined) {
      settings.requireTermsAcceptance = requireTermsAcceptance;
    }

    if (ai) {
      if (ai.enabled !== undefined) settings.ai.enabled = ai.enabled;
      if (ai.baseUrl !== undefined) settings.ai.baseUrl = ai.baseUrl;
      if (ai.apiKey && !ai.apiKey.startsWith('••••')) {
        settings.ai.apiKey = encrypt(ai.apiKey);
      }
      if (ai.greeting !== undefined) settings.ai.greeting = ai.greeting;
      if (ai.widgetColor !== undefined) settings.ai.widgetColor = ai.widgetColor;
      if (ai.widgetPosition !== undefined) settings.ai.widgetPosition = ai.widgetPosition;
    }

    Object.keys(otherSettings).forEach(key => {
      settings[key] = otherSettings[key];
    });

    settings.updatedAt = Date.now();
    await settings.save();

    const data = settings.toObject();
    data.ai = {
      ...data.ai,
      hasApiKey: !!data.ai?.apiKey,
      apiKey: data.ai?.apiKey ? '••••••••' : ''
    };

    res.json(data);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

exports.testAiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;
    const settings = await Settings.getSettings();
    const baseUrl = settings.ai?.baseUrl || 'https://hdmai-server.onrender.com/api/v1';

    const response = await axios.get(`${baseUrl}/health`, {
      headers: { 'x-api-key': apiKey },
      timeout: 10000
    });

    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};