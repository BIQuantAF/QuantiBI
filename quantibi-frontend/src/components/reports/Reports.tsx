import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../../services/api';
import { Report, Dataset } from '../../types/index';

const Reports: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    fetchReports();
  }, [workspaceId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await apiService.getReports(workspaceId!);
      setReports(data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err?.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      await apiService.deleteReport(workspaceId!, reportId);
      setReports(reports.filter(r => r._id !== reportId));
      setError('');
    } catch (err: any) {
      console.error('Error deleting report:', err);
      setError(err?.response?.data?.message || 'Failed to delete report');
    }
  };

  const handleViewReport = (reportId: string) => {
    navigate(`/workspaces/${workspaceId}/reports/${reportId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading reports...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Generate Report
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No reports yet. Create one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(report => (
            <div
              key={report._id}
              onClick={() => handleViewReport(report._id)}
              className="p-4 border border-gray-200 rounded-lg hover:shadow-md cursor-pointer transition bg-white"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>
              {report.description && (
                <p className="text-gray-600 text-sm mb-2">{report.description}</p>
              )}
              {report.status === 'completed' && report.summary && (
                <div className="mb-3 text-sm text-gray-700 line-clamp-2">
                  <strong>Summary:</strong> {report.summary}
                </div>
              )}
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteReport(report._id);
                  }}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateReportModal
          workspaceId={workspaceId!}
          onClose={() => setShowCreateModal(false)}
          onReportCreated={() => {
            setShowCreateModal(false);
            fetchReports();
          }}
        />
      )}
    </div>
  );
};

interface CreateReportModalProps {
  workspaceId: string;
  onClose: () => void;
  onReportCreated: () => void;
}

const CreateReportModal: React.FC<CreateReportModalProps> = ({ workspaceId, onClose, onReportCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDatasets();
  }, [workspaceId]);

  const fetchDatasets = async () => {
    try {
      const data = await apiService.getDatasets(workspaceId);
      setDatasets(data);
    } catch (err: any) {
      console.error('Error fetching datasets:', err);
      setError(err?.response?.data?.message || 'Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Report title is required');
      return;
    }
    if (!selectedDataset) {
      setError('Select a dataset');
      return;
    }

    try {
      setCreating(true);
      await apiService.createReport(workspaceId, {
        title,
        description,
        datasetId: selectedDataset,
      });
      onReportCreated();
    } catch (err: any) {
      console.error('Error creating report:', err);
      setError(err?.response?.data?.message || 'Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Generate Report from Dataset</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Sales Analysis"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Dataset *
            </label>
            {loading ? (
              <p className="text-sm text-gray-500">Loading datasets...</p>
            ) : datasets.length === 0 ? (
              <p className="text-sm text-gray-500">No datasets available. Create a dataset first.</p>
            ) : (
              <select
                value={selectedDataset}
                onChange={(e) => setSelectedDataset(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">-- Select a dataset --</option>
                {datasets.map(dataset => (
                  <option key={dataset._id} value={dataset._id}>
                    {dataset.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={creating}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {creating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
