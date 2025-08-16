import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Dataset, Chart, Database } from '../../types';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

const CreateChart: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for the creation process
  const [step, setStep] = useState<'dataset' | 'query' | 'chart'>('dataset');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  
  // State for the chart
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDatasets = useCallback(async () => {
    try {
      const datasetsData = await apiService.getDatasets(workspaceId!);
      setDatasets(datasetsData);
    } catch (err) {
      setError('Failed to load datasets');
      console.error('Error loading datasets:', err);
    }
  }, [workspaceId]);

  const loadDatabases = useCallback(async () => {
    try {
      const databasesData = await apiService.getDatabases(workspaceId!);
      setDatabases(databasesData);
    } catch (err) {
      console.error('Error loading databases:', err);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      loadDatasets();
      loadDatabases();
    }
  }, [workspaceId, loadDatasets, loadDatabases]);



  const handleCreateDataset = () => {
    navigate(`/workspace/${workspaceId}/datasets`);
  };

  const handleCreateDatasetFromDatabase = async (database: Database) => {
    try {
      // For file-based databases, create a dataset automatically
      if (database.type === 'XLS' || database.type === 'CSV') {
        const datasetData = {
          name: database.displayName,
          type: 'Physical' as const,
          databaseId: database._id,
          schema: database.type === 'XLS' ? (database.sheetName || 'Sheet1') : 'default',
          table: database.type === 'XLS' ? (database.sheetName || 'Sheet1') : 'data',
          owners: [currentUser?.uid || '']
        };

        const newDataset = await apiService.createDataset(workspaceId!, datasetData);
        setDatasets(prev => [...prev, newDataset]);
        setSelectedDataset(newDataset._id);
        setStep('query');
      } else {
        // For other database types, redirect to datasets page
        navigate(`/workspace/${workspaceId}/datasets`);
      }
    } catch (err) {
      setError('Failed to create dataset from database');
      console.error('Error creating dataset:', err);
    }
  };

  const handleQuerySubmit = async () => {
    if (!userQuery.trim() || !selectedDataset) return;

    setIsProcessing(true);
    setProcessingStep('Analyzing your query...');

    try {
      // Step 1: Analyze query
      setProcessingStep('Analyzing your query...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 2: Generate SQL
      setProcessingStep('Generating SQL query...');
      const aiResponse = await apiService.generateChartWithAI(workspaceId!, {
        query: userQuery,
        dataset: selectedDataset,
        workspace: workspaceId!
      });

      // Step 3: Execute query
      setProcessingStep('Executing query...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 4: Create chart
      setProcessingStep('Creating chart...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Transform data from Chart.js format to the format expected by ChartRenderer
      const transformedData = aiResponse.data.labels.map((label: string, index: number) => ({
        label: label,
        value: aiResponse.data.datasets[0].data[index]
      }));

      console.log('AI Response:', aiResponse);
      console.log('Transformed Data:', transformedData);
      console.log('Chart Type:', aiResponse.chartType);

      // Create chart data
      const newChartData: ChartData = {
        name: '',
        type: aiResponse.chartType,
        dataset: selectedDataset,
        query: userQuery,
        sql: aiResponse.sql,
        data: transformedData,
        style: {
          colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'],
          backgroundColor: '#FFFFFF',
          title: {
            text: `Chart: ${userQuery}`,
            display: true,
            position: 'top'
          },
          legend: {
            position: 'top',
            display: true
          },
          axis: {
            x: {
              title: 'Categories',
              display: true
            },
            y: {
              title: 'Values',
              display: true
            }
          }
        }
      };

      setChartData(newChartData);
      setStep('chart');
      setError(null);
    } catch (err) {
      setError('Failed to process your query. Please try again.');
      console.error('Error processing query:', err);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleChartUpdate = (updates: Partial<ChartData>) => {
    if (chartData) {
      setChartData({ ...chartData, ...updates });
    }
  };

  const handleSaveChart = () => {
    setShowSaveModal(true);
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      navigate(`/workspace/${workspaceId}/charts`);
    }
  };

  if (step === 'dataset') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Chart</h1>
          <p className="text-gray-600 mt-2">Step 1: Choose a dataset to visualize</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Dataset
            </label>
            <div className="flex gap-2">
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Choose a dataset...</option>
                {datasets.map((dataset) => (
                  <option key={dataset._id} value={dataset._id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleCreateDataset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Create New Dataset
              </button>
            </div>
          </div>

          {datasets.length === 0 && databases.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">No datasets found</h4>
              <p className="text-sm text-blue-700 mb-3">
                You have {databases.length} connected database{databases.length > 1 ? 's' : ''}, but no datasets created yet.
              </p>
              <div className="space-y-2">
                {databases.map((database) => (
                  <div key={database._id} className="flex items-center justify-between p-2 bg-white rounded border">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{database.displayName}</p>
                      <p className="text-xs text-gray-500">{database.type} database</p>
                    </div>
                    <button
                      onClick={() => handleCreateDatasetFromDatabase(database)}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Dataset
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {datasets.length === 0 && databases.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">No data sources available</h4>
              <p className="text-sm text-yellow-700 mb-3">
                You need to connect a database or upload a file before creating charts.
              </p>
              <button
                onClick={() => navigate(`/workspace/${workspaceId}/datasets`)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Connect Database
              </button>
            </div>
          )}

          <div className="flex justify-between">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={() => selectedDataset && setStep('query')}
              disabled={!selectedDataset || datasets.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'query') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create Chart</h1>
          <p className="text-gray-600 mt-2">Step 2: Describe what you want to visualize</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to visualize?
            </label>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="e.g., Show me daily revenue for the last 30 days, or Compare user retention between different user segments"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4}
            />
            <p className="text-sm text-gray-500 mt-1">
              Describe your visualization in plain English. Our AI will generate the appropriate SQL and chart type.
            </p>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep('dataset')}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Back
            </button>
            <button
              onClick={handleQuerySubmit}
              disabled={!userQuery.trim() || isProcessing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : 'Generate Chart'}
            </button>
          </div>
        </div>

        {isProcessing && (
          <div className="mt-4 bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <p className="text-gray-700">{processingStep}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'chart' && chartData) {
    return (
      <div className="p-6 h-screen flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Chart Editor</h1>
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
              initialQuery={userQuery}
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
  }

  return null;
};

export default CreateChart;
