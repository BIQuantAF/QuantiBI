
import React, { useEffect, useState } from 'react';
import { Dashboard } from '../../types';
import { apiService } from '../../services/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import DashboardEditor from './DashboardEditor';
import { Link } from 'react-router-dom';

const Dashboards: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [editingDashboard, setEditingDashboard] = useState<Dashboard | null>(null);
  const [managingChartsDashboard, setManagingChartsDashboard] = useState<Dashboard | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const loadDashboards = async () => {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getDashboards(currentWorkspace._id);
      setDashboards(data);
    } catch (err) {
      setError('Failed to load dashboards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboards();
    // eslint-disable-next-line
  }, [currentWorkspace]);

  const handleCreateDashboard = async () => {
    if (!currentWorkspace || !newDashboardName.trim()) return;
    setLoading(true);
    try {
      await apiService.createDashboard(currentWorkspace._id, {
        name: newDashboardName.trim(),
        description: newDashboardDescription.trim(),
      });
      setShowCreateModal(false);
      setNewDashboardName('');
      setNewDashboardDescription('');
      await loadDashboards();
    } catch {
      setError('Failed to create dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDashboard = (dashboard: Dashboard) => {
    setEditingDashboard(dashboard);
    setEditName(dashboard.name);
    setEditDescription(dashboard.description || '');
  };

  const handleSaveEdit = async () => {
    if (!currentWorkspace || !editingDashboard) return;
    setLoading(true);
    try {
      await apiService.updateDashboard(currentWorkspace._id, editingDashboard._id, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      setEditingDashboard(null);
      await loadDashboards();
    } catch {
      setError('Failed to update dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDashboard = async (dashboardId: string) => {
    if (!currentWorkspace) return;
    if (!window.confirm('Are you sure you want to delete this dashboard? This action cannot be undone.')) return;
    setLoading(true);
    try {
      await apiService.deleteDashboard(currentWorkspace._id, dashboardId);
      await loadDashboards();
    } catch {
      setError('Failed to delete dashboard');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center justify-between">
        <span>Dashboards</span>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          onClick={() => setShowCreateModal(true)}
        >
          + Create New Dashboard
        </button>
      </h1>

      {error && <div className="mb-4 text-red-600">{error}</div>}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          {dashboards.length === 0 ? (
            <p className="text-gray-600">No dashboards found.</p>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Last Updated</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {dashboards.map((dashboard) => (
                  <tr key={dashboard._id} className="border-t">
                    <td className="py-2 font-medium text-left align-middle">
                      <Link
                        to={`/workspace/${currentWorkspace?._id}/dashboards/${dashboard._id}`}
                        className="text-indigo-700 hover:underline"
                      >
                        {dashboard.name}
                      </Link>
                    </td>
                    <td className="py-2 text-left align-middle">{dashboard.description}</td>
                    <td className="py-2 text-left align-middle">{new Date(dashboard.updatedAt).toLocaleString()}</td>
                    <td className="py-2 space-x-2 text-left align-middle">
                      <button
                        className="text-indigo-600 hover:underline"
                        onClick={() => handleEditDashboard(dashboard)}
                      >Edit</button>
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDeleteDashboard(dashboard._id)}
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Dashboard Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Create New Dashboard</h2>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
              placeholder="Dashboard name"
              value={newDashboardName}
              onChange={e => setNewDashboardName(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
              placeholder="Description (optional)"
              value={newDashboardDescription}
              onChange={e => setNewDashboardDescription(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setShowCreateModal(false)}
                disabled={loading}
              >Cancel</button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={handleCreateDashboard}
                disabled={loading || !newDashboardName.trim()}
              >Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dashboard Modal */}
      {editingDashboard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Edit Dashboard</h2>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
              placeholder="Dashboard name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
            />
            <textarea
              className="w-full border border-gray-300 rounded px-3 py-2 mb-3"
              placeholder="Description (optional)"
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setEditingDashboard(null)}
                disabled={loading}
              >Cancel</button>
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                onClick={handleSaveEdit}
                disabled={loading || !editName.trim()}
              >Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboards;
