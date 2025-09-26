import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chart } from '../../types';
import { apiService } from '../../services/api';
import ChartRenderer from './ChartRenderer';
import ChartCustomization from './ChartCustomization';
import AIChat from './AIChat';

import SaveChartModal from './SaveChartModal';

interface ChartData {
  name: string;
  type: Chart['type'];
  dataset: string;
  query: string;
  sql: string;
  data: any;
  style: any;
}

const EditChart: React.FC = () => {
  const { workspaceId, chartId } = useParams<{ workspaceId: string; chartId: string }>();
  const navigate = useNavigate();
  // const { currentUser } = useAuth();
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const loadChart = async () => {
      try {
        const chart = await apiService.getChart(workspaceId!, chartId!);
        // Transform chart to ChartData format
        setChartData({
          name: chart.name,
          type: chart.type,
          dataset: chart.dataset,
          query: chart.query,
          sql: (chart as any).sql ?? '',
          data: chart.data,
          style: chart.style ?? {},
        });
      } catch (err) {
        setError('Failed to load chart');
        console.error('Error loading chart:', err);
      } finally {
        setLoading(false);
      }
    };
    if (workspaceId && chartId) {
      loadChart();
    }
  }, [workspaceId, chartId]);

  const handleChartUpdate = (updates: Partial<ChartData>) => {
    if (chartData) {
      setChartData({ ...chartData, ...updates });
    }
  };

  const handleSaveChart = async () => {
    if (!chartData) return;
    setLoading(true);
    try {
      await apiService.updateChart(workspaceId!, chartId!, chartData);
      setShowSaveModal(false);
      navigate(`/workspace/${workspaceId}/charts`);
    } catch (err) {
      setError('Failed to save chart');
      console.error('Error saving chart:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      navigate(`/workspace/${workspaceId}/charts`);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData) return null;

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Edit Chart</h1>
        <div className="flex space-x-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveChart}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Save Chart
          </button>
        </div>
      </div>
      <div className="flex-1 flex gap-4">
        {/* Left Panel - AI Chat */}
        <div className="w-80 bg-white rounded-lg shadow">
          <AIChat
            initialQuery={chartData.query}
            chartData={chartData}
            onChartUpdate={handleChartUpdate}
            workspaceId={workspaceId!}
          />
        </div>
        {/* Center Panel - Chart Display */}
        <div className="flex-1 bg-white rounded-lg shadow p-4">
          <ChartRenderer
            chartData={chartData}
            onChartUpdate={handleChartUpdate}
          />
        </div>
        {/* Right Panel - Customization */}
        <div className="w-80 bg-white rounded-lg shadow">
          <ChartCustomization
            chartData={chartData}
            onChartUpdate={handleChartUpdate}
          />
        </div>
      </div>
      {showSaveModal && (
        <SaveChartModal
          chartData={chartData}
          workspaceId={workspaceId!}
          onClose={() => setShowSaveModal(false)}
          onSave={() => {
            setShowSaveModal(false);
            navigate(`/workspace/${workspaceId}/charts`);
          }}
        />
      )}
    </div>
  );
};

export default EditChart;
