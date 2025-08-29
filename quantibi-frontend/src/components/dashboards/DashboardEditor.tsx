import React, { useEffect, useState } from 'react';
import { Dashboard, Chart } from '../../types';
import { apiService } from '../../services/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';

interface DashboardEditorProps {
  dashboard: Dashboard;
  onClose: () => void;
}

const DashboardEditor: React.FC<DashboardEditorProps> = ({ dashboard, onClose }) => {
  const { currentWorkspace } = useWorkspace();
  const [charts, setCharts] = useState<Chart[]>([]);
  const [dashboardCharts, setDashboardCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCharts = async () => {
      if (!currentWorkspace) return;
      setLoading(true);
      try {
        const allCharts = await apiService.getCharts(currentWorkspace._id);
        setCharts(allCharts);
        setDashboardCharts(allCharts.filter(chart => dashboard.charts.includes(chart._id)));
      } catch {
        setError('Failed to load charts');
      } finally {
        setLoading(false);
      }
    };
    loadCharts();
  }, [currentWorkspace, dashboard]);

  const handleAddChart = async (chartId: string) => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
      await apiService.addChartToDashboard(currentWorkspace._id, dashboard._id, chartId);
      const updatedCharts = await apiService.getCharts(currentWorkspace._id);
      setDashboardCharts(updatedCharts.filter(chart => dashboard.charts.includes(chart._id) || chart._id === chartId));
    } catch {
      setError('Failed to add chart');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveChart = async (chartId: string) => {
    if (!currentWorkspace) return;
    setLoading(true);
    try {
  await apiService.removeChartFromDashboard(currentWorkspace._id, dashboard._id, chartId);
  setDashboardCharts(dashboardCharts.filter(chart => chart._id !== chartId));
    } catch {
      setError('Failed to remove chart');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Edit Dashboard Charts</h2>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Charts in this Dashboard</h3>
          {dashboardCharts.length === 0 ? (
            <p className="text-gray-500">No charts in this dashboard.</p>
          ) : (
            <ul className="mb-2">
              {dashboardCharts.map(chart => (
                <li key={chart._id} className="flex items-center justify-between py-1">
                  <span>{chart.name} <span className="text-xs text-gray-400">({chart.type})</span></span>
                  <button
                    className="text-red-600 hover:underline text-sm"
                    onClick={() => handleRemoveChart(chart._id)}
                    disabled={loading}
                  >Remove</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Add Chart to Dashboard</h3>
          <ul>
            {charts.filter(chart => !dashboardCharts.some(dc => dc._id === chart._id)).map(chart => (
              <li key={chart._id} className="flex items-center justify-between py-1">
                <span>{chart.name} <span className="text-xs text-gray-400">({chart.type})</span></span>
                <button
                  className="text-indigo-600 hover:underline text-sm"
                  onClick={() => handleAddChart(chart._id)}
                  disabled={loading}
                >Add</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end">
          <button
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >Close</button>
        </div>
      </div>
    </div>
  );
};

export default DashboardEditor;
