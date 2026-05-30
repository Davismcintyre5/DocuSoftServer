const router = require('express').Router();
const { getTemplates, getTemplate } = require('../../controllers/smartgen/templateController');

router.get('/', getTemplates);
router.get('/:id', getTemplate);

module.exports = router;