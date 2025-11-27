import React, { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';

const WorkspaceSettings: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { currentUser } = useAuth();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const isOwner = currentWorkspace.owner === currentUser?.uid;

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement actual invite functionality
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to send invite:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <p className="text-gray-600">Manage your workspace configuration and team members</p>
      </div>

      {/* Workspace Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Workspace Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Workspace Name</label>
            <input
              type="text"
              value={currentWorkspace.name}
              disabled={!isOwner}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={currentWorkspace.description || ''}
              disabled={!isOwner}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
            />
          </div>
        </div>
        {!isOwner && (
          <p className="text-sm text-gray-500 mt-2">Only workspace owners can modify these settings.</p>
        )}
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
          {isOwner && (
            <button
              onClick={() => setShowInviteForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Invite Member
            </button>
          )}
        </div>

        <div className="space-y-3">
          {currentWorkspace.members.map((member) => (
            <div key={member.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-700">
                    {member.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.email}</p>
                  <p className="text-xs text-gray-500">
                    {member.role} • Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  member.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                  member.role === 'admin' ? 'bg-red-100 text-red-800' :
                  member.role === 'member' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {member.role}
                </span>
                {isOwner && member.uid !== currentUser?.uid && (
                  <button className="text-red-600 hover:text-red-800 text-sm">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invites */}
      {currentWorkspace.invites.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invites</h2>
          <div className="space-y-3">
            {currentWorkspace.invites.map((invite) => (
              <div key={invite.token} className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-yellow-700">📧</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <p className="text-xs text-gray-500">
                      {invite.role} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending
                  </span>
                  {isOwner && (
                    <button className="text-red-600 hover:text-red-800 text-sm">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {isOwner && (
        <div className="bg-white rounded-lg border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Delete Workspace</p>
              <p className="text-sm text-red-600">This action cannot be undone. All data will be permanently deleted.</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
              Delete Workspace
            </button>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
              <form onSubmit={handleInviteSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter email address"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    id="role"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member' | 'viewer')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowInviteForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceSettings;
