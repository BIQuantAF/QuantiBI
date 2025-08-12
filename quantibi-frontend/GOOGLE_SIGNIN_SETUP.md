# Google Sign-In Setup for QuantiBI

## Firebase Console Configuration

### 1. Enable Google Sign-In Provider
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (quantibi)
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google** provider
5. Click **Enable**
6. Add your **Project support email**
7. Click **Save**

### 2. Add Authorized Domains
1. In **Authentication** → **Settings** → **Authorized domains**
2. Add the following domains:
   - `localhost` (for development)
   - Your production domain when deployed

### 3. Configure OAuth Consent Screen (if needed)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**
4. Configure the consent screen if not already done

## Features Implemented

### ✅ Login Page
- Email/Password authentication
- Google Sign-In button
- Error handling
- Loading states
- Responsive design

### ✅ Sign Up Page
- Email/Password registration
- Google Sign-In button
- Password confirmation
- Validation
- Error handling

### ✅ Navigation
- Shows current user's email
- Logout functionality
- Clean, professional design

## How It Works

1. **Google Sign-In Button**: Click to open Google's OAuth popup
2. **User Selection**: User chooses their Google account
3. **Authentication**: Firebase handles the OAuth flow
4. **User Creation**: If new user, account is automatically created
5. **Session Management**: User is logged in and redirected to workspaces

## Security Features

- ✅ Firebase handles all OAuth security
- ✅ Automatic token refresh
- ✅ Secure session management
- ✅ Protected routes
- ✅ Proper error handling

## Testing

1. **Development**: Works on `localhost:3000`
2. **Production**: Will work on your authorized domains
3. **Multiple Accounts**: Users can switch between Google accounts

## Troubleshooting

### Common Issues:
1. **"popup_closed_by_user"**: User closed the popup
2. **"unauthorized_domain"**: Domain not in authorized list
3. **"popup_blocked"**: Browser blocked the popup

### Solutions:
1. Check authorized domains in Firebase
2. Ensure popup blockers are disabled
3. Verify Firebase configuration in `.env` file

## Next Steps

With Google Sign-In working, you can now:
1. **Test the authentication flow**
2. **Move to Phase 2**: Workspace Management
3. **Add more OAuth providers** (GitHub, Microsoft, etc.)
4. **Implement user profile management**
