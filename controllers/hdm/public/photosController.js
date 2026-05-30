const { getHdmDB } = require('../../../config/hdm/db');

exports.getPhotos = async (req, res) => {
  try {
    const db = getHdmDB();
    const photos = await db.model('HdmPhoto').find({ isActive: true }).sort({ createdAt: -1 }).lean();
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch photos' });
  }
};