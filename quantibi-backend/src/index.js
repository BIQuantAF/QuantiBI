const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const createError = require('http-errors');
const mongoose = require('mongoose');

// Load environment variables first
dotenv.config();

// Security middleware
const { 
  requestIdMiddleware, 
  helmetConfig, 
  apiLimiter,
  getCorsOptions 
} = require('./middleware/security');

// Routes (require after dotenv.config so env vars are available)
const userRoutes = require('./routes/users');
const workspaceRoutes = require('./routes/workspaces');
const databaseRoutes = require('./routes/databases');
const datasetRoutes = require('./routes/datasets');
const chartRoutes = require('./routes/charts');
const dashboardRoutes = require('./routes/dashboards');
const reportRoutes = require('./routes/reports');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quantibi', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

const app = express();

// Security Middleware (order matters!)
// 1. Request ID tracking - must be first
app.use(requestIdMiddleware);

// 2. Helmet security headers
app.use(helmetConfig);

// 3. CORS configuration
app.use(cors(getCorsOptions()));

// 4. Rate limiting (global API limiter)
// Apply to all routes except webhook (webhook has raw body parser)
app.use('/api', apiLimiter);

// Mount Stripe webhook route BEFORE the JSON body parser so Stripe signature
// verification can access the raw request body. The handler is exported from
// the payments route module as `webhookHandler`.
let paymentRoutes;
try {
  paymentRoutes = require('./routes/payments');
  if (paymentRoutes && paymentRoutes.webhookHandler) {
    app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paymentRoutes.webhookHandler);
  }
} catch (err) {
  // Payment routes optional
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', databaseRoutes);
app.use('/api/workspaces', datasetRoutes);
app.use('/api/workspaces', chartRoutes);
app.use('/api/workspaces', dashboardRoutes);
app.use('/api/workspaces', reportRoutes);
// Payments (not workspace scoped)
if (paymentRoutes) {
  app.use('/api/payments', paymentRoutes);
}

// Error handling
app.use((req, res, next) => {
  next(createError(404, 'Not Found'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
}); 
