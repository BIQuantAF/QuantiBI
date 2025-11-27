const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const crypto = require('crypto');

/**
 * Generate unique request ID for tracking and debugging
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = crypto.randomBytes(16).toString('hex');
  res.setHeader('X-Request-Id', req.id);
  next();
};

/**
 * Configure Helmet.js security headers
 * https://helmetjs.github.io/
 */
const helmetConfig = helmet({
  // Content Security Policy - prevents XSS attacks
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.FRONTEND_URL || 'http://localhost:3000'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny'
  },
  // Prevent MIME type sniffing
  noSniff: true,
  // Enable XSS filter in older browsers
  xssFilter: true,
  // Hide X-Powered-By header
  hidePoweredBy: true,
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
});

/**
 * Rate limiting configurations
 * Based on rateLimitConfig from validation.js
 */

// Auth endpoints (login, signup, password reset) - strict limits
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMIT_AUTH'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many authentication attempts from this IP. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_AUTH',
      retryAfter: 15 * 60 // seconds
    });
  }
});

// General API endpoints - moderate limits
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    error: 'Too many API requests. Please slow down.',
    code: 'RATE_LIMIT_API'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests from this IP. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_API',
      retryAfter: 15 * 60 // seconds
    });
  }
});

// AI chart generation - strict limits (expensive operations)
const chartGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many chart generation requests. Please wait before trying again.',
    code: 'RATE_LIMIT_CHART_GENERATION'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'You are generating charts too quickly. Please wait 1 minute before trying again.',
      code: 'RATE_LIMIT_CHART_GENERATION',
      retryAfter: 60 // seconds
    });
  }
});

// Report generation - strict limits (expensive OpenAI operations)
const reportGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    error: 'Too many report generation requests. Please wait before trying again.',
    code: 'RATE_LIMIT_REPORT_GENERATION'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'You are generating reports too quickly. Please wait 1 minute before trying again.',
      code: 'RATE_LIMIT_REPORT_GENERATION',
      retryAfter: 60 // seconds
    });
  }
});

// File upload endpoints - moderate limits (prevent abuse)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  message: {
    error: 'Too many file uploads. Please try again later.',
    code: 'RATE_LIMIT_UPLOAD'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many file uploads from this IP. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_UPLOAD',
      retryAfter: 15 * 60 // seconds
    });
  }
});

/**
 * Enhanced CORS configuration for production
 * Restricts origins and adds security headers
 */
const getCorsOptions = () => {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL?.replace(/\/$/, ''), // without trailing slash
    'http://localhost:3000', // Development fallback
    'http://localhost:5173', // Vite development
  ].filter(Boolean);

  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    maxAge: 600, // Cache preflight requests for 10 minutes
    optionsSuccessStatus: 200
  };
};

module.exports = {
  requestIdMiddleware,
  helmetConfig,
  authLimiter,
  apiLimiter,
  chartGenerationLimiter,
  reportGenerationLimiter,
  uploadLimiter,
  getCorsOptions
};
