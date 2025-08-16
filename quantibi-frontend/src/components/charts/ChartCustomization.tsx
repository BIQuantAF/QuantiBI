import React from 'react';
import { Chart } from '../../types';

interface ChartData {
  name: string;
  type: Chart['type'];
  dataset: string;
  query: string;
  sql: string;
  data: any;
  style: any;
}

interface ChartCustomizationProps {
  chartData: ChartData;
  onChartUpdate: (updates: Partial<ChartData>) => void;
}

const ChartCustomization: React.FC<ChartCustomizationProps> = ({ chartData, onChartUpdate }) => {
  const chartTypes = [
    { value: 'bar', label: 'Bar Chart' },
    { value: 'line', label: 'Line Chart' },
    { value: 'pie', label: 'Pie Chart' },
    { value: 'scatter', label: 'Scatter Plot' },
    { value: 'area', label: 'Area Chart' }
  ];



  const handleColorChange = (index: number, color: string) => {
    const newColors = [...chartData.style.colors];
    newColors[index] = color;
    handleStyleUpdate('colors', newColors);
  };

  const applyDataTransformations = (data: any[], sortOrder: string, dataLimit: number) => {
    let transformedData = [...data];
    
    // Apply sorting
    if (sortOrder === 'asc') {
      transformedData.sort((a, b) => (a.value || 0) - (b.value || 0));
    } else if (sortOrder === 'desc') {
      transformedData.sort((a, b) => (b.value || 0) - (a.value || 0));
    }
    
    // Apply data limit
    if (dataLimit && dataLimit > 0 && dataLimit < transformedData.length) {
      transformedData = transformedData.slice(0, dataLimit);
    }
    
    return transformedData;
  };

  const handleStyleUpdate = (path: string, value: any) => {
    const newStyle = { ...chartData.style };
    const keys = path.split('.');
    let current = newStyle;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    // Apply data transformations if sorting or data limit changed
    if (path === 'sortOrder' || path === 'dataLimit') {
      const transformedData = applyDataTransformations(
        chartData.data,
        newStyle.sortOrder || 'none',
        newStyle.dataLimit || null
      );
      onChartUpdate({ 
        style: newStyle,
        data: transformedData
      });
    } else {
      onChartUpdate({ style: newStyle });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Customize Chart</h3>
      
      {/* Chart Type */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chart Type
        </label>
        <select
          value={chartData.type}
          onChange={(e) => onChartUpdate({ type: e.target.value as Chart['type'] })}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {chartTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Change the chart visualization type. Some types work better with certain data patterns.
        </p>
      </div>

      {/* Chart Title */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Chart Title
          </label>
          <input
            type="checkbox"
            checked={chartData.style.title?.display || false}
            onChange={(e) => handleStyleUpdate('title.display', e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
        {chartData.style.title?.display && (
          <input
            type="text"
            value={chartData.style.title.text || ''}
            onChange={(e) => handleStyleUpdate('title.text', e.target.value)}
            placeholder="Enter chart title..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
      </div>

      {/* Legend */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Show Legend
          </label>
          <input
            type="checkbox"
            checked={chartData.style.legend?.display || false}
            onChange={(e) => handleStyleUpdate('legend.display', e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
        </div>
        {chartData.style.legend?.display && (
          <select
            value={chartData.style.legend.position || 'top'}
            onChange={(e) => handleStyleUpdate('legend.position', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Legend shows data series information and can be positioned around the chart
        </p>
      </div>

      {/* Axis Titles */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Axis Titles</h4>
        <p className="text-xs text-gray-500 mb-3">
          Add descriptive labels for your chart axes to make the data more understandable
        </p>
        
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-600">X-Axis Title</label>
            <input
              type="checkbox"
              checked={chartData.style.axis?.x?.display || false}
              onChange={(e) => handleStyleUpdate('axis.x.display', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          {chartData.style.axis?.x?.display && (
            <input
              type="text"
              value={chartData.style.axis.x.title || ''}
              onChange={(e) => handleStyleUpdate('axis.x.title', e.target.value)}
              placeholder="X-axis title..."
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-gray-600">Y-Axis Title</label>
            <input
              type="checkbox"
              checked={chartData.style.axis?.y?.display || false}
              onChange={(e) => handleStyleUpdate('axis.y.display', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          {chartData.style.axis?.y?.display && (
            <input
              type="text"
              value={chartData.style.axis.y.title || ''}
              onChange={(e) => handleStyleUpdate('axis.y.title', e.target.value)}
              placeholder="Y-axis title..."
              className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
        </div>
      </div>

      {/* Colors */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chart Colors
        </label>
        
        {/* Primary Color - Most Important */}
        <div className="mb-4">
          <label className="block text-xs text-gray-600 mb-2">Primary Chart Color</label>
          <input
            type="color"
            value={chartData.style.colors[0] || '#3B82F6'}
            onChange={(e) => {
              const newColors = [...chartData.style.colors];
              newColors[0] = e.target.value;
              handleStyleUpdate('colors', newColors);
            }}
            className="w-full h-12 border border-gray-300 rounded cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            This is the main color for your chart elements
          </p>
        </div>

        {/* Quick Color Schemes */}
        <div className="mb-3">
          <label className="block text-xs text-gray-600 mb-2">Quick Color Schemes</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleStyleUpdate('colors', ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'])}
              className="px-3 py-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 border border-blue-200"
            >
              Blue Theme
            </button>
            <button
              onClick={() => handleStyleUpdate('colors', ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'])}
              className="px-3 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 border border-red-200"
            >
              Red Theme
            </button>
            <button
              onClick={() => handleStyleUpdate('colors', ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'])}
              className="px-3 py-2 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200"
            >
              Green Theme
            </button>
            <button
              onClick={() => handleStyleUpdate('colors', ['#8B5CF6', '#EF4444', '#10B981', '#F59E0B', '#3B82F6'])}
              className="px-3 py-2 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 border border-purple-200"
            >
              Purple Theme
            </button>
          </div>
        </div>

        {/* Advanced Color Palette (Collapsible) */}
        <details className="mt-3">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
            Advanced Color Palette (for multi-series charts)
          </summary>
          <div className="mt-2 grid grid-cols-5 gap-2">
            {chartData.style.colors.map((color: string, index: number) => (
              <div key={index} className="flex flex-col items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(index, e.target.value)}
                  className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                />
                <span className="text-xs text-gray-500 mt-1">{index + 1}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Colors 2-5 are used for multiple data series or chart elements
          </p>
        </details>
      </div>

      {/* Sort Order */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Sort Order
        </label>
        <select
          value={chartData.style.sortOrder || 'none'}
          onChange={(e) => handleStyleUpdate('sortOrder', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="none">No Sorting (Original Order)</option>
          <option value="asc">Ascending (Low to High)</option>
          <option value="desc">Descending (High to Low)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Sorts data by value before displaying in the chart
        </p>
      </div>

      {/* Data Limits */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data Limit
        </label>
        <input
          type="number"
          value={chartData.style.dataLimit || ''}
          onChange={(e) => handleStyleUpdate('dataLimit', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="No limit"
          min="1"
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Maximum number of data points to display. Only applies if you want to show fewer than the total available data points.
        </p>
      </div>

      {/* Background Color */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Color
        </label>
        <div className="space-y-2">
          <input
            type="color"
            value={chartData.style.backgroundColor || '#FFFFFF'}
            onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
            className="w-full h-12 border border-gray-300 rounded cursor-pointer"
          />
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 border border-gray-300 rounded"
              style={{ backgroundColor: chartData.style.backgroundColor || '#FFFFFF' }}
            />
            <span className="text-xs text-gray-600">
              {chartData.style.backgroundColor || '#FFFFFF'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            This affects the chart background and container styling. Note: Background color changes may not be immediately visible on all chart types.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChartCustomization;
