const router = require('express').Router();
const aiController = require('../../controllers/hdm/public/aiController');
const companyController = require('../../controllers/hdm/public/companyController');
const appsController = require('../../controllers/hdm/public/appsController');
const servicesController = require('../../controllers/hdm/public/servicesController');
const projectsController = require('../../controllers/hdm/public/projectsController');
const photosController = require('../../controllers/hdm/public/photosController');
const contactController = require('../../controllers/hdm/public/contactController');

// AI
router.get('/ai/context', aiController.getContext);
router.get('/ai/config', aiController.getConfig);
router.post('/ai/chat', aiController.chat);

// Company
router.get('/company', companyController.getCompany);

// Apps
router.get('/apps', appsController.getApps);
router.get('/apps/featured', appsController.getFeaturedApps);
router.get('/apps/categories', appsController.getCategories);
router.get('/apps/:slug', appsController.getAppBySlug);
router.post('/apps/:id/like', appsController.likeApp);

// Services
router.get('/services', servicesController.getServices);

// Projects
router.get('/projects', projectsController.getProjects);
router.get('/projects/featured', projectsController.getFeaturedProjects);

// Photos
router.get('/photos', photosController.getPhotos);

// Contact
router.post('/contact', contactController.submitContact);

module.exports = router;