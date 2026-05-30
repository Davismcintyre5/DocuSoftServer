const { getHdmDB } = require('../../../config/hdm/db');

exports.getApps = async (req, res) => {
  try {
    const { category } = req.query;
    const db = getHdmDB();
    const filter = { isActive: true };
    if (category && category !== 'All') filter.category = category;
    const apps = await db.model('HdmApp').find(filter).sort({ createdAt: -1 }).lean();
    res.json(apps);
  } catch (error) {
    console.error('Get apps error:', error);
    res.status(500).json({ message: 'Failed to fetch apps' });
  }
};

exports.getFeaturedApps = async (req, res) => {
  try {
    const db = getHdmDB();
    const apps = await db.model('HdmApp').find({ isActive: true, featured: true }).lean();
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch featured apps' });
  }
};

exports.getAppBySlug = async (req, res) => {
  try {
    const db = getHdmDB();
    const app = await db.model('HdmApp').findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch app' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const db = getHdmDB();
    const categories = await db.model('HdmApp').distinct('category', { isActive: true });
    res.json(['All', ...categories]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

exports.likeApp = async (req, res) => {
  try {
    const db = getHdmDB();
    const app = await db.model('HdmApp').findByIdAndUpdate(req.params.id, { $inc: { likeCount: 1 } }, { new: true });
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json({ likeCount: app.likeCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to like app' });
  }
};