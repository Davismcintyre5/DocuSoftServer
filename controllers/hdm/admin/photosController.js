const { getHdmDB } = require('../../../config/hdm/db');
const fs = require('fs');
const path = require('path');

exports.getPhotos = async (req, res) => {
  try {
    const db = getHdmDB();
    const photos = await db.model('HdmPhoto').find().sort({ createdAt: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch photos' });
  }
};

exports.createPhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No photo uploaded' });
    const db = getHdmDB();
    const photo = await db.model('HdmPhoto').create({
      title: req.body.title || '',
      path: `/uploads/hdm/photos/${req.file.filename}`,
      category: req.body.category || 'General'
    });
    res.status(201).json(photo);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create photo' });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const db = getHdmDB();
    const photo = await db.model('HdmPhoto').findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });
    const filePath = path.join(__dirname, '../../../', photo.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await photo.deleteOne();
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete photo' });
  }
};