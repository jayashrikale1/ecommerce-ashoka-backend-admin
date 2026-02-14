const { User, Product, Order, OrderItem, Category, AdminUser } = require('../src/models');
const sequelize = require('../src/config/database');

const seedOrders = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Sync database (optional, but ensures tables exist)
    await sequelize.sync();

    // 1. Ensure we have a category
    let category = await Category.findOne();
    if (!category) {
        category = await Category.create({
            category_name: 'General',
            status: 'active'
        });
        console.log('Created dummy category.');
    }

    // 2. Ensure we have an admin user (for product creator)
    let admin = await AdminUser.findOne();
    if (!admin) {
        // Create a dummy admin if none exists (though usually seeded elsewhere)
        // Just skipping product creator if strict FK not needed or use a dummy ID if allowed
        // But let's try to create one if table exists
        try {
            admin = await AdminUser.create({
                name: 'Admin',
                email: 'admin@example.com',
                password: 'password', // hashing skipped for seed
                role: 'admin'
            });
             console.log('Created dummy admin.');
        } catch (e) {
            console.log('Skipping admin creation (might already exist or schema mismatch).');
        }
    }

    // 3. Ensure we have products
    let products = await Product.findAll();
    if (products.length < 3) {
        const newProducts = await Product.bulkCreate([
            {
                name: 'Organic Wheat Flour',
                description: 'Premium quality organic wheat flour',
                sku: 'WHEAT-001',
                category_id: category.id,
                customer_price: 50.00,
                wholesaler_price: 40.00,
                stock: 100,
                created_by: admin ? admin.id : null,
                status: 'active'
            },
            {
                name: 'Basmati Rice',
                description: 'Aromatic long grain basmati rice',
                sku: 'RICE-001',
                category_id: category.id,
                customer_price: 120.00,
                wholesaler_price: 100.00,
                stock: 200,
                created_by: admin ? admin.id : null,
                status: 'active'
            },
            {
                name: 'Toor Dal',
                description: 'High protein split pigeon peas',
                sku: 'DAL-001',
                category_id: category.id,
                customer_price: 150.00,
                wholesaler_price: 130.00,
                stock: 150,
                created_by: admin ? admin.id : null,
                status: 'active'
            }
        ]);
        products = [...products, ...newProducts];
        console.log('Created dummy products.');
    }

    // 4. Ensure we have a customer
    let user = await User.findOne({ where: { email: 'testcustomer@example.com' } });
    if (!user) {
        user = await User.create({
            name: 'Test Customer',
            email: 'testcustomer@example.com',
            phone: '9876543210',
            status: 'active'
        });
        console.log('Created dummy customer.');
    }

    // 5. Create Dummy Orders
    const orderStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    const paymentStatuses = ['pending', 'paid', 'failed'];

    const ordersToCreate = [];

    for (let i = 0; i < 15; i++) {
        const randomStatus = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const randomPaymentStatus = paymentStatuses[Math.floor(Math.random() * paymentStatuses.length)];
        
        // Random items
        const numItems = Math.floor(Math.random() * 3) + 1; // 1 to 3 items
        const orderItems = [];
        let totalAmount = 0;

        for (let j = 0; j < numItems; j++) {
            const product = products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const price = parseFloat(product.customer_price);
            
            orderItems.push({
                product_id: product.id,
                product_name: product.name,
                quantity: quantity,
                price: price
            });
            totalAmount += price * quantity;
        }

        ordersToCreate.push({
            customer_id: user.id,
            total_amount: totalAmount,
            status: randomStatus,
            shipping_address: '123 Test St, Dummy City, 400001',
            payment_method: 'cod',
            payment_status: randomPaymentStatus,
            items: orderItems
        });
    }

    // Create orders with items
    for (const orderData of ordersToCreate) {
        const { items, ...orderFields } = orderData;
        const order = await Order.create(orderFields);
        
        for (const item of items) {
            await OrderItem.create({
                ...item,
                order_id: order.id
            });
        }
    }

    console.log(`Successfully created ${ordersToCreate.length} dummy orders.`);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await sequelize.close();
  }
};

seedOrders();
