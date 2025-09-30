# QuantiBI Copilot Instructions

## Architecture Overview

QuantiBI is a full-stack business intelligence platform with AI-powered chart generation. It follows a monorepo structure with separate frontend (React/TypeScript) and backend (Node.js/Express) applications.

### Key Components
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Recharts for visualization
- **Backend**: Express.js with MongoDB (Mongoose) and Firebase Auth
- **AI Integration**: OpenAI API for natural language query processing
- **Data Sources**: BigQuery, PostgreSQL, CSV/XLS files via upload

## Development Patterns

### Authentication Flow
- Firebase Auth on frontend (`src/contexts/AuthContext.tsx`)
- Firebase Admin SDK middleware on backend (`src/middleware/auth.js`)
- All API requests include Bearer token via axios interceptors (`src/services/api.ts`)

### API Structure
- RESTful routes under `/api` prefix
- Route pattern: `/api/workspaces/:workspaceId/[resource]`
- Authentication middleware on all protected routes
- Workspace-scoped access control (owner/member/viewer roles)

### Data Models (MongoDB)
- **Workspace**: Multi-tenant container with member management
- **Database**: Connection configurations for external data sources
- **Dataset**: Virtual or physical table references within databases
- **Chart**: Generated visualizations with AI queries and styling
- **Dashboard**: Collections of charts with grid layout

### Frontend State Management
- React Context for auth (`AuthContext`) and workspace (`WorkspaceContext`)
- No external state management library
- API service class with automatic token injection

## Development Workflow

### Local Development Setup
```bash
# Use the automated installer
install.bat

# Or manually:
cd quantibi-frontend && npm install
cd quantibi-backend && npm install
```

### Key Commands
- Frontend: `npm start` (port 3000)
- Backend: `npm run dev` with nodemon (port 5000)
- Type checking: `npm run type-check` in frontend

### Environment Configuration
- Frontend: `.env` with `REACT_APP_*` prefixed variables
- Backend: `.env` with Firebase Admin SDK credentials and MongoDB URI
- See `env.example` files for required variables

## Code Conventions

### File Organization
- Backend routes: One file per resource type in `src/routes/`
- Frontend components: Organized by feature in `src/components/[feature]/`
- Shared types: Central definition in `src/types/index.ts`

### Error Handling
- Backend: `http-errors` library with consistent error responses
- Frontend: Try-catch blocks with user-friendly error messages
- Auth errors automatically trigger logout via axios interceptors

### AI Chart Generation
- OpenAI integration in `src/routes/charts.js`
- Natural language → SQL query → Chart configuration pipeline
- Supports multiple data source types through unified interface

## Database Integration Patterns

### BigQuery Service
- Dedicated service module: `src/services/bigquery.js`
- Dynamic client creation with stored credentials
- Connection testing before chart generation

### File Upload Handling
- Multer middleware for CSV/XLS processing
- XLSX library for Excel file parsing
- Temporary file storage in `uploads/` directory

## Deployment
- Frontend: Vercel with environment variables
- Backend: Railway with MongoDB Atlas
- See `DEPLOYMENT.md` for detailed deployment instructions

## Key Files to Reference
- API patterns: `src/services/api.ts`
- Auth patterns: `src/middleware/auth.js`, `src/contexts/AuthContext.tsx`
- Data models: `src/models/` directory
- Type definitions: `src/types/index.ts`