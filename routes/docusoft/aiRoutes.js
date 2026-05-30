const router = require('express').Router();
const { chat, getContext } = require('../../controllers/docusoft/aiController');

router.get('/context', getContext);
router.post('/chat', chat);

module.exports = router;