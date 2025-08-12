import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navigation from './components/common/Navigation';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import PasswordReset from './components/auth/PasswordReset';
import Workspaces from './components/workspaces/Workspaces';
import WorkspaceHome from './components/workspace/WorkspaceHome';
import Datasets from './components/datasets/Datasets';
import Charts from './components/charts/Charts';
import Dashboards from './components/dashboards/Dashboards';
import WorkspaceSettings from './components/workspace/WorkspaceSettings';
import './App.css';

const AppRoutes: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={currentUser ? <Navigate to="/workspaces" replace /> : <Login />} />
      <Route path="/signup" element={currentUser ? <Navigate to="/workspaces" replace /> : <SignUp />} />
      <Route path="/password-reset" element={currentUser ? <Navigate to="/workspaces" replace /> : <PasswordReset />} />
      
      {/* Protected routes */}
      <Route path="/" element={<Navigate to="/workspaces" replace />} />
      <Route
        path="/workspaces"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <Workspaces />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <WorkspaceHome />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/datasets"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <Datasets />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/charts"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <Charts />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/dashboards"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <Dashboards />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/settings"
        element={
          <ProtectedRoute>
            <WorkspaceProvider>
              <div className="min-h-screen bg-gray-50">
                <Navigation />
                <WorkspaceSettings />
              </div>
            </WorkspaceProvider>
          </ProtectedRoute>
        }
      />
      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/workspaces" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App;
