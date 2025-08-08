@echo off
echo ===================================
echo QuantiBI Project Setup
echo ===================================

echo.
echo Setting up frontend...
echo.

cd quantibi-frontend
call npm install

echo.
echo Installing required frontend dependencies...
echo.

call npm install firebase react-router-dom @types/react @types/react-dom @types/react-router-dom axios @headlessui/react @heroicons/react

echo.
echo Setting up backend...
echo.

cd ..
cd quantibi-backend
call npm install

echo.
echo Installing required backend dependencies...
echo.

call npm install firebase-admin mongoose jsonwebtoken bcrypt http-errors

echo.
echo Creating .env files with sample configuration...
echo.

echo PORT=5000> .env
echo FIREBASE_PROJECT_ID=your-project-id>> .env
echo FIREBASE_CLIENT_EMAIL=your-client-email>> .env
echo FIREBASE_PRIVATE_KEY="your-private-key">> .env
echo MONGODB_URI=mongodb://localhost:27017/quantibi>> .env

cd ..
cd quantibi-frontend

echo REACT_APP_API_URL=http://localhost:5000/api> .env
echo REACT_APP_FIREBASE_API_KEY=your-api-key>> .env
echo REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain>> .env
echo REACT_APP_FIREBASE_PROJECT_ID=your-project-id>> .env
echo REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket>> .env
echo REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id>> .env
echo REACT_APP_FIREBASE_APP_ID=your-app-id>> .env

echo.
echo Setup complete! Please update the .env files with your actual configuration values.
echo.
echo To start the frontend, run: cd quantibi-frontend && npm start
echo To start the backend, run: cd quantibi-backend && npm start
echo. 