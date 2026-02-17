const { Category, Product } = require('../models');
const { Op, fn, col } = require('sequelize');

exports.createCategory = async (req, res) => {
  try {
    let { category_name, slug, status } = req.body;
    
    if (!category_name) {
        return res.status(400).json({ message: 'Category name is required' });
    }

    // Auto-generate slug if not provided
    if (!slug) {
        slug = category_name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    }
    
    // Check if slug exists
    const existingCategory = await Category.findOne({ where: { slug } });
    if (existingCategory) {
        return res.status(400).json({ message: 'Category with this name/slug already exists' });
    }

    const category = await Category.create({
      category_name,
      slug,
      status
    });

    res.status(201).json(category);
  } catch (error) {
    console.error(error); // Log error for debugging
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = {};

    if (search) {
      whereClause = {
        category_name: { [Op.like]: `%${search}%` }
      };
    }

    const { count, rows } = await Category.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [['createdAt', 'DESC']]
    });

    const productCounts = await Product.findAll({
      attributes: ['category_id', [fn('COUNT', col('id')), 'product_count']],
      group: ['category_id']
    });

    const countsMap = {};
    productCounts.forEach((item) => {
      const categoryId = item.category_id;
      const value = item.get('product_count');
      countsMap[categoryId] = typeof value === 'string' ? parseInt(value, 10) : Number(value) || 0;
    });

    rows.forEach((cat) => {
      const countValue = countsMap[cat.id] || 0;
      cat.setDataValue('product_count', countValue);
    });

    res.json({
      categories: rows,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page, 10)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { category_name, slug, status } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Validate slug uniqueness if changed
    if (slug && slug !== category.slug) {
        const existingCategory = await Category.findOne({ where: { slug } });
        if (existingCategory) {
            return res.status(400).json({ message: 'Slug already exists' });
        }
    }

    await category.update({
      category_name,
      slug,
      status
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
