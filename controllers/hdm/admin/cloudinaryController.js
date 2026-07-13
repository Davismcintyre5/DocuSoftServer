const {
  getUsage,
  getFolders,
  getFolderContents,
  getSubFolders,
  getFileDetails,
  deleteFile,
  deleteFiles,
  deleteFolder,
  createFolder,
  renameFile,
  uploadFile,
} = require('../../../services/cloudinaryService');

// ============ STATS ============
exports.getStats = async (req, res) => {
  try {
    const usage = await getUsage();
    res.json({ success: true, data: usage });
  } catch (error) {
    console.error('Cloudinary stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ FOLDERS ============
exports.getFolders = async (req, res) => {
  try {
    const [rootFolders, rootFiles] = await Promise.all([
      getFolders(),
      getFolderContents('', 10),
    ]);
    res.json({
      success: true,
      data: {
        folders: rootFolders.folders || [],
        rootFiles: rootFiles.resources || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFolderContents = async (req, res) => {
  try {
    const folder = req.params[0] || '';
    const limit = parseInt(req.query.limit) || 50;

    const [files, subFolders] = await Promise.all([
      getFolderContents(folder, limit),
      getSubFolders(folder || ''),
    ]);

    res.json({
      success: true,
      data: {
        resources: files.resources || [],
        subFolders: subFolders.folders || [],
        nextCursor: files.next_cursor || null,
        total: files.resources?.length || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ FILE ============
exports.getFile = async (req, res) => {
  try {
    const { publicId } = req.query;
    if (!publicId) return res.status(400).json({ success: false, message: 'publicId required' });

    const details = await getFileDetails(publicId);
    res.json({ success: true, data: details });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { publicIds } = req.body;
    if (!publicIds || !Array.isArray(publicIds) || !publicIds.length) {
      return res.status(400).json({ success: false, message: 'publicIds array required' });
    }

    const result = await deleteFiles(publicIds);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const folder = req.body.folder || 'hdm/admin';
    const result = await uploadFile(req.file.buffer, req.file.originalname, folder);

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ FOLDER ACTIONS ============
exports.createFolder = async (req, res) => {
  try {
    const { path } = req.body;
    if (!path) return res.status(400).json({ success: false, message: 'path required' });

    const result = await createFolder(path);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const { prefix } = req.body;
    if (!prefix) return res.status(400).json({ success: false, message: 'prefix required' });

    const result = await deleteFolder(prefix);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.renameFile = async (req, res) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to required' });

    const result = await renameFile(from, to);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};