import React, { useState } from 'react';
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

interface ChartRendererProps {
  chartData: ChartData;
  onChartUpdate: (updates: Partial<ChartData>) => void;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ chartData, onChartUpdate }) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'sql' | 'data'>('chart');

  const renderChart = () => {
    if (!chartData.data || !Array.isArray(chartData.data)) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          No data available to display
        </div>
      );
    }

    // Simple chart rendering - in a real implementation, you'd use a charting library like Recharts
    switch (chartData.type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'scatter':
        return renderScatterChart();
      case 'area':
        return renderAreaChart();
      default:
        return renderBarChart();
    }
  };

  const renderBarChart = () => {
    const maxValue = Math.max(...chartData.data.map((item: any) => item.value || 0));
    
    return (
      <div className="h-64 flex items-end justify-center space-x-2 p-4">
        {chartData.data.map((item: any, index: number) => (
          <div key={index} className="flex flex-col items-center">
            <div
              className="bg-indigo-600 rounded-t"
              style={{
                width: '40px',
                height: `${((item.value || 0) / maxValue) * 200}px`,
                backgroundColor: chartData.style.colors[index % chartData.style.colors.length]
              }}
            />
            <div className="text-xs text-gray-600 mt-1 text-center">
              {item.label || item.name}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderLineChart = () => {
    return (
      <div className="h-64 flex items-center justify-center p-4">
        <svg width="100%" height="100%" viewBox="0 0 400 200">
          <polyline
            fill="none"
            stroke={chartData.style.colors[0]}
            strokeWidth="2"
            points={chartData.data.map((item: any, index: number) => 
              `${(index / (chartData.data.length - 1)) * 350 + 25},${200 - (item.value || 0) * 2}`
            ).join(' ')}
          />
          {chartData.data.map((item: any, index: number) => (
            <circle
              key={index}
              cx={(index / (chartData.data.length - 1)) * 350 + 25}
              cy={200 - (item.value || 0) * 2}
              r="3"
              fill={chartData.style.colors[0]}
            />
          ))}
        </svg>
      </div>
    );
  };

  const renderPieChart = () => {
    const total = chartData.data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
    let currentAngle = 0;
    
    return (
      <div className="h-64 flex items-center justify-center p-4">
        <svg width="200" height="200" viewBox="0 0 200 200">
          {chartData.data.map((item: any, index: number) => {
            const percentage = (item.value || 0) / total;
            const angle = percentage * 360;
            const x1 = 100 + 80 * Math.cos(currentAngle * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin(currentAngle * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((currentAngle + angle) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((currentAngle + angle) * Math.PI / 180);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M 100 100`,
              `L ${x1} ${y1}`,
              `A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ');
            
            currentAngle += angle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={chartData.style.colors[index % chartData.style.colors.length]}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  const renderScatterChart = () => {
    return (
      <div className="h-64 flex items-center justify-center p-4">
        <svg width="100%" height="100%" viewBox="0 0 400 200">
          {chartData.data.map((item: any, index: number) => (
            <circle
              key={index}
              cx={(item.x || index) * 10 + 25}
              cy={200 - (item.y || item.value || 0) * 2}
              r="4"
              fill={chartData.style.colors[index % chartData.style.colors.length]}
            />
          ))}
        </svg>
      </div>
    );
  };

  const renderAreaChart = () => {
    const points = chartData.data.map((item: any, index: number) => 
      `${(index / (chartData.data.length - 1)) * 350 + 25},${200 - (item.value || 0) * 2}`
    );
    
    const areaPath = `M ${points.join(' L ')} L ${points[points.length - 1].split(',')[0]},200 L ${points[0].split(',')[0]},200 Z`;
    
    return (
      <div className="h-64 flex items-center justify-center p-4">
        <svg width="100%" height="100%" viewBox="0 0 400 200">
          <path
            d={areaPath}
            fill={chartData.style.colors[0]}
            fillOpacity="0.3"
            stroke={chartData.style.colors[0]}
            strokeWidth="2"
          />
          {chartData.data.map((item: any, index: number) => (
            <circle
              key={index}
              cx={(index / (chartData.data.length - 1)) * 350 + 25}
              cy={200 - (item.value || 0) * 2}
              r="3"
              fill={chartData.style.colors[0]}
            />
          ))}
        </svg>
      </div>
    );
  };

  const renderSQL = () => {
    return (
      <div className="p-4">
        <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm overflow-x-auto">
          <pre>{chartData.sql}</pre>
        </div>
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
        {activeTab === 'chart' && renderChart()}
        {activeTab === 'sql' && renderSQL()}
        {activeTab === 'data' && renderData()}
      </div>
    </div>
  );
};

export default ChartRenderer;
