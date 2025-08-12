import React from 'react';
import { useParams } from 'react-router-dom';

const WorkspaceHome = () => {
  const { workspaceId } = useParams();

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Workspace Home
        </h1>
        <p className="text-gray-600">
          Welcome to workspace {workspaceId}. This is the workspace home page.
        </p>
      </div>
    </div>
  );
};

export default WorkspaceHome;
