const router = require('express').Router();

router.use('/api', require('../routes/hdm/publicRoutes'));
router.use('/api/admin', require('../routes/hdm/adminRoutes'));

module.exports = router;