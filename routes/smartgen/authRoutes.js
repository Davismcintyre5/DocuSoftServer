const router = require('express').Router();
const { register, login, getMe } = require('../../controllers/smartgen/authController');
const { protect } = require('../../middleware/smartgen/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;