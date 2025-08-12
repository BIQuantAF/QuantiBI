import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Workspace, CreateWorkspaceForm } from '../types';
import { apiService } from '../services/api';

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  loading: boolean;
  error: string | null;
  createWorkspace: (workspaceData: CreateWorkspaceForm) => Promise<Workspace>;
  selectWorkspace: (workspaceId: string) => void;
  fetchWorkspaces: () => Promise<void>;
  clearError: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

interface WorkspaceProviderProps {
  children: ReactNode;
}

export const WorkspaceProvider: React.FC<WorkspaceProviderProps> = ({ children }) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const fetchedWorkspaces = await apiService.getWorkspaces();
      setWorkspaces(fetchedWorkspaces);
      
      // If no current workspace is selected and we have workspaces, select the first one
      if (!currentWorkspace && fetchedWorkspaces.length > 0) {
        setCurrentWorkspace(fetchedWorkspaces[0]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch workspaces';
      setError(errorMessage);
      console.error('Error fetching workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (workspaceData: CreateWorkspaceForm): Promise<Workspace> => {
    try {
      setLoading(true);
      setError(null);
      const newWorkspace = await apiService.createWorkspace(workspaceData);
      setWorkspaces(prev => [...prev, newWorkspace]);
      
      // If this is the first workspace, select it
      if (workspaces.length === 0) {
        setCurrentWorkspace(newWorkspace);
      }
      
      return newWorkspace;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create workspace';
      setError(errorMessage);
      console.error('Error creating workspace:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const selectWorkspace = (workspaceId: string): void => {
    const workspace = workspaces.find(w => w._id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
    }
  };

  const clearError = (): void => {
    setError(null);
  };

  const value: WorkspaceContextType = {
    workspaces,
    currentWorkspace,
    loading,
    error,
    createWorkspace,
    selectWorkspace,
    fetchWorkspaces,
    clearError,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
