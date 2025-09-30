import React, { useEffect, useState, useCallback } from 'react';
import ChartRenderer from '../charts/ChartRenderer';
import GridLayout from 'react-grid-layout';
import { useParams, useNavigate } from 'react-router-dom';
import { Dashboard, Chart } from '../../types';
import { apiService } from '../../services/api';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const DashboardView: React.FC = () => {
  const { dashboardId } = useParams();
  const { currentWorkspace } = useWorkspace();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [allCharts, setAllCharts] = useState<Chart[]>([]);
  const [layout, setLayout] = useState<any[]>([]);
  const [dragDisabled, setDragDisabled] = useState(false);
  const dragChartRef = React.useRef<any>(null);
  const navigate = useNavigate();
  
  // Dashboard editing state
  const [editingName, setEditingName] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');

  // Initialize layout when charts change
  useEffect(() => {
    if (charts.length > 0 && layout.length === 0) {
      const initialLayout = charts.map((chart, i) => ({
        i: chart._id,
        x: (i % 2) * 6,
        y: Math.floor(i / 2) * 5,
        w: 6,
        h: 5,
        minW: 4,
        minH: 4
      }));
      setLayout(initialLayout);
    }
  }, [charts, layout.length]);

  // Memoized layout change handler to prevent excessive re-renders
  const handleLayoutChange = useCallback((newLayout: any[]) => {
    // Use a ref to prevent excessive re-renders
    const layoutChanged = newLayout.length !== layout.length || 
      newLayout.some((item, index) => {
        const existing = layout[index];
        return !existing || 
          item.x !== existing.x || 
          item.y !== existing.y || 
          item.w !== existing.w || 
          item.h !== existing.h;
      });
    
    if (layoutChanged) {
      setLayout(newLayout);
    }
  }, [layout]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!currentWorkspace || !dashboardId) return;
      setLoading(true);
      try {
        const dash = await apiService.getDashboards(currentWorkspace._id);
        const found = dash.find((d: Dashboard) => d._id === dashboardId);
        setDashboard(found || null);
        if (found) {
          setDashboardName(found.name || '');
          setDashboardDescription(found.description || '');
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
        const newCharts = all.filter(chart => found.charts.some((c: any) => c._id === chart._id));
        setCharts(newCharts);
        // Reset layout when charts change
        setLayout([]);
      }
  // Removed setShowAddChart(false); (no longer needed)
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
        const newCharts = all.filter(chart => found.charts.some((c: any) => c._id === chart._id));
        setCharts(newCharts);
        // Reset layout when charts change
        setLayout([]);
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

  // Dashboard name/description editing
  const handleSaveDashboardInfo = async () => {
    if (!currentWorkspace || !dashboard) return;
    try {
      await apiService.updateDashboard(currentWorkspace._id, dashboard._id, {
        name: dashboardName,
        description: dashboardDescription
      });
      setDashboard({ ...dashboard, name: dashboardName, description: dashboardDescription });
      setEditingName(false);
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      setError('Failed to update dashboard');
    }
  };

  const handleCancelEdit = () => {
    setDashboardName(dashboard?.name || '');
    setDashboardDescription(dashboard?.description || '');
    setEditingName(false);
  };

  return (
    <div className="relative p-0 min-h-screen bg-gray-50">
      {/* Dashboard Top Bar */}
      <div className="w-full bg-white shadow flex items-center justify-between px-6 py-4" style={{ minHeight: 80 }}>
        <div className="flex-1">
          <button className="text-indigo-600 hover:underline mr-4 text-sm" onClick={() => navigate(-1)}>
            ← Back
          </button>
          
          {editingName ? (
            <div className="mt-2">
              <input
                type="text"
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-indigo-500 focus:outline-none focus:border-indigo-600 mb-2 w-full max-w-md"
                placeholder="Dashboard name"
                autoFocus
              />
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={dashboardDescription}
                  onChange={(e) => setDashboardDescription(e.target.value)}
                  className="text-gray-600 bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-500 flex-1 max-w-lg"
                  placeholder="Dashboard description (optional)"
                />
                <button
                  onClick={handleSaveDashboardInfo}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-gray-900">{dashboard?.name}</span>
                {editMode && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="ml-3 p-1 text-gray-400 hover:text-gray-600"
                    title="Edit dashboard name"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
              </div>
              {dashboard?.description && (
                <p className="text-gray-600 mt-1">{dashboard.description}</p>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 font-medium"
            onClick={() => setEditMode((v) => !v)}
          >
            {editMode ? 'Done' : 'Edit Dashboard'}
          </button>
        </div>
      </div>
      {/* Main dashboard content and sidebar */}
      <div className="flex px-6" style={{ marginTop: '16px' }} onDrop={handleDrop} onDragOver={handleDragOver}>
        <div className="flex-1">
          {!editingName && dashboard?.description && !editMode && (
            <p className="text-gray-600 mb-6">{dashboard.description}</p>
          )}
          
          {charts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No charts yet</h3>
              <p className="text-gray-600 text-center">
                {editMode 
                  ? "Drag charts from the sidebar to add them to your dashboard"
                  : "Click 'Edit Dashboard' to start adding charts"
                }
              </p>
            </div>
          ) : layout.length > 0 ? (
            <GridLayout
              className="layout"
              cols={12}
              rowHeight={80}
              width={editMode ? 1000 : 1200}
              margin={[16, 16]}
              containerPadding={[0, 0]}
              isResizable={editMode}
              isDraggable={editMode && !dragDisabled}
              resizeHandles={editMode ? ['se'] : []}
              layout={layout}
              onLayoutChange={handleLayoutChange}
              compactType="vertical"
              preventCollision={false}
            >
              {charts.map((chart) => {
                return (
                  <div
                    key={chart._id}
                    className="bg-white rounded-lg shadow-md overflow-hidden"
                    style={{
                      border: editMode ? '2px dashed transparent' : 'none',
                      position: 'relative'
                    }}
                  >
                    {editMode && (
                      <div 
                        className="absolute top-2 right-2 z-20 flex space-x-1"
                        onMouseEnter={() => setDragDisabled(true)}
                        onMouseLeave={() => setDragDisabled(false)}
                      >
                        <button
                          className="bg-red-500 text-white p-1.5 rounded shadow-lg hover:bg-red-600 transition-colors"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            e.preventDefault(); 
                            handleRemoveChart(chart._id); 
                          }}
                          title="Remove chart"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    
                    <div className="w-full h-full flex flex-col">
                      <ChartRenderer 
                        chartData={{ ...chart, sql: '' }} 
                        onChartUpdate={() => {}} 
                        minimal 
                      />
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-600">Initializing dashboard layout...</p>
            </div>
          )}
        </div>
        {/* Enhanced Edit Sidebar */}
        {editMode && (
          <div className="w-80 bg-white shadow-xl fixed flex flex-col border-l border-gray-200" 
               style={{ top: 'calc(64px + 80px)', right: 0, bottom: 0, zIndex: 30 }}>
            
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Dashboard Editor</h2>
              <p className="text-sm text-gray-600">
                Drag charts into the dashboard or click "Add" to include them.
              </p>
            </div>

            {/* Available Charts */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4 uppercase tracking-wide">
                Available Charts ({allCharts.filter(chart => !dashboard?.charts.some((c: any) => c._id === chart._id)).length})
              </h3>
              
              {allCharts.filter(chart => !dashboard?.charts.some((c: any) => c._id === chart._id)).length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">All available charts have been added to this dashboard.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allCharts
                    .filter(chart => !dashboard?.charts.some((c: any) => c._id === chart._id))
                    .map(chart => (
                      <div 
                        key={chart._id} 
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-grab active:cursor-grabbing"
                        draggable 
                        onDragStart={() => handleDragStart(chart)} 
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{chart.name}</h4>
                            <div className="flex items-center mt-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {chart.type}
                              </span>
                            </div>
                          </div>
                          <button
                            className="ml-3 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              e.preventDefault(); 
                              handleAddChart(chart._id); 
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-500 space-y-1">
                <p>• Drag charts into the dashboard grid</p>
                <p>• Resize charts by dragging the corner handle</p>
                <p>• Click the X button to remove charts</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
