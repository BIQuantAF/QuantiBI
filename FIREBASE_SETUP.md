# Firebase Admin SDK Setup for Railway

## Problem
The 500 error you're seeing is likely due to missing Firebase Admin SDK credentials in your Railway environment variables.

## Solution

### 1. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Go to **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file

### 2. Extract Required Values

From the downloaded JSON file, you need these values:

```json
{
  "project_id": "your-project-id",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

### 3. Set Railway Environment Variables

In your Railway dashboard:

1. Go to your backend project
2. Click **Variables** tab
3. Add these environment variables:

```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

### 4. Important Notes

- **Private Key**: Copy the entire private key including the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` parts
- **Newlines**: The private key should contain `\n` characters for line breaks
- **No Quotes**: Don't wrap the values in quotes

### 5. Verify Setup

After setting the variables:

1. Railway will automatically redeploy
2. Check the Railway logs for these messages:
   ```
   Initializing Firebase Admin SDK...
   FIREBASE_PROJECT_ID: Set
   FIREBASE_CLIENT_EMAIL: Set
   FIREBASE_PRIVATE_KEY: Set
   Firebase Admin SDK initialized successfully
   ```

### 6. Test Authentication

Once deployed, try logging in again. You should see:
```
🔐 Authenticating request...
🔑 Token received, length: [number]
✅ Token verified for user: [email]
```

## Troubleshooting

### If you still get 500 errors:

1. **Check Railway logs** for Firebase initialization errors
2. **Verify environment variables** are set correctly
3. **Ensure private key** includes all newlines (`\n`)
4. **Check Firebase project** is the same as your frontend

### Common Issues:

- **Missing private key**: The private key is required for server-side authentication
- **Wrong project ID**: Must match your Firebase project
- **Malformed private key**: Must include proper formatting with `\n`

## Security Notes

- Never commit the service account JSON file to git
- The private key is sensitive - keep it secure
- Railway encrypts environment variables automatically
