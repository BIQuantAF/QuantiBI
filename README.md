# QuantiBI

QuantiBI is a business intelligence web application designed for game companies and other businesses to easily query databases and generate insightful visualizations using plain language. It eliminates the need for data analysts by integrating AI to interpret user queries and automatically generate SQL queries and charts.

## Project Structure

This project consists of two main parts:

1. **Frontend**: React.js application with Tailwind CSS
2. **Backend**: Node.js/Express.js API server

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB (for backend database)
- Firebase account (for authentication)

## Setup Instructions

### Automated Setup (Windows)

1. Run the installation script:
   ```
   install.bat
   ```

2. Update the environment variables in both `.env` files with your actual Firebase and MongoDB configuration.

### Manual Setup

#### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd quantibi-frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install additional required packages:
   ```
   npm install firebase react-router-dom @types/react @types/react-dom @types/react-router-dom axios @headlessui/react @heroicons/react
   ```

4. Create a `.env` file with the following content:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

#### Backend Setup

1. Navigate to the backend directory:
   ```
   cd quantibi-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install additional required packages:
   ```
   npm install firebase-admin mongoose jsonwebtoken bcrypt http-errors
   ```

4. Create a `.env` file with the following content:
   ```
   PORT=5000
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=your-client-email
   FIREBASE_PRIVATE_KEY="your-private-key"
   MONGODB_URI=mongodb://localhost:27017/quantibi
   ```

## Running the Application

### Frontend

```
cd quantibi-frontend
npm start
```

The frontend will be available at http://localhost:3000

### Backend

```
cd quantibi-backend
npm start
```

The backend API will be available at http://localhost:5000

## Testing

### Authentication Testing

You can test the authentication flow by opening the browser console and running:

```javascript
import testAuth from './utils/testAuth';
testAuth.runTests();
```

This will:
1. Create a test user (if it doesn't exist)
2. Sign in the test user
3. Make an authenticated API call to get the user's information
4. Sign out the user

### Workspace Management Testing

You can test the workspace management features by opening the browser console and running:

```javascript
import testWorkspace from './utils/testWorkspace';
testWorkspace.runTests();
```

This will:
1. Create a test workspace
2. Fetch all workspaces
3. Get the specific test workspace
4. Update the workspace details
5. Invite a test user
6. Remove the test user (if they were added as a member)

### API Testing with Postman/Insomnia

You can test the API endpoints using Postman or Insomnia. Here's a collection of endpoints to test:

#### Authentication
- `POST /api/users/signup` - Create a new user
- `POST /api/users/login` - Sign in a user
- `POST /api/users/forgot-password` - Request password reset
- `GET /api/users/me` - Get current user info
- `PUT /api/users/me` - Update user profile

#### Workspaces
- `GET /api/workspaces` - Get all workspaces
- `POST /api/workspaces` - Create a new workspace
- `GET /api/workspaces/:id` - Get a specific workspace
- `PUT /api/workspaces/:id` - Update a workspace
- `DELETE /api/workspaces/:id` - Delete a workspace
- `POST /api/workspaces/:id/invite` - Invite a user to a workspace
- `DELETE /api/workspaces/:id/members/:memberId` - Remove a member from a workspace

Remember to:
1. Include the Firebase ID token in the Authorization header for all requests
2. Set the Content-Type header to application/json for POST/PUT requests
3. Send request bodies in JSON format

## Project Phases

The QuantiBI project is being developed in phases:

1. **Phase 1: Foundation and User Authentication** (Current)
   - Project setup
   - User authentication
   - Basic navigation

2. **Phase 2: Workspaces and Data Connections**
   - Workspaces management
   - Database connection functionality
   - Dataset management

3. **Phase 3: Core Visualization Features**
   - Chart creation with AI assistance
   - Dashboard management
   - Data visualization

4. **Phase 4: Enhancement and Advanced Features**
   - Advanced AI querying
   - User permissions & access control
   - Additional features 