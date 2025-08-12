import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { DatabaseConnectionForm, Database } from '../../types';
import { apiService } from '../../services/api';

const Datasets: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [selectedDatabaseType, setSelectedDatabaseType] = useState<Database['type']>('PostgreSQL');
  const [formData, setDatabaseConnectionForm] = useState<DatabaseConnectionForm>({
    type: 'PostgreSQL',
    name: '',
    displayName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch existing database connections
  useEffect(() => {
    if (currentWorkspace) {
      fetchDatabases();
    }
  }, [currentWorkspace]);

  const fetchDatabases = async () => {
    if (!currentWorkspace) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching databases for workspace:', currentWorkspace._id);
      const fetchedDatabases = await apiService.getDatabases(currentWorkspace._id);
      console.log('✅ Fetched databases:', fetchedDatabases);
      
      setDatabases(fetchedDatabases);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch databases';
      setError(errorMessage);
      console.error('❌ Error fetching databases:', err);
    } finally {
      setLoading(false);
    }
  };

  const databaseTypes: Database['type'][] = [
    'PostgreSQL',
    'Snowflake',
    'MySQL',
    'Databricks',
    'Google BigQuery',
    'Google Sheets',
    'CSV',
    'XLS'
  ];

  const getConnectionFields = (type: Database['type']) => {
    switch (type) {
      case 'PostgreSQL':
      case 'MySQL':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Host</label>
                <input
                  type="text"
                  name="host"
                  value={formData.host || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
                <input
                  type="number"
                  name="port"
                  value={formData.port || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={type === 'PostgreSQL' ? '5432' : '3306'}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Database Name</label>
              <input
                type="text"
                name="databaseName"
                value={formData.databaseName || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter database name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
              </div>
            </div>
          </>
        );

      case 'Google BigQuery':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project ID</label>
              <input
                type="text"
                name="projectId"
                value={formData.projectId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your-project-id"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dataset ID</label>
              <input
                type="text"
                name="datasetId"
                value={formData.datasetId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your_dataset"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Account Credentials (JSON)</label>
              <textarea
                name="credentials"
                value={formData.credentials || ''}
                onChange={handleChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Paste your service account JSON credentials"
              />
            </div>
          </>
        );

      case 'Google Sheets':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Spreadsheet URL</label>
              <input
                type="url"
                name="spreadsheetUrl"
                value={formData.spreadsheetUrl || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sheet Name</label>
              <input
                type="text"
                name="sheetName"
                value={formData.sheetName || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Sheet1"
              />
            </div>
          </>
        );

      case 'CSV':
      case 'XLS':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload File</label>
            <input
              type="file"
              accept={type === 'CSV' ? '.csv' : '.xls,.xlsx'}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setDatabaseConnectionForm(prev => ({
                    ...prev,
                    filePath: file.name,
                    fileType: type
                  }));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Connection String</label>
            <textarea
              name="credentials"
              value={formData.credentials || ''}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter connection string or credentials"
            />
          </div>
        );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDatabaseConnectionForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDatabaseTypeChange = (type: Database['type']) => {
    setSelectedDatabaseType(type);
    setDatabaseConnectionForm(prev => ({
      ...prev,
      type,
      // Reset type-specific fields
      host: '',
      port: undefined,
      databaseName: '',
      username: '',
      password: '',
      projectId: '',
      datasetId: '',
      credentials: '',
      spreadsheetUrl: '',
      sheetName: '',
      filePath: '',
      fileType: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTestResult(null);

    if (!currentWorkspace) {
      setError('No workspace selected');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('🔍 Creating database connection:', formData);
      
      // Create the database connection via API
      const newDatabase = await apiService.createDatabase(currentWorkspace._id, formData);
      console.log('✅ Database connection created successfully:', newDatabase);
      
      // Add to local state
      setDatabases(prev => [...prev, newDatabase]);
      
      // Reset form and close modal
      setShowConnectionForm(false);
      setDatabaseConnectionForm({
        type: 'PostgreSQL',
        name: '',
        displayName: '',
      });
      
      // Clear any previous errors
      setError(null);
      setSuccessMessage('Database connection created successfully!');
      setTimeout(() => setSuccessMessage(null), 5000); // Clear after 5 seconds
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create database connection';
      setError(errorMessage);
      console.error('❌ Failed to create database connection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!currentWorkspace) {
      setError('No workspace selected');
      return;
    }

    setIsSubmitting(true);
    setTestResult(null);

    try {
      console.log('🔍 Testing database connection:', formData);
      
      // Test the connection via API
      const result = await apiService.testDatabaseConnection(currentWorkspace._id, formData);
      console.log('✅ Connection test result:', result);
      
      setTestResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setTestResult({
        success: false,
        message: errorMessage
      });
      console.error('❌ Connection test failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              to="/workspaces"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Workspaces
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link
                to={`/workspace/${currentWorkspace?._id}`}
                className="ml-1 text-sm font-medium text-gray-700 hover:text-indigo-600 md:ml-2"
              >
                {currentWorkspace?.name}
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Datasets</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Datasets</h1>
          <p className="text-gray-600">Connect data sources and manage your datasets</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchDatabases}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => setShowConnectionForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Connect Database
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Database Connections List */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Connections</h2>
        
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading database connections...</span>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchDatabases}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : databases.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-center text-gray-500 py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8 1.79 8 4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No database connections</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by connecting your first data source.</p>
              <div className="mt-6">
                <button
                  onClick={() => setShowConnectionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Connect Database
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {databases.map((database) => (
              <div
                key={database._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {database.displayName || database.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      database.type === 'PostgreSQL' || database.type === 'MySQL' 
                        ? 'bg-blue-100 text-blue-800'
                        : database.type === 'Google BigQuery'
                        ? 'bg-purple-100 text-purple-800'
                        : database.type === 'Google Sheets'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {database.type}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-4">
                    <p><strong>Name:</strong> {database.name}</p>
                    {database.type === 'PostgreSQL' || database.type === 'MySQL' ? (
                      <>
                        <p><strong>Host:</strong> {database.host}:{database.port}</p>
                        <p><strong>Database:</strong> {database.databaseName}</p>
                      </>
                    ) : database.type === 'Google BigQuery' ? (
                      <>
                        <p><strong>Project:</strong> {database.projectId}</p>
                        <p><strong>Dataset:</strong> {database.datasetId}</p>
                      </>
                    ) : database.type === 'Google Sheets' ? (
                      <>
                        <p><strong>Sheet:</strong> {database.sheetName}</p>
                      </>
                    ) : null}
                  </div>

                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // TODO: Implement view datasets functionality
                        console.log('View datasets for database:', database._id);
                      }}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white text-center text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      View Datasets
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await apiService.deleteDatabase(currentWorkspace!._id, database._id);
                          setDatabases(prev => prev.filter(db => db._id !== database._id));
                        } catch (error) {
                          console.error('Failed to delete database:', error);
                        }
                      }}
                      className="px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Database Connection Modal */}
      {showConnectionForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Connect Database</h3>
                <button
                  onClick={() => setShowConnectionForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Database Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Database Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {databaseTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleDatabaseTypeChange(type)}
                        className={`p-3 text-sm font-medium rounded-md border transition-colors ${
                          selectedDatabaseType === type
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connection Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Connection Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter a unique name for this connection"
                  />
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Name *</label>
                  <input
                    type="text"
                    name="displayName"
                    required
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter a friendly name for this connection"
                  />
                </div>

                {/* Type-specific Connection Fields */}
                <div className="space-y-4">
                  {getConnectionFields(selectedDatabaseType)}
                </div>

                {/* Test Result */}
                {testResult && (
                  <div className={`p-3 rounded-md ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </p>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <div className="p-3 rounded-md bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700">{successMessage}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between pt-4">
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isSubmitting}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                          Testing...
                        </div>
                      ) : (
                        'Test Connection'
                      )}
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowConnectionForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Creating...
                        </div>
                      ) : (
                        'Create Connection'
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Datasets;
