const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ============ UPLOAD ============
const uploadFile = async (buffer, filename, folder = 'hdm') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `docusoft/${folder}`,
        public_id: filename.split('.')[0],
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// ============ DELETE ============
const deleteFile = async (publicId) => {
  return cloudinary.uploader.destroy(publicId);
};

const deleteFiles = async (publicIds) => {
  return cloudinary.api.delete_resources(publicIds);
};

// ============ STATS ============
const getUsage = async () => {
  return cloudinary.api.usage();
};

// ============ FOLDERS ============
const getFolders = async () => {
  return cloudinary.api.root_folders();
};

const getFolderContents = async (folder, maxResults = 50) => {
  return cloudinary.api.resources({
    type: 'upload',
    prefix: folder,
    max_results: maxResults,
  });
};

const getSubFolders = async (folder) => {
  return cloudinary.api.sub_folders(folder);
};

// ============ FILE DETAILS ============
const getFileDetails = async (publicId) => {
  return cloudinary.api.resource(publicId);
};

// ============ DELETE FOLDER ============
const deleteFolder = async (prefix) => {
  return cloudinary.api.delete_resources_by_prefix(prefix);
};

// ============ CREATE FOLDER ============
const createFolder = async (path) => {
  return cloudinary.api.create_folder(path);
};

// ============ RENAME ============
const renameFile = async (fromPublicId, toPublicId) => {
  return cloudinary.uploader.rename(fromPublicId, toPublicId);
};

module.exports = {
  uploadFile,
  deleteFile,
  deleteFiles,
  getUsage,
  getFolders,
  getFolderContents,
  getSubFolders,
  getFileDetails,
  deleteFolder,
  createFolder,
  renameFile,
};