const { getHdmDB } = require('../../../config/hdm/db');
const { sendMessage } = require('../../../services/aiService');
const { decrypt } = require('../../../utils/encryptKey');

exports.getContext = async (req, res) => {
  try {
    const db = getHdmDB();
    const [settings, company, services, apps, projects] = await Promise.all([
      db.model('HdmSettings').findOne().select('+ai.apiKey').lean(),
      db.model('HdmCompany').findOne().lean(),
      db.model('HdmService').find({ isActive: true }).sort({ order: 1 }).lean(),
      db.model('HdmApp').find({ isActive: true }).lean(),
      db.model('HdmProject').find({ isActive: true }).sort({ order: 1 }).lean()
    ]);

    if (!settings?.ai?.enabled) return res.status(404).json({ message: 'AI not enabled' });

    res.json({
      company: company ? { name: company.name, tagline: company.tagline, description: company.description, email: company.email, phone: company.phone, whatsapp: company.whatsapp, address: company.address } : null,
      services: services.map(s => ({ title: s.title, description: s.description })),
      apps: apps.map(a => ({ name: a.name, category: a.category, description: a.description?.substring(0, 200), technologies: a.technologies, rating: a.rating, urls: a.urls })),
      projects: projects.map(p => ({ name: p.name, description: p.description, technologies: p.technologies, featured: p.featured })),
      socialLinks: company?.social || {}
    });
  } catch (error) {
    console.error('Get HDM AI context error:', error);
    res.status(500).json({ message: 'Failed to fetch AI context' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message required' });

    const db = getHdmDB();
    const settings = await db.model('HdmSettings').findOne().select('+ai.apiKey').lean();
    if (!settings?.ai?.enabled) return res.status(404).json({ message: 'AI not enabled' });

    const apiKey = settings.ai.apiKey ? decrypt(settings.ai.apiKey) : null;
    if (!apiKey) return res.status(500).json({ message: 'API key not configured' });

    const [company, services, apps, projects] = await Promise.all([
      db.model('HdmCompany').findOne().lean(),
      db.model('HdmService').find({ isActive: true }).sort({ order: 1 }).lean(),
      db.model('HdmApp').find({ isActive: true }).lean(),
      db.model('HdmProject').find({ isActive: true }).sort({ order: 1 }).lean()
    ]);

    const context = {
      company: company ? { name: company.name, tagline: company.tagline, description: company.description, email: company.email, phone: company.phone } : null,
      services: services.map(s => ({ title: s.title, description: s.description })),
      apps: apps.map(a => ({ name: a.name, category: a.category, description: a.description?.substring(0, 200), technologies: a.technologies, rating: a.rating })),
      projects: projects.map(p => ({ name: p.name, description: p.description, technologies: p.technologies, featured: p.featured }))
    };

    const result = await sendMessage(settings.ai.baseUrl, apiKey, message.trim(), 'hdm_portfolio', context);
    if (!result.success) return res.status(500).json({ message: result.error || 'AI service error' });
    res.json(result.data);
  } catch (error) {
    console.error('HDM AI chat error:', error);
    res.status(500).json({ message: 'Failed to get AI response' });
  }
};

exports.getConfig = async (req, res) => {
  try {
    const db = getHdmDB();
    const settings = await db.model('HdmSettings').findOne().lean();
    if (!settings?.ai?.enabled) return res.json({ enabled: false });
    res.json({ enabled: true, greeting: settings.ai.greeting, widgetColor: settings.ai.widgetColor, widgetPosition: settings.ai.widgetPosition });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch AI config' });
  }
};