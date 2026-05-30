const router = require('express').Router();

router.use('/api/auth', require('../routes/smartgen/authRoutes'));
router.use('/api/users', require('../routes/smartgen/userRoutes'));
router.use('/api/templates', require('../routes/smartgen/templateRoutes'));
router.use('/api/documents', require('../routes/smartgen/documentRoutes'));

module.exports = router;