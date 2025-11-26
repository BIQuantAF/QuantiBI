import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { auth } from '../config/firebase';
import {
  Workspace,
  Database,
  Dataset,
  Chart,
  Dashboard,
  CreateWorkspaceForm,
  DatabaseConnectionForm,
  ChartCreationForm,
  AIChartRequest,
  AIChartResponse
} from '../types';

class ApiService {
  async removeChartFromDashboard(workspaceId: string, dashboardId: string, chartId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/dashboards/${dashboardId}/charts/${chartId}`);
  }
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      async (config) => {
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        if (error.response) {
          if (error.response.status === 401) {
            // Handle unauthorized access
            auth.signOut();
            window.location.href = '/login';
          }
          // Handle paywall signal from backend
          if (error.response.status === 403 && error.response.data?.code === 'PAYWALL') {
            try {
              const event = new CustomEvent('quantibi:paywall', { detail: error.response.data });
              window.dispatchEvent(event as Event);
            } catch (e) {
              console.warn('Failed to dispatch paywall event', e);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Workspace APIs
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await this.api.get('/workspaces');
    return response.data;
  }

  async createWorkspace(workspaceData: CreateWorkspaceForm): Promise<Workspace> {
    const response = await this.api.post('/workspaces', workspaceData);
    return response.data;
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await this.api.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  async updateWorkspace(workspaceId: string, workspaceData: Partial<Workspace>): Promise<Workspace> {
    const response = await this.api.put(`/workspaces/${workspaceId}`, workspaceData);
    return response.data;
  }

  async deleteWorkspace(workspaceId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}`);
  }

  // Database APIs
  async getDatabases(workspaceId: string): Promise<Database[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/databases`);
    return response.data;
  }

  async createDatabase(workspaceId: string, databaseData: DatabaseConnectionForm, file?: File): Promise<Database> {
    if (file && (databaseData.type === 'XLS' || databaseData.type === 'CSV')) {
      // For file-based databases, use FormData
      const formData = new FormData();
      
      // Add all the database data
      Object.keys(databaseData).forEach(key => {
        const value = databaseData[key as keyof DatabaseConnectionForm];
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Add the file
      formData.append('file', file);
      
      const response = await this.api.post(`/workspaces/${workspaceId}/databases`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // For non-file databases, use JSON
      const response = await this.api.post(`/workspaces/${workspaceId}/databases`, databaseData);
      return response.data;
    }
  }

  async testDatabaseConnection(workspaceId: string, databaseData: DatabaseConnectionForm): Promise<{ success: boolean; message: string }> {
    const response = await this.api.post(`/workspaces/${workspaceId}/databases/test-bigquery`, databaseData);
    return response.data;
  }

  async deleteDatabase(workspaceId: string, databaseId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/databases/${databaseId}`);
  }

  // Dataset APIs
  async getDatasets(workspaceId: string): Promise<Dataset[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/datasets`);
    return response.data;
  }

  async createDataset(workspaceId: string, datasetData: import('../types').DatasetCreate): Promise<Dataset> {
    const response = await this.api.post(`/workspaces/${workspaceId}/datasets`, datasetData);
    return response.data;
  }

  async deleteDataset(workspaceId: string, datasetId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/datasets/${datasetId}`);
  }

  async getDatabaseSchemas(workspaceId: string, databaseId: string): Promise<string[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/databases/${databaseId}/schemas`);
    return response.data;
  }

  async getDatabaseTables(workspaceId: string, databaseId: string, schema?: string): Promise<string[]> {
    const params = schema ? { schema } : {};
    const response = await this.api.get(`/workspaces/${workspaceId}/databases/${databaseId}/tables`, { params });
    return response.data;
  }

  // Chart APIs
  async getCharts(workspaceId: string): Promise<Chart[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/charts`);
    return response.data;
  }

  async getChart(workspaceId: string, chartId: string): Promise<Chart> {
    const response = await this.api.get(`/workspaces/${workspaceId}/charts/${chartId}`);
    return response.data;
  }

  async createChart(workspaceId: string, chartData: ChartCreationForm): Promise<Chart> {
    const response = await this.api.post(`/workspaces/${workspaceId}/charts`, chartData);
    return response.data;
  }

  async updateChart(workspaceId: string, chartId: string, chartData: Partial<Chart>): Promise<Chart> {
    const response = await this.api.put(`/workspaces/${workspaceId}/charts/${chartId}`, chartData);
    return response.data;
  }

  async deleteChart(workspaceId: string, chartId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/charts/${chartId}`);
  }

  // AI Chart Generation
  async generateChartWithAI(workspaceId: string, aiRequest: AIChartRequest): Promise<AIChartResponse> {
    const response = await this.api.post(`/workspaces/${workspaceId}/charts/ai/generate`, aiRequest);
    return response.data;
  }

  // Dashboard APIs

  async addChartToDashboard(workspaceId: string, dashboardId: string, chartId: string): Promise<void> {
    await this.api.post(`/workspaces/${workspaceId}/dashboards/${dashboardId}/charts`, { chartId });
  }
  async getDashboards(workspaceId: string): Promise<Dashboard[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/dashboards`);
    return response.data;
  }

  async createDashboard(workspaceId: string, dashboardData: Partial<Dashboard>): Promise<Dashboard> {
    const response = await this.api.post(`/workspaces/${workspaceId}/dashboards`, dashboardData);
    return response.data;
  }

  async updateDashboard(workspaceId: string, dashboardId: string, dashboardData: Partial<Dashboard>): Promise<Dashboard> {
    const response = await this.api.put(`/workspaces/${workspaceId}/dashboards/${dashboardId}`, dashboardData);
    return response.data;
  }

  async deleteDashboard(workspaceId: string, dashboardId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/dashboards/${dashboardId}`);
  }

  // Report APIs
  async getReports(workspaceId: string): Promise<any[]> {
    const response = await this.api.get(`/workspaces/${workspaceId}/reports`);
    return response.data;
  }

  async getReport(workspaceId: string, reportId: string): Promise<any> {
    const response = await this.api.get(`/workspaces/${workspaceId}/reports/${reportId}`);
    return response.data;
  }

  async getPublicReport(shareToken: string): Promise<any> {
    const response = await this.api.get(`/reports/public/${shareToken}`);
    return response.data;
  }

  async createReport(workspaceId: string, reportData: { title: string; description?: string; datasetId: string }): Promise<any> {
    const response = await this.api.post(`/workspaces/${workspaceId}/reports`, reportData);
    return response.data;
  }

  async deleteReport(workspaceId: string, reportId: string): Promise<void> {
    await this.api.delete(`/workspaces/${workspaceId}/reports/${reportId}`);
  }

  async shareReport(workspaceId: string, reportId: string): Promise<{ shareUrl: string; shareToken: string }> {
    const response = await this.api.post(`/workspaces/${workspaceId}/reports/${reportId}/share`, {});
    return response.data;
  }

  // File Upload
  async uploadFile(workspaceId: string, file: File): Promise<{ filePath: string; fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post(`/workspaces/${workspaceId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async createCheckoutSession(priceId: string): Promise<{ url: string }> {
    const response = await this.api.post('/payments/create-checkout-session', { priceId });
    return response.data;
  }

  // Execute custom SQL query
  async executeSQL(params: { sql: string; dataset: string; workspace: string }): Promise<any> {
    const response = await this.api.post(`/workspaces/${params.workspace}/charts/execute-sql`, {
      sql: params.sql,
      dataset: params.dataset
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;
