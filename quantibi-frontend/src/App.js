import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import PasswordReset from './components/auth/PasswordReset';
import Workspaces from './components/workspaces/Workspaces';
import WorkspaceHome from './components/workspace/WorkspaceHome';
import Datasets from './components/datasets/Datasets';
import Charts from './components/charts/Charts';
import Dashboards from './components/dashboards/Dashboards';
import WorkspaceSettings from './components/workspace/WorkspaceSettings';
import Navigation from './components/common/Navigation';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              
              {/* Protected Routes */}
              <Route path="/workspaces" element={
                <div>
                  <Navigation />
                  <Workspaces />
                </div>
              } />
              <Route path="/workspace/:workspaceId" element={
                <div>
                  <Navigation />
                  <WorkspaceHome />
                </div>
              } />
              <Route path="/workspace/:workspaceId/datasets" element={
                <div>
                  <Navigation />
                  <Datasets />
                </div>
              } />
              <Route path="/workspace/:workspaceId/charts" element={
                <div>
                  <Navigation />
                  <Charts />
                </div>
              } />
              <Route path="/workspace/:workspaceId/dashboards" element={
                <div>
                  <Navigation />
                  <Dashboards />
                </div>
              } />
              <Route path="/workspace/:workspaceId/settings" element={
                <div>
                  <Navigation />
                  <WorkspaceSettings />
                </div>
              } />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
