// User types
export interface User {
  uid: string;
  email: string;
  emailVerified: boolean;
}

// Workspace types
export interface WorkspaceMember {
  uid: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

export interface WorkspaceInvite {
  email: string;
  role: 'admin' | 'member' | 'viewer';
  token: string;
  expiresAt: string;
}

export interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: string;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
  createdAt: string;
  updatedAt: string;
}

// Database types
export interface Database {
  _id: string;
  workspace: string;
  type: 'PostgreSQL' | 'Snowflake' | 'MySQL' | 'Databricks' | 'Google BigQuery' | 'Google Sheets' | 'CSV' | 'XLS';
  name: string;
  displayName: string;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  projectId?: string;
  datasetId?: string;
  credentials?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  filePath?: string;
  fileType?: string;
  createdAt: string;
  updatedAt: string;
}

// Dataset types
export interface Dataset {
  _id: string;
  workspace: string;
  database: string;
  name: string;
  type: 'Physical' | 'Virtual';
  schema?: string;
  table?: string;
  query?: string;
  owners: string[];
  createdAt: string;
  updatedAt: string;
}

// Chart types
export interface ChartStyle {
  colors?: string[];
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  legend?: {
    position: 'top' | 'bottom' | 'left' | 'right';
    display: boolean;
  };
  title?: {
    text?: string;
    display: boolean;
    position: 'top' | 'bottom';
  };
  axis?: {
    x?: {
      title?: string;
      display: boolean;
    };
    y?: {
      title?: string;
      display: boolean;
    };
  };
}

export interface Chart {
  _id: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'radar' | 'area';
  workspace: string;
  dataset: string;
  dashboard?: string;
  owner: string;
  query: string;
  data: any;
  style: ChartStyle;
  lastModified: string;
}

// Dashboard types
export interface Dashboard {
  _id: string;
  name: string;
  description?: string;
  workspace: string;
  owner: string;
  charts: string[];
  layout?: any;
  filters?: any;
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignUpForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface CreateWorkspaceForm {
  name: string;
  description?: string;
}

export interface DatabaseConnectionForm {
  type: Database['type'];
  name: string;
  displayName: string;
  host?: string;
  port?: number;
  databaseName?: string;
  username?: string;
  password?: string;
  projectId?: string;
  datasetId?: string;
  credentials?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
}

// Chart creation types
export interface ChartCreationForm {
  name: string;
  type: Chart['type'];
  dataset: string;
  query: string;
  style?: ChartStyle;
}

export interface AIChartRequest {
  query: string;
  dataset: string;
  workspace: string;
}

export interface AIChartResponse {
  sql: string;
  chartType: Chart['type'];
  data: any;
  suggestions?: string[];
}
