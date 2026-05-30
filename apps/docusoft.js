const router = require('express').Router();

router.use('/auth', require('../routes/docusoft/authRoutes'));
router.use('/categories', require('../routes/docusoft/categoryRoutes'));
router.use('/documents', require('../routes/docusoft/documentRoutes'));
router.use('/software', require('../routes/docusoft/softwareRoutes'));
router.use('/payments', require('../routes/docusoft/paymentRoutes'));
router.use('/orders', require('../routes/docusoft/orderRoutes'));
router.use('/admin', require('../routes/docusoft/adminRoutes'));
router.use('/settings', require('../routes/docusoft/settingsRoutes'));
router.use('/upload', require('../routes/docusoft/uploadRoutes'));
router.use('/ai', require('../routes/docusoft/aiRoutes'));

module.exports = router;