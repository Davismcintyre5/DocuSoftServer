const router = require('express').Router();
const { protect, admin } = require('../../middleware/hdm/auth');
const authController = require('../../controllers/hdm/admin/authController');
const dashboardController = require('../../controllers/hdm/admin/dashboardController');
const appsController = require('../../controllers/hdm/admin/appsController');
const servicesController = require('../../controllers/hdm/admin/servicesController');
const projectsController = require('../../controllers/hdm/admin/projectsController');
const photosController = require('../../controllers/hdm/admin/photosController');
const contactsController = require('../../controllers/hdm/admin/contactsController');
const companyController = require('../../controllers/hdm/admin/companyController');
const settingsController = require('../../controllers/hdm/admin/settingsController');
const {
  listBackups, getSettings: getBackupSettings, updateSettings: updateBackupSettings,
  createBackup, triggerAutoBackup, deleteBackup, restoreBackup, downloadBackup
} = require('../../controllers/hdm/admin/backupController');
const upload = require('../../middleware/hdm/upload');

// Auth (no protect)
router.post('/login', authController.login);

// Protected
router.use(protect, admin);

router.get('/profile', authController.getProfile);
router.get('/dashboard', dashboardController.getStats);

// Apps
router.get('/apps', appsController.getApps);
router.post('/apps', appsController.createApp);
router.put('/apps/:id', appsController.updateApp);
router.delete('/apps/:id', appsController.deleteApp);

// Services
router.get('/services', servicesController.getServices);
router.post('/services', servicesController.createService);
router.put('/services/:id', servicesController.updateService);
router.delete('/services/:id', servicesController.deleteService);

// Projects
router.get('/projects', projectsController.getProjects);
router.post('/projects', projectsController.createProject);
router.put('/projects/:id', projectsController.updateProject);
router.delete('/projects/:id', projectsController.deleteProject);

// Photos
router.get('/photos', photosController.getPhotos);
router.post('/photos', upload.single('photo'), photosController.createPhoto);
router.delete('/photos/:id', photosController.deletePhoto);

// Contacts
router.get('/contacts', contactsController.getContacts);
router.put('/contacts/:id', contactsController.markRead);

// Company
router.get('/company', companyController.getCompany);
router.put('/company', companyController.updateCompany);
router.post('/company/logo', upload.single('logo'), companyController.uploadLogo);

// Settings
router.get('/settings', settingsController.getSettings);
router.put('/settings', settingsController.updateSettings);
router.post('/settings/test-ai-key', settingsController.testAiKey);

// Backups
router.get('/backups', listBackups);
router.get('/backups/settings', getBackupSettings);
router.put('/backups/settings', updateBackupSettings);
router.post('/backups', createBackup);
router.post('/backups/auto', triggerAutoBackup);
router.delete('/backups/:id', deleteBackup);
router.post('/backups/:id/restore', restoreBackup);
router.get('/backups/:id/download', downloadBackup);

module.exports = router;