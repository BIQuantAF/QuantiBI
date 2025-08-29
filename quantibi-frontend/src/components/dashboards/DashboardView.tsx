import React, { useEffect, useState } from 'react';
import ChartRenderer from '../charts/ChartRenderer';
import GridLayout from 'react-grid-layout';
import { useParams, useNavigate } from 'react-router-dom';
import { Dashboard, Chart } from '../../types';
import { apiService } from '../../services/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const DashboardView: React.FC = () => {
  const { workspaceId, dashboardId } = useParams();
  const { currentWorkspace } = useWorkspace();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddChart, setShowAddChart] = useState(false);
  const [allCharts, setAllCharts] = useState<Chart[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentWorkspace || !dashboardId) return;
      setLoading(true);
      try {
        const dash = await apiService.getDashboards(currentWorkspace._id);
        const found = dash.find((d: Dashboard) => d._id === dashboardId);
        setDashboard(found || null);
        if (found) {
          const all = await apiService.getCharts(currentWorkspace._id);
          setAllCharts(all);
          setCharts(all.filter(chart => found.charts.some((c: any) => c._id === chart._id)));
        }
      } catch {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [currentWorkspace, dashboardId]);

  const handleAddChart = async (chartId: string) => {
    if (!currentWorkspace || !dashboard) return;
    setLoading(true);
    try {
      await apiService.addChartToDashboard(currentWorkspace._id, dashboard._id, chartId);
      // Reload dashboard and charts from backend to ensure up-to-date data
      const dash = await apiService.getDashboards(currentWorkspace._id);
      const found = dash.find((d: Dashboard) => d._id === dashboard._id);
      setDashboard(found || null);
      if (found) {
        const all = await apiService.getCharts(currentWorkspace._id);
        setAllCharts(all);
  setCharts(all.filter(chart => found.charts.some((c: any) => c._id === chart._id)));
      }
      setShowAddChart(false);
    } catch {
      setError('Failed to add chart');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!dashboard) return <div className="p-6">Dashboard not found.</div>;

  return (
    <div className="p-6">
      <button className="mb-4 text-indigo-600 hover:underline" onClick={() => navigate(-1)}>&larr; Back</button>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{dashboard.name}</h1>
      <p className="text-gray-600 mb-6">{dashboard.description}</p>
      {charts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <p className="text-gray-600 mb-4">No charts in this dashboard.</p>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            onClick={() => setShowAddChart(true)}
          >
            + Add Chart
          </button>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={charts.map((chart, i) => ({ i: chart._id, x: (i % 2) * 6, y: Math.floor(i / 2) * 8, w: 6, h: 8 }))}
          cols={12}
          rowHeight={30}
          width={1200}
          isResizable={true}
          isDraggable={true}
        >
          {charts.map(chart => (
            <div key={chart._id} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <h2 className="font-semibold mb-2">{chart.name}</h2>
              <p className="text-sm text-gray-500 mb-2">{chart.type}</p>
              <div className="flex-1 min-h-[200px]">
                <ChartRenderer chartData={{
                  ...chart,
                  sql: '',
                }} onChartUpdate={() => {}} />
              </div>
            </div>
          ))}
        </GridLayout>
      )}
      {/* Add Chart Modal */}
      {showAddChart && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-96">
            <h2 className="text-lg font-bold mb-4">Add Chart to Dashboard</h2>
            <ul>
              {allCharts.filter(chart => !dashboard.charts.includes(chart._id)).map(chart => (
                <li key={chart._id} className="flex items-center justify-between py-1">
                  <span>{chart.name} <span className="text-xs text-gray-400">({chart.type})</span></span>
                  <button
                    className="text-indigo-600 hover:underline text-sm"
                    onClick={() => handleAddChart(chart._id)}
                  >Add</button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                onClick={() => setShowAddChart(false)}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
