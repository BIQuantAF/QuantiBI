import React, { useEffect, useState } from 'react';
import { Database, Chart, Dashboard } from '../../types/index';
import { apiService } from '../../services/api';
import { useParams, Link } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

const WorkspaceHome: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace, selectWorkspace } = useWorkspace();
  const { currentUser } = useAuth();


  type ActivityItem = { type: string; name: string; date: string; _id?: string };

  const [databases, setDatabases] = useState<Database[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (workspaceId && currentUser) {
      selectWorkspace(workspaceId);
      // Fetch workspace data
      (async () => {
        try {
          // Replace with your actual API service calls
          const dbs = await apiService.getDatabases(workspaceId);
          setDatabases(dbs);
          const chs = await apiService.getCharts(workspaceId);
          setCharts(chs);
          const dshs = await apiService.getDashboards(workspaceId);
          setDashboards(dshs);
          // Example: recent activity could be last 5 created items
          const activity: ActivityItem[] = [
            ...dbs.map((db: Database) => ({ type: 'Database', name: db.name, date: db.createdAt, _id: db._id })),
            ...chs.map((chart: Chart) => ({ type: 'Chart', name: chart.name, date: chart.lastModified, _id: chart._id })),
            ...dshs.map((dash: Dashboard) => ({ type: 'Dashboard', name: dash.name, date: dash.createdAt, _id: dash._id }))
          ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
          setRecentActivity(activity);
        } catch (err) {
          console.error('Error loading workspace data:', err);
        }
      })();
      console.log('🔍 Loading workspace:', workspaceId);
    }
  }, [workspaceId, currentUser, selectWorkspace]);

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading workspace...</span>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      title: 'Connect Database',
      description: 'Add a new data source to your workspace',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8 1.79 8 4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      ),
      link: `/workspace/${workspaceId}/datasets`,
      color: 'bg-blue-500',
    },
    {
      title: 'Create Chart',
      description: 'Build visualizations from your data',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      link: `/workspace/${workspaceId}/charts`,
      color: 'bg-green-500',
    },
    {
      title: 'Build Dashboard',
      description: 'Create comprehensive dashboards',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
      link: `/workspace/${workspaceId}/dashboards`,
      color: 'bg-purple-500',
    },
    {
      title: 'Manage Team',
      description: 'Invite and manage workspace members',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      link: `/workspace/${workspaceId}/settings`,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{currentWorkspace.name}</h1>
            {currentWorkspace.description && (
              <p className="mt-2 text-lg text-gray-600">{currentWorkspace.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {currentWorkspace.members.length} member{currentWorkspace.members.length !== 1 ? 's' : ''}
            </span>
            <Link
              to={`/workspace/${workspaceId}/settings`}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Settings
            </Link>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          Created on {new Date(currentWorkspace.createdAt).toLocaleDateString()}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.link}
              className="block p-6 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className={`inline-flex p-3 rounded-lg ${action.color} text-white mb-4`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {recentActivity.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by connecting a database or creating your first chart.</p>
            </div>
          ) : (
            <ul>
              {recentActivity.map((item, idx) => (
                <li key={idx} className="mb-2 flex justify-between items-center">
                  <span className="font-medium text-gray-700">
                    {item.type === 'Chart' ? (
                      <Link to={`/workspace/${workspaceId}/charts/${item._id}/edit`} className="text-blue-600 hover:underline">
                        {item.type}: {item.name}
                      </Link>
                    ) : item.type === 'Dashboard' ? (
                      <Link to={`/workspace/${workspaceId}/dashboards/${item._id}/edit`} className="text-purple-600 hover:underline">
                        {item.type}: {item.name}
                      </Link>
                    ) : (
                      <span>{item.type}: {item.name}</span>
                    )}
                  </span>
                  <span className="text-xs text-gray-500">{new Date(item.date).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Workspace Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Databases</p>
              <p className="text-2xl font-semibold text-gray-900">{databases.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Charts</p>
              <p className="text-2xl font-semibold text-gray-900">{charts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Dashboards</p>
              <p className="text-2xl font-semibold text-gray-900">{dashboards.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceHome;
