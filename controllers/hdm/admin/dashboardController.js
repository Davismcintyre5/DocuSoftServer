const { getHdmDB } = require('../../../config/hdm/db');

exports.getStats = async (req, res) => {
  try {
    const db = getHdmDB();
    const [apps, services, projects, photos, unread] = await Promise.all([
      db.model('HdmApp').countDocuments(),
      db.model('HdmService').countDocuments(),
      db.model('HdmProject').countDocuments(),
      db.model('HdmPhoto').countDocuments(),
      db.model('HdmContact').countDocuments({ isRead: false })
    ]);
    res.json({ apps, services, projects, photos, unreadMessages: unread });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};