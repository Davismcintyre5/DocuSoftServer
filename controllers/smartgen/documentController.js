const { getSmartGenDB } = require('../../config/smartgen/db');

exports.getDocuments = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const docs = await db.model('SmartGenDocument').find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (error) {
    console.error('Get docs error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

exports.getDocument = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const doc = await db.model('SmartGenDocument').findOne({ _id: req.params.id, user: req.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch document' });
  }
};

exports.createDocument = async (req, res) => {
  try {
    const { templateId, templateName, formData } = req.body;
    const db = getSmartGenDB();
    const doc = await db.model('SmartGenDocument').create({
      user: req.userId,
      templateId: templateId || 'unknown',
      templateName: templateName || 'Untitled',
      formData: formData || {}
    });
    res.status(201).json(doc);
  } catch (error) {
    console.error('Create doc error:', error.message);
    res.status(500).json({ message: 'Failed to create document' });
  }
};

exports.updateDocument = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const doc = await db.model('SmartGenDocument').findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { formData: req.body.formData },
      { new: true }
    );
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update document' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const db = getSmartGenDB();
    const doc = await db.model('SmartGenDocument').findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
};