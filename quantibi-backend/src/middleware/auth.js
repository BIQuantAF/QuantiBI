const admin = require('firebase-admin');
const createError = require('http-errors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin SDK...');
  console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Missing');
  console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Missing');
  console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Missing');
  
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate required fields
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    console.error('Missing Firebase Admin SDK credentials:');
    console.error('- FIREBASE_PROJECT_ID:', !!serviceAccount.projectId);
    console.error('- FIREBASE_CLIENT_EMAIL:', !!serviceAccount.clientEmail);
    console.error('- FIREBASE_PRIVATE_KEY:', !!serviceAccount.privateKey);
    throw new Error('Missing required Firebase Admin SDK credentials');
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Firebase Admin SDK initialized successfully');
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
    console.log('🔐 Authenticating request...');
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token provided');
      return next(createError(401, 'Unauthorized - No token provided'));
    }

    const idToken = authHeader.split('Bearer ')[1];
    console.log('🔑 Token received, length:', idToken.length);
    
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('✅ Token verified for user:', decodedToken.email);
    
    // Add the user information to the request object
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
    
    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return next(createError(401, 'Unauthorized - Invalid token'));
  }
};

module.exports = {
  authenticateUser,
}; 