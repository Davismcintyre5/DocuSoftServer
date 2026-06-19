const { getHdmDB } = require('../../../config/hdm/db');
const { uploadFile, deleteFile } = require('../../../services/cloudinaryService');

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
    const result = await uploadFile(req.file.buffer, req.file.originalname, 'photos');

    const photo = await db.model('HdmPhoto').create({
      title: req.body.title || '',
      path: result.secure_url,
      publicId: result.public_id,
      category: req.body.category || 'General'
    });

    res.status(201).json(photo);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to upload photo' });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const db = getHdmDB();
    const photo = await db.model('HdmPhoto').findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    if (photo.publicId) {
      await deleteFile(photo.publicId).catch(() => {});
    }

    await photo.deleteOne();
    res.json({ message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete photo' });
  }
};