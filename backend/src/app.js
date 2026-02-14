const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userAuthRoutes = require('./routes/userAuthRoutes');
const userRoutes = require('./routes/userRoutes');
const wholesalerAuthRoutes = require('./routes/wholesalerAuthRoutes');
const wholesalerRoutes = require('./routes/wholesalerRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads')); // Serve uploaded files

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/user-auth', userAuthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wholesaler-auth', wholesalerAuthRoutes);
app.use('/api/wholesalers', wholesalerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);

// Swagger Config
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Ecommerce Ashoka Backend API',
      version: '1.0.0',
      description: 'API documentation for Ecommerce Ashoka Backend Admin Panel',
    },
    tags: [
      { name: 'Admin', description: 'Admin authentication, management, and dashboard' },
      { name: 'User', description: 'Customer authentication and profile' },
      { name: 'Wholesaler', description: 'Wholesaler authentication and profile' },
      { name: 'Payment', description: 'Payment Gateway Integration (Razorpay)' },
    ],
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Basic Route
app.get('/', (req, res) => {
  res.send('Ecommerce Ashoka Backend API is running. Check /api-docs for documentation.');
});

// Sync models is handled in index.js
// sequelize.sync({ alter: true }).then(() => {
//   console.log('Database synced.');
// });

module.exports = app;
