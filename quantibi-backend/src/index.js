const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const createError = require('http-errors');
const mongoose = require('mongoose');

// Routes
const userRoutes = require('./routes/users');
const workspaceRoutes = require('./routes/workspaces');
const databaseRoutes = require('./routes/databases');
const datasetRoutes = require('./routes/datasets');
const chartRoutes = require('./routes/charts');
const dashboardRoutes = require('./routes/dashboards');

// Load environment variables
dotenv.config();

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

// Middleware
app.use(helmet());

// CORS configuration with flexible origin handling
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      // Handle both with and without trailing slash
      process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000',
      process.env.FRONTEND_URL?.endsWith('/') ? process.env.FRONTEND_URL : `${process.env.FRONTEND_URL}/` || 'http://localhost:3000'
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      console.log('Allowed origins:', allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'QuantiBI API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing'
    }
  });
});

// Test endpoint without authentication
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    headers: {
      authorization: req.headers.authorization ? 'Present' : 'Missing'
    }
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces', databaseRoutes);
app.use('/api/workspaces', datasetRoutes);
app.use('/api/workspaces', chartRoutes);
app.use('/api/workspaces', dashboardRoutes);

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
