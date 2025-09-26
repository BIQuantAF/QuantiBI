import React, { useState, useEffect } from 'react';
import { Chart } from '../../types';
import apiService from '../../services/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface ChartData {
  name: string;
  type: Chart['type'];
  dataset: string;
  query: string;
  sql: string;
  data: any;
  style: any;
}

interface ChartRendererProps {
  chartData: ChartData;
  onChartUpdate: (updates: Partial<ChartData>) => void;
  minimal?: boolean;
  containerHeight?: number | string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, onChartUpdate, minimal = false, containerHeight }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'sql' | 'data'>('chart');
  const [editableSQL, setEditableSQL] = useState(chartData.sql);
  const [isEditing, setIsEditing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  // Update editable SQL when chart data changes
  useEffect(() => {
    setEditableSQL(chartData.sql);
  }, [chartData.sql]);

  const renderChart = () => {
    if (!chartData.data || !Array.isArray(chartData.data) || chartData.data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available to display
        </div>
      );
    }

    // Transform data for Recharts (ensure it has the right format)
    const chartDataForRecharts = chartData.data.map((item: any, index: number) => ({
      name: item.label || `Item ${index + 1}`,
      value: item.value || 0,
      ...item // Include any additional properties
    }));

    const colors = chartData.style.colors || ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

    const height = typeof containerHeight !== 'undefined' ? containerHeight : 400;
    switch (chartData.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartDataForRecharts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ 
                  value: chartData.style.axis?.x?.title || 'Categories', 
                  position: 'bottom',
                  offset: 20 // Add offset to prevent cutoff
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: chartData.style.axis?.y?.title || 'Values', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [value, 'Value']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              {chartData.style.legend?.display && (
                <Legend verticalAlign="top" height={36} />
              )}
              <Bar 
                dataKey="value" 
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartDataForRecharts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ 
                  value: chartData.style.axis?.x?.title || 'Categories', 
                  position: 'bottom',
                  offset: 20 // Add offset to prevent cutoff
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: chartData.style.axis?.y?.title || 'Values', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [value, 'Value']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              {chartData.style.legend?.display && (
                <Legend verticalAlign="top" height={36} />
              )}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={colors[0]} 
                strokeWidth={3}
                dot={{ fill: colors[0], strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: colors[0], strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartDataForRecharts}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {chartDataForRecharts.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any, name: any) => [value, 'Value']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              {chartData.style.legend?.display && (
                <Legend verticalAlign="top" height={36} />
              )}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartDataForRecharts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ 
                  value: chartData.style.axis?.x?.title || 'Categories', 
                  position: 'bottom',
                  offset: 0
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ 
                  value: chartData.style.axis?.y?.title || 'Values', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [value, 'Value']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              {chartData.style.legend?.display && (
                <Legend verticalAlign="top" height={36} />
              )}
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={colors[0]} 
                fill={colors[0]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                type="category"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: chartData.style.axis?.x?.title || 'Categories', 
                  position: 'bottom',
                  offset: 0
                }}
              />
              <YAxis 
                dataKey="value"
                tick={{ fontSize: 12 }}
                label={{ 
                  value: chartData.style.axis?.y?.title || 'Values', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip 
                formatter={(value: any, name: any) => [value, 'Value']}
                labelFormatter={(label) => `Category: ${label}`}
              />
              {chartData.style.legend?.display && (
                <Legend verticalAlign="top" height={36} />
              )}
              <Scatter 
                data={chartDataForRecharts} 
                fill={colors[0]}
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartDataForRecharts}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                label={{ 
                  value: chartData.style.axis?.x?.title || 'Categories', 
                  position: 'bottom',
                  offset: 0
                }}
              />
              <YAxis 
                label={{ 
                  value: chartData.style.axis?.y?.title || 'Values', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  const renderSQL = () => {
    const handleSQLSubmit = async () => {
      if (!editableSQL.trim()) return;
      
      setIsExecuting(true);
      try {
        // Call the backend API to re-execute the SQL
        const response = await apiService.executeSQL({
          sql: editableSQL,
          dataset: chartData.dataset,
          workspace: window.location.pathname.split('/')[2] // Extract workspace ID from URL
        });
        
        // Transform the raw data into the format expected by the chart
        let transformedData = response.data;
        if (Array.isArray(transformedData) && transformedData.length > 0) {
          // Try to find label and value columns, or use the first two columns
          const firstRow = transformedData[0];
          const columns = Object.keys(firstRow);
          
          if (columns.length >= 2) {
            // Use the first two columns as label and value
            transformedData = transformedData.map((row: any) => ({
              label: row[columns[0]] || 'Unknown',
              value: parseFloat(row[columns[1]]) || 0
            }));
          }
        }
        
        // Update the chart with new data
        onChartUpdate({
          sql: editableSQL,
          data: transformedData || chartData.data
        });
        
        setIsEditing(false);
        
        // Show success message
        alert('SQL executed successfully! Chart updated with new data.');
      } catch (error) {
        console.error('Error executing SQL:', error);
        alert('Failed to execute SQL. Please check your query and try again.');
      } finally {
        setIsExecuting(false);
      }
    };

    return (
      <div className="p-4">
        <div className="mb-4 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Generated SQL Query</h3>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Edit SQL
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditableSQL(chartData.sql);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSQLSubmit}
                  disabled={isExecuting}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isExecuting ? 'Executing...' : 'Execute'}
                </button>
              </>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editableSQL}
              onChange={(e) => setEditableSQL(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your SQL query..."
            />
            <p className="text-sm text-gray-600">
              Edit the SQL query above and click Execute to run it against your dataset.
            </p>
          </div>
        ) : (
          <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto">
            <pre>{chartData.sql}</pre>
          </div>
        )}
      </div>
    );
  };

  const renderData = () => {
    if (!chartData.data || !Array.isArray(chartData.data)) {
      return (
        <div className="p-4 text-gray-500">
          No data available
        </div>
      );
    }

    const headers = Object.keys(chartData.data[0] || {});

    return (
      <div className="p-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chartData.data.map((row: any, index: number) => (
              <tr key={index}>
                {headers.map((header) => (
                  <td
                    key={header}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {row[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (minimal) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-2 pb-0">
          <h2 className="text-lg font-semibold text-gray-900 text-center truncate">{chartData.name}</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full h-full">
            {renderChart()}
          </div>
        </div>
      </div>
    );
  }

  // ...existing code for full mode...
  return (
    <div className="h-full flex flex-col">
      {/* Chart Title */}
      {chartData.style.title?.display && (
        <div className="p-4 border-b">
          <input
            type="text"
            value={chartData.style.title.text || ''}
            onChange={(e) => onChartUpdate({
              style: {
                ...chartData.style,
                title: { ...chartData.style.title, text: e.target.value }
              }
            })}
            placeholder="Enter chart title..."
            className="w-full text-lg font-semibold text-gray-900 border-none focus:outline-none focus:ring-0"
          />
        </div>
      )}
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('chart')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chart'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Chart
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sql'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            SQL
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'data'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Data
          </button>
        </nav>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'chart' && (
          <div className="p-4">
            {renderChart()}
          </div>
        )}
        {activeTab === 'sql' && renderSQL()}
        {activeTab === 'data' && renderData()}
      </div>
    </div>
  );
};

export default ChartRenderer;
