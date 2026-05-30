const router = require('express').Router();
const { protect, admin } = require('../../middleware/docusoft/auth');
const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../../controllers/docusoft/categoryController');

router.get('/', getCategories);
router.get('/:id', getCategory);
router.post('/', protect, admin, createCategory);
router.put('/:id', protect, admin, updateCategory);
router.delete('/:id', protect, admin, deleteCategory);

module.exports = router;