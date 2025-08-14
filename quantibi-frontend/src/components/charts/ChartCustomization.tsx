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

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const handleStyleUpdate = (path: string, value: any) => {
    const newStyle = { ...chartData.style };
    const keys = path.split('.');
    let current = newStyle;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    onChartUpdate({ style: newStyle });
  };

  const handleColorChange = (index: number, color: string) => {
    const newColors = [...chartData.style.colors];
    newColors[index] = color;
    handleStyleUpdate('colors', newColors);
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
      </div>

      {/* Axis Titles */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Axis Titles</h4>
        
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
          Colors
        </label>
        <div className="grid grid-cols-5 gap-2">
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
          <option value="none">No Sorting</option>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
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
          Maximum number of data points to display
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filters
        </label>
        <textarea
          value={chartData.style.filters || ''}
          onChange={(e) => handleStyleUpdate('filters', e.target.value)}
          placeholder="Add filters (e.g., value > 100)"
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter filter conditions to exclude data points
        </p>
      </div>

      {/* Background Color */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Background Color
        </label>
        <input
          type="color"
          value={chartData.style.backgroundColor || '#FFFFFF'}
          onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value)}
          className="w-full h-10 border border-gray-300 rounded cursor-pointer"
        />
      </div>
    </div>
  );
};

export default ChartCustomization;
