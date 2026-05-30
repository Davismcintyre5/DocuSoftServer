const { getHdmDB } = require('../../../config/hdm/db');

const VALID_CATEGORIES = ['Web Apps', 'Mobile', 'Desktop', 'APIs', 'Games', 'Open Source', 'Security', 'Other'];

exports.getApps = async (req, res) => {
  try {
    const db = getHdmDB();
    const apps = await db.model('HdmApp').find().sort({ createdAt: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch apps' });
  }
};

exports.createApp = async (req, res) => {
  try {
    const { name, category, description, technologies, urls, featured, rating } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const db = getHdmDB();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    let r = Number(rating) || 0;
    if (r < 0) r = 0;
    if (r > 5) r = 5;
    const app = await db.model('HdmApp').create({
      name, slug,
      category: VALID_CATEGORIES.includes(category) ? category : 'Web Apps',
      description: description || '',
      technologies: technologies || [],
      urls: urls || {},
      featured: featured || false,
      rating: r
    });
    res.status(201).json(app);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'App name already exists' });
    res.status(500).json({ message: 'Failed to create app' });
  }
};

exports.updateApp = async (req, res) => {
  try {
    const { name, category, rating, ...rest } = req.body;
    if (name) { rest.name = name; rest.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    if (category) rest.category = VALID_CATEGORIES.includes(category) ? category : 'Web Apps';
    if (rating !== undefined) { let r = Number(rating) || 0; if (r < 0) r = 0; if (r > 5) r = 5; rest.rating = r; }
    const db = getHdmDB();
    const app = await db.model('HdmApp').findByIdAndUpdate(req.params.id, rest, { new: true });
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json(app);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update app' });
  }
};

exports.deleteApp = async (req, res) => {
  try {
    const db = getHdmDB();
    const app = await db.model('HdmApp').findByIdAndDelete(req.params.id);
    if (!app) return res.status(404).json({ message: 'App not found' });
    res.json({ message: 'App deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete app' });
  }
};