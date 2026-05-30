const router = require('express').Router();
const { register, login, getMe } = require('../../controllers/docusoft/authController');
const { protect } = require('../../middleware/docusoft/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;