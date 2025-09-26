import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart, Dataset, Dashboard } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Charts: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  // const { currentUser } = useAuth();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    try {
      const chartsData = await apiService.getCharts(workspaceId!);
      setCharts(chartsData);
    } catch (err) {
      setError('Failed to load charts');
      console.error('Error loading charts:', err);
    }
  }, [workspaceId]);

  const loadDatasets = useCallback(async () => {
    try {
      const datasetsData = await apiService.getDatasets(workspaceId!);
      setDatasets(datasetsData);
    } catch (err) {
      console.error('Error loading datasets:', err);
    }
  }, [workspaceId]);

  const loadDashboards = useCallback(async () => {
    try {
      const dashboardsData = await apiService.getDashboards(workspaceId!);
      setDashboards(dashboardsData);
    } catch (err) {
      console.error('Error loading dashboards:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadCharts();
      loadDatasets();
      loadDashboards();
    }
  }, [workspaceId, loadCharts, loadDatasets, loadDashboards]);

  const handleCreateChart = () => {
    navigate(`/workspace/${workspaceId}/charts/create`);
  };

  const handleEditChart = (chartId: string) => {
    navigate(`/workspace/${workspaceId}/charts/${chartId}/edit`);
  };

  const handleDeleteChart = async (chartId: string) => {
    if (window.confirm('Are you sure you want to delete this chart?')) {
      try {
        await apiService.deleteChart(workspaceId!, chartId);
        setCharts(charts.filter(chart => chart._id !== chartId));
      } catch (err) {
        setError('Failed to delete chart');
        console.error('Error deleting chart:', err);
      }
    }
  };

  const handleExportChart = (chart: Chart) => {
    // TODO: Implement chart export functionality
    console.log('Exporting chart:', chart.name);
  };

  const getDatasetName = (datasetId: string) => {
    const dataset = datasets.find(d => d._id === datasetId);
    return dataset?.name || 'Unknown Dataset';
  };

  const getDashboardNames = (chart: Chart) => {
    if (!chart.dashboard) return 'No Dashboard';
    const dashboard = dashboards.find(d => d._id === chart.dashboard);
    return dashboard?.name || 'Unknown Dashboard';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Charts</h1>
        <button
          onClick={handleCreateChart}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Create Chart
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {charts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No charts yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first chart to visualize your data.</p>
          <button
            onClick={handleCreateChart}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Create Chart
          </button>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dataset</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dashboards</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Modified</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {charts.map((chart) => (
                <tr key={chart._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      className="text-indigo-600 hover:underline font-medium"
                      onClick={() => handleEditChart(chart._id)}
                    >
                      {chart.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{chart.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getDatasetName(chart.dataset)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getDashboardNames(chart)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{formatDate(chart.lastModified)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right flex space-x-2">
                    <button
                      onClick={() => handleEditChart(chart._id)}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-900 focus:outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleExportChart(chart)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => handleDeleteChart(chart._id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-900 focus:outline-none"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Charts;
