const { getHdmDB } = require('../../../config/hdm/db');

exports.getCompany = async (req, res) => {
  try {
    const db = getHdmDB();
    const company = await db.model('HdmCompany').findOne().lean();
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};