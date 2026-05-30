const { getHdmDB } = require('../../../config/hdm/db');

exports.submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ message: 'All fields required' });
    const db = getHdmDB();
    const contact = await db.model('HdmContact').create({ name, email, message });
    res.status(201).json({ message: 'Message sent', contact });
  } catch (error) {
    res.status(500).json({ message: 'Failed to send message' });
  }
};