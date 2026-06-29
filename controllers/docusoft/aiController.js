const Settings = require('../../models/docusoft/Settings');
const Category = require('../../models/docusoft/Category');
const Document = require('../../models/docusoft/Document');
const Software = require('../../models/docusoft/Software');
const { sendMessage } = require('../../services/aiService');
const { decrypt } = require('../../utils/encryptKey');

exports.getContext = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    if (!settings.ai?.enabled) return res.status(404).json({ message: 'AI not enabled' });

    const [categories, documents, software] = await Promise.all([
      Category.find().lean(),
      Document.find().select('title category price isFree description downloadCount').lean(),
      Software.find().select('title category price isFree description downloadCount').lean()
    ]);

    const categoriesWithCount = categories.map(cat => {
      const docCount = documents.filter(d => d.category?.toString() === cat._id.toString()).length;
      const swCount = software.filter(s => s.category?.toString() === cat._id.toString()).length;
      return { name: cat.name, slug: cat.slug, count: docCount + swCount };
    });

    const allItems = [...documents, ...software];
    const freeItems = allItems.filter(i => i.isFree).length;
    const paidItems = allItems.filter(i => !i.isFree).length;
    const paidPrices = allItems.filter(i => !i.isFree && i.price > 0).map(i => i.price);

    const context = {
      business: { name: settings.businessName, phone: settings.businessPhoneNumber, hours: settings.businessHours },
      categories: categoriesWithCount,
      documents: documents.map(d => ({
        title: d.title,
        category: categories.find(c => c._id.toString() === d.category?.toString())?.name || 'Uncategorized',
        price: d.price,
        isFree: d.isFree,
        description: d.description?.substring(0, 200) || '',
        downloadCount: d.downloadCount
      })),
      software: software.map(s => ({
        title: s.title,
        category: categories.find(c => c._id.toString() === s.category?.toString())?.name || 'Uncategorized',
        price: s.price,
        isFree: s.isFree,
        description: s.description?.substring(0, 200) || '',
        downloadCount: s.downloadCount
      })),
      pricing: {
        freeItems,
        paidItems,
        priceRange: paidPrices.length > 0 ? { min: Math.min(...paidPrices), max: Math.max(...paidPrices) } : null,
        currency: settings.currency || 'KES'
      },
      paymentMethods: [
        { name: 'M-Pesa STK Push' },
        { name: 'Manual Payment' }
      ],
      howToPurchase: 'Browse items → Select → Pay if paid → Download'
    };

    res.json(context);
  } catch (error) {
    console.error('Get AI context error:', error);
    res.status(500).json({ message: 'Failed to fetch AI context' });
  }
};

exports.chat = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const settings = await Settings.findOne().select('+ai.apiKey');
    if (!settings?.ai?.enabled) return res.status(404).json({ message: 'AI chat is not enabled' });

    const apiKey = settings.ai.apiKey ? decrypt(settings.ai.apiKey) : null;
    if (!apiKey) return res.status(500).json({ message: 'AI API key not configured' });

    const [categories, documents, software] = await Promise.all([
      Category.find().lean(),
      Document.find().select('title category price isFree description downloadCount').lean(),
      Software.find().select('title category price isFree description downloadCount').lean()
    ]);

    const context = {
      business: { name: settings.businessName, phone: settings.businessPhoneNumber, hours: settings.businessHours },
      categories: categories.map(c => ({ name: c.name, slug: c.slug })),
      documents: documents.map(d => ({
        title: d.title,
        category: categories.find(c => c._id.toString() === d.category?.toString())?.name || 'Uncategorized',
        price: d.price,
        isFree: d.isFree,
        description: d.description?.substring(0, 200) || ''
      })),
      software: software.map(s => ({
        title: s.title,
        category: categories.find(c => c._id.toString() === s.category?.toString())?.name || 'Uncategorized',
        price: s.price,
        isFree: s.isFree,
        description: s.description?.substring(0, 200) || ''
      })),
      pricing: {
        freeItems: [...documents, ...software].filter(i => i.isFree).length,
        paidItems: [...documents, ...software].filter(i => !i.isFree).length,
        currency: settings.currency || 'KES'
      },
      paymentMethods: [{ name: 'M-Pesa STK Push' }, { name: 'Manual Payment' }],
      howToPurchase: 'Browse items → Select → Pay if paid → Download'
    };

    const result = await sendMessage(settings.ai.baseUrl, apiKey, message.trim(), 'docusoft', context);

    if (!result.success) return res.status(500).json({ message: result.error || 'AI service error' });

    res.json(result.data);
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ message: 'Failed to get AI response' });
  }
};