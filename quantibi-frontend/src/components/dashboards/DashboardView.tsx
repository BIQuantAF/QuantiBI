import React, { useEffect, useState } from 'react';
import ChartRenderer from '../charts/ChartRenderer';
import GridLayout from 'react-grid-layout';
import { useParams, useNavigate } from 'react-router-dom';
import { Dashboard, Chart } from '../../types';
import { apiService } from '../../services/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const DashboardView: React.FC = () => {
  const { dashboardId } = useParams();
  const { currentWorkspace } = useWorkspace();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddChart, setShowAddChart] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [allCharts, setAllCharts] = useState<Chart[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [dragDisabled, setDragDisabled] = useState(false);
  const dragChartRef = React.useRef<any>(null);
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

  // Handle chart removal
  const handleRemoveChart = async (chartId: string) => {
    if (!currentWorkspace || !dashboard) return;
    setLoading(true);
    try {
      await apiService.removeChartFromDashboard(currentWorkspace._id, dashboard._id, chartId);
      const dash = await apiService.getDashboards(currentWorkspace._id);
      const found = dash.find((d: Dashboard) => d._id === dashboard._id);
      setDashboard(found || null);
      if (found) {
        const all = await apiService.getCharts(currentWorkspace._id);
        setAllCharts(all);
        setCharts(all.filter(chart => found.charts.some((c: any) => c._id === chart._id)));
      }
    } catch {
      setError('Failed to remove chart');
    } finally {
      setLoading(false);
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (chart: Chart) => {
    dragChartRef.current = chart;
  };
  const handleDragEnd = () => {
    dragChartRef.current = null;
  };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (dragChartRef.current) {
      await handleAddChart(dragChartRef.current._id);
      dragChartRef.current = null;
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="relative p-0 min-h-screen bg-gray-50">
      {/* Dashboard Top Bar */}
  <div className="w-full bg-white shadow flex items-center justify-between px-6 py-4" style={{ minHeight: 64, marginTop: '64px' }}>
        <div>
          <button className="text-indigo-600 hover:underline mr-4" onClick={() => navigate(-1)}>&larr; Back</button>
          <span className="text-2xl font-bold text-gray-900 align-middle">{dashboard.name}</span>
        </div>
        <button
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? 'Done' : 'Edit dashboard'}
        </button>
      </div>
      {/* Main dashboard content and sidebar */}
  <div className="flex px-6" style={{ marginTop: '16px' }} onDrop={handleDrop} onDragOver={handleDragOver}>
  <div className="flex-1">
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
              cols={12}
              rowHeight={60}
              width={1200}
              isResizable={editMode}
              isDraggable={editMode && !dragDisabled}
              resizeHandles={editMode ? ['se', 'e', 's', 'n', 'w', 'ne', 'nw', 'sw'] : []}
              layout={layout.length ? layout : undefined}
              onLayoutChange={l => setLayout(l)}
            >
              {charts.map((chart, i) => {
                const child = (
                  <div
                    key={chart._id}
                    data-grid={{
                      i: chart._id,
                      x: (i % 2) * 6,
                      y: Math.floor(i / 2) * 6,
                      w: 6,
                      h: 6,
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      background: 'white',
                      borderRadius: 8,
                      boxShadow: '0 2px 8px #0001',
                      padding: 0,
                      width: '100%',
                      height: '100%',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    {editMode && (
                      <div className="absolute top-2 right-2 z-10 flex space-x-2"
                        onMouseEnter={() => setDragDisabled(true)}
                        onMouseLeave={() => setDragDisabled(false)}
                      >
                        <button
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                          onClick={e => { e.stopPropagation(); e.preventDefault(); handleRemoveChart(chart._id); }}
                          tabIndex={0}
                          draggable={false}
                        >Delete</button>
                        <button
                          className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs hover:bg-gray-400"
                          style={{ cursor: 'nwse-resize' }}
                          tabIndex={0}
                          draggable={false}
                          title="Resize (drag grid handle)"
                          disabled
                        >Resize</button>
                      </div>
                    )}
                    <div style={{ flex: 1, width: '100%', height: '100%', minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', overflow: 'hidden' }}>
                      <div style={{ flex: 1, width: '100%', height: '100%' }}>
                        <ChartRenderer chartData={{ ...chart, sql: '' }} onChartUpdate={() => {}} minimal />
                      </div>
                    </div>
                  </div>
                );
                if (!React.isValidElement(child)) {
                  // eslint-disable-next-line no-console
                  console.error('Invalid child for GridLayout:', child, chart);
                  return null;
                }
                return child;
              })}
            </GridLayout>
          )}
        </div>
        {/* Edit sidebar (scaffold only) */}
        {editMode && (
          <div className="w-80 bg-white shadow-lg fixed flex flex-col p-6 border-l" style={{ top: 'calc(64px + 64px)', right: 0, bottom: 0, zIndex: 30 }}>
            <div className="text-xs text-gray-400 mb-2">Drag a chart into the dashboard grid to add it.</div>
            <h2 className="text-lg font-bold mb-4">Add Charts</h2>
            <ul className="space-y-2 overflow-y-auto flex-1">
              {allCharts.filter(chart => !dashboard.charts.some((c: any) => c._id === chart._id)).map(chart => (
                <li key={chart._id} className="flex items-center justify-between py-1" draggable onDragStart={() => handleDragStart(chart)} onDragEnd={handleDragEnd}>
                  <span>{chart.name} <span className="text-xs text-gray-400">({chart.type})</span></span>
                  <button
                    className="text-indigo-600 hover:underline text-sm"
                    onClick={e => { e.stopPropagation(); e.preventDefault(); handleAddChart(chart._id); }}
                    tabIndex={0}
                    draggable={false}
                  >Add</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
