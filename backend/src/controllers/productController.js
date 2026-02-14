const { Product, ProductImage, Category } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

exports.createProduct = async (req, res) => {
  try {
    let { 
        category_id, 
        name, 
        description, 
        sku, 
        customer_price, 
        wholesaler_price, 
        stock, 
        status 
    } = req.body;

    const product = await Product.create({
        category_id,
        name,
        description,
        sku,
        customer_price,
        wholesaler_price,
        stock,
        status: (status === 'true' || status === true || status === 'active') ? 'active' : 'inactive',
        created_by: req.admin ? req.admin.id : null
    });

    // Handle main image (is_primary = true)
    if (req.files && req.files['main_image'] && req.files['main_image'][0]) {
        await ProductImage.create({
            product_id: product.id,
            image_url: req.files['main_image'][0].path.replace(/\\/g, "/"),
            is_primary: true,
            sort_order: 0
        });
    }

    // Handle additional product images (is_primary = false)
    if (req.files && req.files['images']) {
        const imagePromises = req.files['images'].map((file, index) => {
            return ProductImage.create({
                product_id: product.id,
                image_url: file.path.replace(/\\/g, "/"),
                is_primary: false,
                sort_order: index + 1
            });
        });
        await Promise.all(imagePromises);
    }

    // Reload product to include images
    const createdProduct = await Product.findByPk(product.id, {
        include: [{ model: ProductImage, as: 'images' }]
    });

    res.status(201).json(createdProduct);
  } catch (error) {
    // Cleanup uploaded files if error
    if (req.files) {
        Object.values(req.files).flat().forEach(file => {
             try { fs.unlinkSync(file.path); } catch(e) {}
        });
    }
    console.error('Error in createProduct:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAllProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    let whereClause = {};

    if (search) {
        whereClause = {
            [Op.or]: [
                { name: { [Op.like]: `%${search}%` } },
                { sku: { [Op.like]: `%${search}%` } }
            ]
        };
    }

    const { count, rows } = await Product.findAndCountAll({
        where: whereClause,
        include: [
            { model: Category, as: 'category' },
            { model: ProductImage, as: 'images' }
        ],
        distinct: true, // Important for correct count with include
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']]
    });
    
    res.json({
        products: rows,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
        include: [
            { model: Category, as: 'category' },
            { model: ProductImage, as: 'images' }
        ]
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { 
        category_id, 
        name, 
        description, 
        sku, 
        customer_price, 
        wholesaler_price, 
        stock, 
        status 
    } = req.body;

    const updates = {};
    if (category_id !== undefined) updates.category_id = category_id;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (sku !== undefined) updates.sku = sku;
    if (customer_price !== undefined) updates.customer_price = customer_price;
    if (wholesaler_price !== undefined) updates.wholesaler_price = wholesaler_price;
    if (stock !== undefined) updates.stock = stock;
    if (status !== undefined) updates.status = (status === 'true' || status === true || status === 'active') ? 'active' : 'inactive';

    // Handle Main Image Update
    if (req.files && req.files['main_image'] && req.files['main_image'][0]) {
        // Find old primary image
        const oldPrimary = await ProductImage.findOne({ 
            where: { product_id: product.id, is_primary: true } 
        });

        if (oldPrimary) {
            // Delete old file
            try { fs.unlinkSync(path.resolve(oldPrimary.image_url)); } catch(e) {}
            // Delete old record
            await oldPrimary.destroy();
        }

        // Create new primary image
        await ProductImage.create({
            product_id: product.id,
            image_url: req.files['main_image'][0].path.replace(/\\/g, "/"),
            is_primary: true,
            sort_order: 0
        });
    }

    await product.update(updates);

    // Handle New Additional Images
    if (req.files && req.files['images']) {
         // Get current max sort order
         const maxSortOrder = await ProductImage.max('sort_order', { where: { product_id: product.id } }) || 0;
         
         const imagePromises = req.files['images'].map((file, index) => {
            return ProductImage.create({
                product_id: product.id,
                image_url: file.path.replace(/\\/g, "/"),
                is_primary: false,
                sort_order: maxSortOrder + index + 1
            });
        });
        await Promise.all(imagePromises);
    }

    // Return updated product with images
    const updatedProduct = await Product.findByPk(product.id, {
        include: [{ model: ProductImage, as: 'images' }]
    });

    res.json(updatedProduct);
  } catch (error) {
    console.error('Error in updateProduct:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: ProductImage, as: 'images' }]
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated images
    if (product.images && product.images.length > 0) {
        product.images.forEach(img => {
            try { fs.unlinkSync(path.resolve(img.image_url)); } catch(e) {}
        });
    }

    // Manually delete images from DB (though cascade delete might work if set up, manual is safer here)
    await ProductImage.destroy({ where: { product_id: product.id } });
    
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.deleteProductImage = async (req, res) => {
  try {
    const imageId = req.params.id;
    const image = await ProductImage.findByPk(imageId);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete file from filesystem
    if (image.image_url) {
        try { fs.unlinkSync(path.resolve(image.image_url)); } catch(e) {}
    }

    await image.destroy();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
