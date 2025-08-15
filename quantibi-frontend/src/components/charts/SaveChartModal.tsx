import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from '../../types';
import { apiService } from '../../services/api';

interface ChartData {
  name: string;
  type: any;
  dataset: string;
  query: string;
  sql: string;
  data: any;
  style: any;
}

interface SaveChartModalProps {
  chartData: ChartData;
  workspaceId: string;
  onClose: () => void;
  onSave: () => void;
}

const SaveChartModal: React.FC<SaveChartModalProps> = ({ chartData, workspaceId, onClose, onSave }) => {
  const [chartName, setChartName] = useState(chartData.name || '');
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<string>('');
  const [newDashboardName, setNewDashboardName] = useState('');
  const [showNewDashboardForm, setShowNewDashboardForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboards = useCallback(async () => {
    try {
      const dashboardsData = await apiService.getDashboards(workspaceId);
      setDashboards(dashboardsData);
    } catch (err) {
      console.error('Error loading dashboards:', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDashboards();
  }, [loadDashboards]);

  const handleSave = async () => {
    if (!chartName.trim()) {
      setError('Please enter a chart name');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Create new dashboard if requested
      if (showNewDashboardForm && newDashboardName.trim()) {
        await apiService.createDashboard(workspaceId, {
          name: newDashboardName.trim(),
          description: `Dashboard created for chart: ${chartName}`
        });
      }

      // Save the chart
      await apiService.createChart(workspaceId, {
        name: chartName.trim(),
        type: chartData.type,
        dataset: chartData.dataset,
        query: chartData.query,
        style: chartData.style
      });

      onSave();
    } catch (err) {
      setError('Failed to save chart. Please try again.');
      console.error('Error saving chart:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewDashboard = () => {
    setShowNewDashboardForm(true);
    setSelectedDashboard('');
  };

  const handleSelectExistingDashboard = () => {
    setShowNewDashboardForm(false);
    setNewDashboardName('');
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Save Chart</h3>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Chart Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Name *
            </label>
            <input
              type="text"
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              placeholder="Enter chart name..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Dashboard Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add to Dashboard
            </label>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dashboardOption"
                  checked={!showNewDashboardForm}
                  onChange={handleSelectExistingDashboard}
                  className="mr-2"
                />
                <span className="text-sm">Select existing dashboard</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  name="dashboardOption"
                  checked={showNewDashboardForm}
                  onChange={handleCreateNewDashboard}
                  className="mr-2"
                />
                <span className="text-sm">Create new dashboard</span>
              </label>
            </div>

            {/* Existing Dashboard Selection */}
            {!showNewDashboardForm && (
              <div className="mt-3">
                <select
                  value={selectedDashboard}
                  onChange={(e) => setSelectedDashboard(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a dashboard (optional)</option>
                  {dashboards.map((dashboard) => (
                    <option key={dashboard._id} value={dashboard._id}>
                      {dashboard.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* New Dashboard Form */}
            {showNewDashboardForm && (
              <div className="mt-3">
                <input
                  type="text"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="Enter dashboard name..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Chart Preview */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Chart Preview</h4>
            <div className="text-sm text-gray-600">
              <p><strong>Type:</strong> {chartData.type}</p>
              <p><strong>Dataset:</strong> {chartData.dataset}</p>
              <p><strong>Query:</strong> {chartData.query}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !chartName.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Chart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveChartModal;
