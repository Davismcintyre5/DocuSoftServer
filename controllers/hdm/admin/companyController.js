const { getHdmDB } = require('../../../config/hdm/db');

exports.getCompany = async (req, res) => {
  try {
    const db = getHdmDB();
    const Company = db.model('HdmCompany');
    let company = await Company.findOne();
    if (!company) company = await Company.create({});
    res.json(company);
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Failed to fetch company' });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const db = getHdmDB();
    const Company = db.model('HdmCompany');
    let company = await Company.findOne();
    if (!company) company = new Company();
    Object.assign(company, req.body);
    await company.save();
    res.json(company);
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Failed to update company', error: error.message });
  }
};

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No logo uploaded' });
    const db = getHdmDB();
    const Company = db.model('HdmCompany');
    let company = await Company.findOne();
    if (!company) company = new Company();
    company.logo = `/uploads/hdm/logos/${req.file.filename}`;
    await company.save();
    res.json({ logo: company.logo });
  } catch (error) {
    res.status(500).json({ message: 'Failed to upload logo' });
  }
};