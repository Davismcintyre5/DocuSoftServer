const { getHdmDB } = require('../../../config/hdm/db');
const { encrypt, decrypt } = require('../../../utils/encryptKey');

exports.getSettings = async (req, res) => {
  try {
    const db = getHdmDB();
    let settings = await db.model('HdmSettings').findOne().select('+ai.apiKey');
    if (!settings) settings = await db.model('HdmSettings').create({});

    const data = settings.toObject();
    data.ai = {
      ...data.ai,
      hasApiKey: !!data.ai?.apiKey,
      apiKey: data.ai?.apiKey ? '••••••••' : ''
    };

    res.json(data);
  } catch (error) {
    console.error('Get HDM settings error:', error);
    res.status(500).json({ message: 'Failed to fetch settings' });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const db = getHdmDB();
    let settings = await db.model('HdmSettings').findOne();
    if (!settings) settings = await db.model('HdmSettings').create({});

    const { ai } = req.body;
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

    await settings.save();

    const data = settings.toObject();
    data.ai = {
      ...data.ai,
      hasApiKey: !!data.ai?.apiKey,
      apiKey: data.ai?.apiKey ? '••••••••' : ''
    };

    res.json(data);
  } catch (error) {
    console.error('Update HDM settings error:', error);
    res.status(500).json({ message: 'Failed to update settings' });
  }
};

exports.testAiKey = async (req, res) => {
  try {
    const db = getHdmDB();
    const settings = await db.model('HdmSettings').findOne().select('+ai.apiKey');
    const apiKey = req.body.apiKey || (settings?.ai?.apiKey ? decrypt(settings.ai.apiKey) : null);
    if (!apiKey) return res.status(400).json({ message: 'No API key' });

    const axios = require('axios');
    await axios.get(`${settings.ai.baseUrl}/health`, { headers: { 'x-api-key': apiKey }, timeout: 10000 });
    res.json({ success: true, message: 'Connection successful' });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};