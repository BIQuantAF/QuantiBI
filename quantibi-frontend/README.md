# QuantiBI Frontend

This is the frontend application for QuantiBI, a business intelligence platform powered by AI.

## Features

- **Authentication**: Login, signup, and password reset functionality
- **Workspace Management**: Create and manage workspaces
- **Dataset Management**: Connect databases and manage datasets
- **Chart Creation**: AI-powered chart generation with natural language queries
- **Dashboard Management**: Create and manage dashboards
- **User Management**: Invite team members and manage permissions

## Tech Stack

- **React.js**: Frontend framework
- **Tailwind CSS**: Styling framework
- **React Router**: Client-side routing
- **Recharts**: Charting library
- **Axios**: HTTP client
- **Firebase**: Authentication (planned)

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### Available Scripts

- `npm start`: Runs the app in development mode
- `npm test`: Launches the test runner
- `npm run build`: Builds the app for production
- `npm run eject`: Ejects from Create React App (not recommended)

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication components
│   ├── common/         # Shared components
│   ├── workspace/      # Workspace-related components
│   ├── datasets/       # Dataset management components
│   ├── charts/         # Chart creation components
│   └── dashboards/     # Dashboard components
├── contexts/           # React contexts for state management
├── App.js             # Main App component
├── index.js           # Application entry point
└── index.css          # Global styles
```

## Development

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary software.
