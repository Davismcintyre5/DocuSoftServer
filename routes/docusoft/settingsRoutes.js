const router = require('express').Router();
const { getSettings, updateSettings, testAiKey } = require('../../controllers/docusoft/settingsController');

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/test-ai-key', testAiKey);

module.exports = router;