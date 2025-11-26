import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import SignUp from './components/auth/SignUp';
import PasswordReset from './components/auth/PasswordReset';
import Workspaces from './components/workspaces/Workspaces';
import WorkspaceHome from './components/workspace/WorkspaceHome';
import Datasets from './components/datasets/Datasets';
import Charts from './components/charts/Charts';
import CreateChart from './components/charts/CreateChart';
import Dashboards from './components/dashboards/Dashboards';
import DashboardView from './components/dashboards/DashboardView';
import Reports from './components/reports/Reports';
import ReportPage from './components/reports/ReportPage';
import PublicReportPage from './components/reports/PublicReportPage';
import WorkspaceSettings from './components/workspace/WorkspaceSettings';
import Navigation from './components/common/Navigation';
import EditChart from './components/charts/EditChart';
import ProtectedRoute from './components/common/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import './App.css';
import UpgradeModal from './components/common/UpgradeModal';

console.log('🚀 App.tsx: This file is being executed!');
console.log('🚀 App.tsx: React version:', React.version);

const App: React.FC = () => {
  console.log('🚀 App: Component is rendering!');

  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Router>
          <div className="App min-h-screen bg-gray-50">
            <UpgradeModal />
            <Routes>
              {/* Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/password-reset" element={<PasswordReset />} />
              
              {/* Protected Routes */}
              <Route path="/workspaces" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <Workspaces />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <WorkspaceHome />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/datasets" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <Datasets />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/charts" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <Charts />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/charts/create" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <CreateChart />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/charts/:chartId/edit" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <EditChart />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/dashboards" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <Dashboards />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/dashboards/:dashboardId" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <DashboardView />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspace/:workspaceId/reports" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <Reports />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/workspaces/:workspaceId/reports/:reportId" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <ReportPage />
                  </div>
                </ProtectedRoute>
              } />
              <Route path="/report/:shareToken" element={
                <PublicReportPage />
              } />
              <Route path="/workspace/:workspaceId/settings" element={
                <ProtectedRoute>
                  <div>
                    <Navigation />
                    <WorkspaceSettings />
                  </div>
                </ProtectedRoute>
              } />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </WorkspaceProvider>
    </AuthProvider>
  );
};

export default App;
