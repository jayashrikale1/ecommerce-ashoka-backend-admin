require('dotenv').config();
const app = require('./src/app');
const sequelize = require('./src/config/database');
const { Op } = require('sequelize');
const { Coupon, Review, Product, User, Wholesaler, CommunicationLog, Category, ProductImage } = require('./src/models');

const PORT = process.env.PORT || 5000;

// Sync Database and Start Server
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    
    // Sync models (non-destructive). Use migrations in production.
    await sequelize.sync();
    console.log('Database synced.');

    // Seed dummy coupons if none exist
    try {
      const count = await Coupon.count();
      if (count === 0) {
        await Coupon.bulkCreate([
          {
            code: 'SAVE10',
            discount_type: 'percentage',
            discount_value: 10,
            min_order_value: 500,
            usage_limit: 100,
            start_date: new Date(),
            end_date: null,
            active: true
          },
          {
            code: 'FLAT100',
            discount_type: 'fixed',
            discount_value: 100,
            min_order_value: 800,
            usage_limit: 50,
            start_date: new Date(),
            end_date: null,
            active: true
          },
          {
            code: 'NEWUSER15',
            discount_type: 'percentage',
            discount_value: 15,
            min_order_value: 0,
            usage_limit: 1000,
            start_date: new Date(),
            end_date: null,
            active: true
          },
          {
            code: 'BIGSAVE25',
            discount_type: 'percentage',
            discount_value: 25,
            min_order_value: 2000,
            usage_limit: 25,
            start_date: new Date(),
            end_date: null,
            active: false
          }
        ]);
        console.log('Seeded dummy coupons.');
      } else {
        console.log(`Coupons already present (${count}), skipping seed.`);
      }
    } catch (seedErr) {
      console.log('Coupon seed failed:', seedErr.message);
    }

    // Seed dummy reviews if none exist
    try {
      const reviewCount = await Review.count();
      if (reviewCount === 0) {
        const products = await Product.findAll({ limit: 3, order: [['id', 'ASC']] });
        const customers = await User.findAll({ limit: 3, order: [['id', 'ASC']] });
        const wholesalers = await Wholesaler.findAll({ limit: 2, order: [['id', 'ASC']] });

        if (products.length === 0) {
          console.log('No products found, skipping review seed.');
        } else {
          const data = [];
          // Customer reviews
          if (customers.length > 0) {
            data.push({
              product_id: products[0].id,
              customer_id: customers[0].id,
              rating: 5,
              comment: 'Excellent product quality and fast delivery!',
              status: 'approved'
            });
            if (products[1]) {
              data.push({
                product_id: products[1].id,
                customer_id: customers[0].id,
                rating: 4,
                comment: 'Good value for money.',
                status: 'pending'
              });
            }
            if (products[2] && customers[1]) {
              data.push({
                product_id: products[2].id,
                customer_id: customers[1].id,
                rating: 2,
                comment: 'Packaging was damaged on arrival.',
                status: 'rejected'
              });
            }
          }
          // Wholesaler reviews
          if (wholesalers.length > 0) {
            data.push({
              product_id: products[0].id,
              wholesaler_id: wholesalers[0].id,
              rating: 5,
              comment: 'Bulk order went smoothly, consistent quality.',
              status: 'approved'
            });
            if (products[1] && wholesalers[1]) {
              data.push({
                product_id: products[1].id,
                wholesaler_id: wholesalers[1].id,
                rating: 3,
                comment: 'Average experience, stock levels should improve.',
                status: 'pending'
              });
            }
          }

          if (data.length > 0) {
            await Review.bulkCreate(data);
            console.log(`Seeded ${data.length} dummy reviews.`);
          } else {
            console.log('No users/wholesalers found to attach reviews, skipping review seed.');
          }
        }
      } else {
        console.log(`Reviews already present (${reviewCount}), skipping seed.`);
      }
    } catch (seedErr) {
      console.log('Review seed failed:', seedErr.message);
    }

    // Seed dummy besan products if fewer than 10 exist
    try {
      const besanCount = await Product.count({
        where: {
          name: { [Op.like]: '%Besan%' }
        }
      });

      if (besanCount < 10) {
        const [besanCategory] = await Category.findOrCreate({
          where: { category_name: 'Besan & Gram Flour' },
          defaults: {
            slug: 'besan-gram-flour',
            status: true
          }
        });

        const existingBesanProducts = await Product.findAll({
          where: {
            name: { [Op.like]: '%Besan%' }
          }
        });
        const existingNames = new Set(existingBesanProducts.map(p => p.name));

        const besanProductsData = [
          { name: 'Premium Chana Besan 500g', sku: 'BESAN-500', customer_price: 60.0, wholesaler_price: 50.0, stock: 120 },
          { name: 'Premium Chana Besan 1kg', sku: 'BESAN-1KG', customer_price: 110.0, wholesaler_price: 95.0, stock: 100 },
          { name: 'Fine Gram Flour 500g', sku: 'GRAM-500', customer_price: 55.0, wholesaler_price: 46.0, stock: 90 },
          { name: 'Fine Gram Flour 1kg', sku: 'GRAM-1KG', customer_price: 105.0, wholesaler_price: 90.0, stock: 85 },
          { name: 'Roasted Besan 500g', sku: 'RBESAN-500', customer_price: 65.0, wholesaler_price: 54.0, stock: 80 },
          { name: 'Roasted Besan 1kg', sku: 'RBESAN-1KG', customer_price: 120.0, wholesaler_price: 100.0, stock: 70 },
          { name: 'Superfine Besan for Sweets 500g', sku: 'SBESAN-500', customer_price: 75.0, wholesaler_price: 62.0, stock: 60 },
          { name: 'Superfine Besan for Sweets 1kg', sku: 'SBESAN-1KG', customer_price: 135.0, wholesaler_price: 115.0, stock: 55 },
          { name: 'Low Oil Absorb Besan 500g', sku: 'LOBESAN-500', customer_price: 70.0, wholesaler_price: 58.0, stock: 65 },
          { name: 'Low Oil Absorb Besan 1kg', sku: 'LOBESAN-1KG', customer_price: 130.0, wholesaler_price: 112.0, stock: 50 }
        ];

        const productsToCreate = besanProductsData.filter(p => !existingNames.has(p.name));

        if (productsToCreate.length > 0) {
          const createdProducts = await Product.bulkCreate(
            productsToCreate.map(p => ({
              ...p,
              category_id: besanCategory.id,
              description: 'High-quality besan made from select chana dal, ideal for snacks and sweets.',
              status: 'active'
            }))
          );

          const imageUrls = [
            'https://via.placeholder.com/300x300.png?text=Premium+Besan',
            'https://via.placeholder.com/300x300.png?text=Fine+Gram+Flour',
            'https://via.placeholder.com/300x300.png?text=Roasted+Besan',
            'https://via.placeholder.com/300x300.png?text=Superfine+Besan',
            'https://via.placeholder.com/300x300.png?text=Low+Oil+Besan'
          ];

          for (let i = 0; i < createdProducts.length; i++) {
            const product = createdProducts[i];
            const imageUrl = imageUrls[i % imageUrls.length];

            await ProductImage.create({
              product_id: product.id,
              image_url: imageUrl,
              is_primary: true,
              sort_order: 0
            });
          }

          console.log(`Seeded ${createdProducts.length} besan products with images.`);
        } else {
          console.log('Besan products already present, skipping seed.');
        }
      } else {
        console.log(`Besan products already present (${besanCount}), skipping seed.`);
      }
    } catch (seedErr) {
      console.log('Besan products seed failed:', seedErr.message);
    }

    // Seed communication logs (dummy)
    try {
      const logsCount = await CommunicationLog.count();
      if (logsCount === 0) {
        const someUsers = await User.findAll({ limit: 2, order: [['id', 'ASC']] });
        const someWholesalers = await Wholesaler.findAll({ limit: 2, order: [['id', 'ASC']] });
        const logs = [];
        if (someUsers[0]) {
          logs.push({
            entity_type: 'user',
            entity_id: someUsers[0].id,
            channel: 'email',
            subject: 'Welcome to Ashoka',
            message: 'Your account has been created.',
            status: 'sent',
            meta: { category: 'onboarding' }
          });
        }
        if (someUsers[1]) {
          logs.push({
            entity_type: 'user',
            entity_id: someUsers[1].id,
            channel: 'sms',
            subject: null,
            message: 'Your OTP is 123456',
            status: 'sent',
            meta: { category: 'otp' }
          });
        }
        if (someWholesalers[0]) {
          logs.push({
            entity_type: 'wholesaler',
            entity_id: someWholesalers[0].id,
            channel: 'email',
            subject: 'Verification Pending',
            message: 'Please provide GST documentation.',
            status: 'sent',
            meta: { category: 'verification' }
          });
        }
        if (logs.length > 0) {
          await CommunicationLog.bulkCreate(logs);
          console.log(`Seeded ${logs.length} communication logs.`);
        } else {
          console.log('No users/wholesalers to seed communication logs.');
        }
      } else {
        console.log(`Communication logs already present (${logsCount}), skipping seed.`);
      }
    } catch (seedErr) {
      console.log('Communication logs seed failed:', seedErr.message);
    }

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

startServer();
