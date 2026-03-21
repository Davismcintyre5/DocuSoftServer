const Category = require('../models/Category');
const mongoose = require('mongoose');

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    console.log(`📁 Found ${categories.length} categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ Get categories error:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
};

// Get single category (by ID, slug, or name)
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍 Fetching category with identifier:', id);
    
    let category = null;
    
    // Try 1: Check if it's a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      category = await Category.findById(id);
      if (category) {
        console.log('✅ Category found by ID:', category.name);
        return res.json(category);
      }
    }
    
    // Try 2: Try by slug
    category = await Category.findOne({ slug: id });
    if (category) {
      console.log('✅ Category found by slug:', category.name);
      return res.json(category);
    }
    
    // Try 3: Try by name (case insensitive)
    category = await Category.findOne({ 
      name: { $regex: new RegExp(`^${id}$`, 'i') } 
    });
    if (category) {
      console.log('✅ Category found by name:', category.name);
      return res.json(category);
    }
    
    // Not found
    console.log('❌ Category not found with identifier:', id);
    return res.status(404).json({ message: 'Category not found' });
    
  } catch (error) {
    console.error('❌ Get category error:', error);
    res.status(500).json({ message: 'Failed to fetch category' });
  }
};

// Create category (admin)
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if category already exists
    const existing = await Category.findOne({ 
      $or: [{ name: { $regex: new RegExp(`^${name}$`, 'i') } }, { slug }] 
    });
    
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    const category = await Category.create({ 
      name, 
      description: description || '',
      slug 
    });
    
    console.log('✅ Category created:', name);
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name already exists' });
    }
    console.error('❌ Create category error:', error);
    res.status(500).json({ message: 'Failed to create category' });
  }
};

// Update category (admin)
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    if (name && name !== category.name) {
      // Check if new name already exists
      const existing = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (existing) {
        return res.status(400).json({ message: 'Category name already exists' });
      }
      
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    
    if (description !== undefined) {
      category.description = description;
    }
    
    category.updatedAt = Date.now();
    await category.save();
    
    console.log('✅ Category updated:', category.name);
    res.json(category);
  } catch (error) {
    console.error('❌ Update category error:', error);
    res.status(500).json({ message: 'Failed to update category' });
  }
};

// Delete category (admin)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    console.log('🗑️ Category deleted:', category.name);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('❌ Delete category error:', error);
    res.status(500).json({ message: 'Failed to delete category' });
  }
};