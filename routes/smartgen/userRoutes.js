const router = require('express').Router();
const { protect } = require('../../middleware/smartgen/auth');
const { updateProfile, changePassword } = require('../../controllers/smartgen/userController');

router.use(protect);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

module.exports = router;