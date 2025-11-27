const { body, param, query, validationResult } = require('express-validator');
const createError = require('http-errors');

/**
 * Middleware to check validation results and return errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg).join(', ');
    return next(createError(400, errorMessages));
  }
  next();
};

/**
 * Validation rules for user signup/login
 */
const validateAuth = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  validate
];

/**
 * Validation rules for workspace creation/update
 */
const validateWorkspace = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Workspace name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'),
  validate
];

/**
 * Validation rules for database connection
 */
const validateDatabaseConnection = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Connection name must be between 1 and 100 characters'),
  body('type')
    .isIn(['PostgreSQL', 'MySQL', 'MongoDB', 'Google BigQuery', 'CSV', 'XLS'])
    .withMessage('Invalid database type'),
  // Conditional validation for BigQuery
  body('projectId')
    .if(body('type').equals('Google BigQuery'))
    .trim()
    .notEmpty()
    .withMessage('Project ID is required for BigQuery'),
  body('credentials')
    .if(body('type').equals('Google BigQuery'))
    .custom((value) => {
      try {
        JSON.parse(value);
        return true;
      } catch (e) {
        throw new Error('Credentials must be valid JSON');
      }
    }),
  validate
];

/**
 * Validation rules for dataset creation
 */
const validateDataset = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Dataset name must be between 1 and 100 characters'),
  body('type')
    .isIn(['Physical', 'Virtual'])
    .withMessage('Dataset type must be Physical or Virtual'),
  body('databaseId')
    .trim()
    .notEmpty()
    .withMessage('Database ID is required')
    .isMongoId()
    .withMessage('Invalid database ID format'),
  validate
];

/**
 * Validation rules for chart creation
 */
const validateChart = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Chart name must be between 1 and 200 characters'),
  body('type')
    .isIn(['bar', 'line', 'pie', 'doughnut', 'scatter', 'area'])
    .withMessage('Invalid chart type'),
  body('data')
    .isObject()
    .withMessage('Chart data must be an object'),
  validate
];

/**
 * Validation rules for AI chart generation
 */
const validateChartGeneration = [
  body('query')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Query must be between 5 and 500 characters'),
  body('datasetId')
    .trim()
    .notEmpty()
    .withMessage('Dataset ID is required')
    .isMongoId()
    .withMessage('Invalid dataset ID format'),
  validate
];

/**
 * Validation rules for dashboard creation
 */
const validateDashboard = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Dashboard name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  validate
];

/**
 * Validation rules for report creation
 */
const validateReport = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Report title must be between 1 and 200 characters'),
  body('datasetId')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid dataset ID format'),
  validate
];

/**
 * Validation rules for MongoDB ObjectId parameters
 */
const validateObjectId = (paramName) => [
  param(paramName)
    .trim()
    .notEmpty()
    .withMessage(`${paramName} is required`)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  validate
];

/**
 * Validation rules for email invitations
 */
const validateInvite = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('role')
    .isIn(['owner', 'member', 'viewer'])
    .withMessage('Role must be owner, member, or viewer'),
  validate
];

/**
 * Validation rules for pagination
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate
];

/**
 * Sanitize string inputs to prevent XSS
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
};

/**
 * Rate limiting configuration
 */
const rateLimitConfig = {
  auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 minutes
  api: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 minutes
  charts: { windowMs: 60 * 1000, max: 10 }, // 10 chart generations per minute
};

module.exports = {
  validate,
  validateAuth,
  validateWorkspace,
  validateDatabaseConnection,
  validateDataset,
  validateChart,
  validateChartGeneration,
  validateDashboard,
  validateReport,
  validateObjectId,
  validateInvite,
  validatePagination,
  sanitizeString,
  rateLimitConfig
};
