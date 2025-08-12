import React, { createContext, useContext, useState } from 'react';

const WorkspaceContext = createContext();

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const [workspaces, setWorkspaces] = useState([]);
  const [currentWorkspace, setCurrentWorkspace] = useState(null);

  const createWorkspace = async (name) => {
    // TODO: Implement actual workspace creation
    const newWorkspace = {
      id: Date.now().toString(),
      name,
      createdAt: new Date().toISOString(),
      members: []
    };
    setWorkspaces(prev => [...prev, newWorkspace]);
    return newWorkspace;
  };

  const selectWorkspace = (workspaceId) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    setCurrentWorkspace(workspace);
  };

  const value = {
    workspaces,
    currentWorkspace,
    createWorkspace,
    selectWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
