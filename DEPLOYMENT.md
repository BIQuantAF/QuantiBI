# QuantiBI Deployment Guide

This guide explains how to deploy QuantiBI with the frontend on Vercel and backend on Railway.

## Prerequisites

- Vercel account
- Railway account
- MongoDB database (MongoDB Atlas recommended)
- Firebase project for authentication

## Backend Deployment (Railway)

### 1. Deploy to Railway

1. Connect your GitHub repository to Railway
2. Select the `quantibi-backend` directory
3. Railway will automatically detect it's a Node.js project

### 2. Configure Environment Variables

In your Railway project dashboard, add these environment variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/quantibi
FRONTEND_URL=https://your-vercel-app-name.vercel.app
```

### 3. Get Your Railway URL

After deployment, Railway will provide a URL like:
`https://your-app-name.railway.app`

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Set the root directory to `quantibi-frontend`
3. Vercel will automatically detect it's a React project

### 2. Configure Environment Variables

In your Vercel project dashboard, go to Settings → Environment Variables and add:

```
REACT_APP_API_URL=https://your-railway-app-name.railway.app/api
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 3. Get Your Vercel URL

After deployment, Vercel will provide a URL like:
`https://your-app-name.vercel.app`

## Connection Verification

### 1. Test Backend Health

Visit your Railway URL directly:
```
https://your-railway-app-name.railway.app/
```

You should see:
```json
{
  "message": "QuantiBI API is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

### 2. Test Frontend-Backend Connection

1. Open your Vercel app
2. Open browser developer tools (F12)
3. Go to Network tab
4. Try to log in or perform any action
5. Check that API calls are going to your Railway URL

### 3. Common Issues and Solutions

#### CORS Errors
- Ensure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check that the URL includes `https://` protocol

#### 404 Errors
- Verify your Railway app is running
- Check that the API endpoints are correct
- Ensure the `/api` prefix is included in `REACT_APP_API_URL`

#### Authentication Issues
- Verify Firebase configuration is correct
- Check that Firebase project settings allow your Vercel domain

## Environment Variables Reference

### Backend (Railway)
| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `FRONTEND_URL` | Vercel app URL | `https://app.vercel.app` |

### Frontend (Vercel)
| Variable | Description | Example |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Railway API URL | `https://app.railway.app/api` |
| `REACT_APP_FIREBASE_*` | Firebase configuration | See Firebase console |

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to your repository
2. **CORS**: Only allow your Vercel domain in Railway CORS settings
3. **Firebase**: Configure Firebase Auth to only allow your Vercel domain
4. **MongoDB**: Use connection string with username/password authentication

## Monitoring

### Railway
- Check Railway dashboard for app status
- Monitor logs for errors
- Set up alerts for downtime

### Vercel
- Check Vercel dashboard for build status
- Monitor function execution times
- Set up analytics if needed

## Troubleshooting

### Backend Issues
1. Check Railway logs for errors
2. Verify MongoDB connection
3. Test API endpoints directly
4. Check environment variables

### Frontend Issues
1. Check Vercel build logs
2. Verify environment variables
3. Test API calls in browser console
4. Check Firebase configuration

### Connection Issues
1. Verify URLs are correct
2. Check CORS configuration
3. Test with Postman or curl
4. Ensure both services are running
