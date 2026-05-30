const { getHdmDB } = require('../../../config/hdm/db');

exports.getProjects = async (req, res) => {
  try {
    const db = getHdmDB();
    const projects = await db.model('HdmProject').find({ isActive: true }).sort({ order: 1 }).lean();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

exports.getFeaturedProjects = async (req, res) => {
  try {
    const db = getHdmDB();
    const projects = await db.model('HdmProject').find({ isActive: true, featured: true }).lean();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch featured projects' });
  }
};