const { getHdmDB } = require('../../../config/hdm/db');

exports.getServices = async (req, res) => {
  try {
    const db = getHdmDB();
    const services = await db.model('HdmService').find({ isActive: true }).sort({ order: 1 }).lean();
    res.json(services);
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
};