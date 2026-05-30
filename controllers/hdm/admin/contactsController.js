const { getHdmDB } = require('../../../config/hdm/db');

exports.getContacts = async (req, res) => {
  try {
    const db = getHdmDB();
    const contacts = await db.model('HdmContact').find().sort({ createdAt: -1 });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

exports.markRead = async (req, res) => {
  try {
    const db = getHdmDB();
    const contact = await db.model('HdmContact').findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update contact' });
  }
};