import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const Navigation: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const { currentWorkspace, clearWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSettings = () => {
    if (currentWorkspace) {
      navigate(`/workspace/${currentWorkspace._id}/settings`);
    }
  };

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const getWorkspacePath = (path: string) => {
    return currentWorkspace ? `/workspace/${currentWorkspace._id}${path}` : '/workspaces';
  };

  return (
    <nav className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                to={location.pathname === '/workspaces' ? '/workspaces' : (currentWorkspace ? `/workspace/${currentWorkspace._id}` : '/workspaces')}
                className="text-xl font-bold text-indigo-600"
              >
                QuantiBI
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {location.pathname === '/workspaces' ? (
                <Link
                  to="/workspaces"
                  onClick={() => clearWorkspace()}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/workspaces')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Home
                </Link>
              ) : currentWorkspace ? (
                <Link
                  to={`/workspace/${currentWorkspace._id}`}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/workspace')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Home
                </Link>
              ) : (
                <Link
                  to="/workspaces"
                  onClick={() => clearWorkspace()}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive('/workspaces')
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Home
                </Link>
              )}
              {currentWorkspace && location.pathname !== '/workspaces' && (
                <>
                  <Link
                    to={getWorkspacePath('/dashboards')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/dashboards')
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Dashboards
                  </Link>
                  <Link
                    to={getWorkspacePath('/charts')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/charts')
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Charts
                  </Link>
                  <Link
                    to={getWorkspacePath('/datasets')}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive('/datasets')
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    Datasets
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {currentUser && (
              <div className="text-sm text-gray-700">
                Signed in as: <span className="font-medium">{currentUser.email}</span>
              </div>
            )}
            {currentWorkspace && (
              <>
                <button
                  onClick={handleSettings}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Settings
                </button>
                <button
                  onClick={() => { clearWorkspace(); navigate('/workspaces'); }}
                  className="px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  style={{ marginLeft: '8px' }}
                >
                  Workspaces
                </button>
              </>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
