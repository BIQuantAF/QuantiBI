# 🚀 QuantiBI Deployment Guide

## **Current Status**
- ✅ **Frontend**: Deployed on Vercel (working)
- 🔄 **Backend**: Needs deployment

## **Deployment Options**

### **Option 1: Vercel + External Backend (Recommended)**

#### **Frontend (Already Working on Vercel)**
Your frontend is already deployed and working on Vercel. You just need to:

1. **Set Environment Variables in Vercel Dashboard:**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add these variables:
     ```
     REACT_APP_API_URL=https://your-backend-url.com/api
     REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     ```

2. **Redeploy Frontend:**
   - Push changes to trigger automatic deployment
   - Or manually redeploy from Vercel dashboard

#### **Backend Deployment Options**

##### **A. Railway (Recommended for MongoDB)**
1. **Sign up at [railway.app](https://railway.app)**
2. **Connect your GitHub repo**
3. **Set Environment Variables:**
   ```
   MONGODB_URI=your_mongodb_atlas_connection_string
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_CLIENT_EMAIL=your_firebase_client_email
   PORT=5000
   ```
4. **Deploy from `quantibi-backend/` directory**

##### **B. Render**
1. **Sign up at [render.com](https://render.com)**
2. **Create new Web Service**
3. **Connect GitHub repo**
4. **Set build command:** `npm install`
5. **Set start command:** `npm start`
6. **Set root directory:** `quantibi-backend`
7. **Add environment variables (same as Railway)**

##### **C. Heroku**
1. **Sign up at [heroku.com](https://heroku.com)**
2. **Install Heroku CLI**
3. **Create new app**
4. **Set environment variables**
5. **Deploy from `quantibi-backend/` directory**

### **Option 2: Full Vercel Deployment (Advanced)**

If you want to deploy everything on Vercel:

1. **Move backend code to frontend directory**
2. **Convert to Vercel serverless functions**
3. **Handle MongoDB connection limitations**
4. **Complex configuration required**

## **Quick Start (Recommended Path)**

1. **Deploy Backend on Railway:**
   ```bash
   # Railway will auto-deploy from your GitHub repo
   # Just set the environment variables in their dashboard
   ```

2. **Update Frontend Environment:**
   - Set `REACT_APP_API_URL` in Vercel dashboard
   - Point to your Railway backend URL

3. **Test:**
   - Frontend: Your Vercel URL
   - Backend: Your Railway URL

## **Environment Variables Reference**

### **Frontend (.env.production)**
```bash
REACT_APP_API_URL=https://your-backend-url.com/api
REACT_APP_FIREBASE_* (all your Firebase config)
```

### **Backend**
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quantibi
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
PORT=5000
```

## **Troubleshooting**

### **Common Issues:**
1. **CORS Errors**: Backend needs proper CORS configuration
2. **MongoDB Connection**: Use MongoDB Atlas for production
3. **Firebase Keys**: Ensure private key includes newlines
4. **Port Issues**: Backend should use `process.env.PORT`

### **Testing:**
1. **Backend Health Check:** `GET /` should return "QuantiBI API is running"
2. **Frontend API Calls:** Check browser console for errors
3. **Authentication:** Test login/signup flow

## **Next Steps**
1. Choose backend hosting platform
2. Deploy backend
3. Update frontend environment variables
4. Test full application
5. Monitor logs and performance
