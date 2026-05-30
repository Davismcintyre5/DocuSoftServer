const { getSmartGenDB } = require('../../config/smartgen/db');

exports.getTemplates = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const templates = await db.model('SmartGenTemplate').find({ isPublic: true }).sort({ createdAt: -1 });
    res.json(templates);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch templates' });
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const template = await db.model('SmartGenTemplate').findById(req.params.id);
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json(template);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch template' });
  }
};