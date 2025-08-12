import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreateWorkspaceForm } from '../../types';

const Workspaces: React.FC = () => {
  const { workspaces, createWorkspace, loading, error, clearError, fetchWorkspaces } = useWorkspace();
  const { currentUser } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateWorkspaceForm>({
    name: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch workspaces when component mounts
    if (currentUser) {
      fetchWorkspaces();
      console.log('🔍 Fetching workspaces for user:', currentUser.email);
    }
  }, [currentUser, fetchWorkspaces]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    console.log('🔍 Workspaces: Form submitted with data:', formData);
    console.log('🔍 Workspaces: About to call createWorkspace...');

    try {
      const newWorkspace = await createWorkspace(formData);
      console.log('🔍 Workspaces: createWorkspace returned:', newWorkspace);
      
      setFormData({ name: '', description: '' });
      setShowCreateForm(false);
      
      console.log('🔍 Workspaces: Form reset and modal closed');
    } catch (err) {
      console.error('❌ Workspaces: Failed to create workspace:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading workspaces...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Create Workspace
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Workspace</h3>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter workspace name"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter workspace description (optional)"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Workspace'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Workspaces Grid */}
      {workspaces.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workspaces</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first workspace.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Create Workspace
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaces.map((workspace) => (
            <div
              key={workspace._id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 truncate">
                    {workspace.name}
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
                
                {workspace.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {workspace.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>{workspace.members.length} member{workspace.members.length !== 1 ? 's' : ''}</span>
                  <span>{new Date(workspace.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex space-x-2">
                  <Link
                    to={`/workspace/${workspace._id}`}
                    className="flex-1 px-3 py-2 bg-indigo-600 text-white text-center text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    Open Workspace
                  </Link>
                  <div className="flex flex-col space-y-1">
                                <Link
                                  to={`/workspace/${workspace._id}/datasets`}
                                  className="px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200 hover:border-indigo-300"
                                >
                                  Datasets
                                </Link>
                                <Link
                                  to={`/workspace/${workspace._id}/charts`}
                                  className="px-3 py-1 text-xs text-green-600 hover:text-green-800 hover:bg-green-50 rounded border border-green-200 hover:border-green-300"
                                >
                                  Charts
                                </Link>
                                <Link
                                  to={`/workspace/${workspace._id}/dashboards`}
                                  className="px-3 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-200 hover:border-purple-300"
                                >
                                  Dashboards
                                </Link>
                              </div>
                              <Link
                                to={`/workspace/${workspace._id}/settings`}
                                className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              >
                                Settings
                              </Link>
                            </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Workspaces;
