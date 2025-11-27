const admin = require('firebase-admin');
const createError = require('http-errors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate required fields
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Missing required Firebase Admin SDK credentials');
    throw new Error('Missing required Firebase Admin SDK credentials');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
}

/**
 * Middleware to authenticate requests using Firebase Auth
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Unauthorized - No token provided'));
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Add the user information to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return next(createError(401, 'Unauthorized - Invalid token'));
  }
};

module.exports = {
  authenticateUser,
}; 