const { getHdmDB } = require('../../../config/hdm/db');

exports.getServices = async (req, res) => {
  try {
    const db = getHdmDB();
    const services = await db.model('HdmService').find().sort({ order: 1 });
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch services' });
  }
};

exports.createService = async (req, res) => {
  try {
    const db = getHdmDB();
    const service = await db.model('HdmService').create(req.body);
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create service' });
  }
};

exports.updateService = async (req, res) => {
  try {
    const db = getHdmDB();
    const service = await db.model('HdmService').findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json(service);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update service' });
  }
};

exports.deleteService = async (req, res) => {
  try {
    const db = getHdmDB();
    const service = await db.model('HdmService').findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete service' });
  }
};