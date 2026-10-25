import api from './client';
import {
  AuthResponse, User, Dataset, PreprocessResult,
  Experiment, CircuitPreview, KernelPreview,
  PredictionRecord, DashboardStats, AdminStats, AuditLogItem
} from '../types';

export const authApi = {
  login: async (credentials: { username_or_email: string; password: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', credentials);
    return res.data;
  },
  register: async (data: { email: string; username: string; password: string; full_name?: string }): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: { full_name?: string; password?: string }): Promise<User> => {
    const res = await api.put<User>('/auth/profile', data);
    return res.data;
  },
  forgotPassword: async (email: string) => {
    const res = await api.post('/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token: string, new_password: string) => {
    const res = await api.post('/auth/reset-password', { token, new_password });
    return res.data;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
};

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await api.get<DashboardStats>('/dashboard/stats');
    return res.data;
  }
};

export const datasetsApi = {
  list: async (): Promise<Dataset[]> => {
    const res = await api.get<Dataset[]>('/datasets');
    return res.data;
  },
  get: async (id: number): Promise<Dataset> => {
    const res = await api.get<Dataset>(`/datasets/${id}`);
    return res.data;
  },
  upload: async (formData: FormData): Promise<Dataset> => {
    const res = await api.post<Dataset>('/datasets/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  preprocessPreview: async (id: number, config: any): Promise<PreprocessResult> => {
    const res = await api.post<PreprocessResult>(`/datasets/${id}/preprocess`, config);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/datasets/${id}`);
    return res.data;
  }
};

export const quantumApi = {
  listFeatureMaps: async () => {
    const res = await api.get('/quantum/feature-maps');
    return res.data;
  },
  previewCircuit: async (data: {
    feature_map_type: string;
    num_qubits: number;
    circuit_depth: number;
    entanglement?: string;
    sample_values?: number[];
  }): Promise<CircuitPreview> => {
    const res = await api.post<CircuitPreview>('/quantum/circuit/preview', data);
    return res.data;
  },
  previewKernel: async (data: {
    dataset_id?: number;
    feature_map_type: string;
    num_qubits: number;
    circuit_depth: number;
    sample_size?: number;
  }): Promise<KernelPreview> => {
    const res = await api.post<KernelPreview>('/quantum/kernel/preview', data);
    return res.data;
  }
};

export const experimentsApi = {
  list: async (): Promise<Experiment[]> => {
    const res = await api.get<Experiment[]>('/experiments');
    return res.data;
  },
  get: async (id: number): Promise<Experiment> => {
    const res = await api.get<Experiment>(`/experiments/${id}`);
    return res.data;
  },
  create: async (data: any): Promise<Experiment> => {
    const res = await api.post<Experiment>('/experiments', data);
    return res.data;
  },
  cancel: async (id: number) => {
    const res = await api.post(`/experiments/${id}/cancel`);
    return res.data;
  },
  delete: async (id: number) => {
    const res = await api.delete(`/experiments/${id}`);
    return res.data;
  }
};

export const predictionsApi = {
  singlePredict: async (data: { experiment_id: number; features: Record<string, number> }) => {
    const res = await api.post('/predictions/single', data);
    return res.data;
  },
  batchPredict: async (experiment_id: number, file: File) => {
    const formData = new FormData();
    formData.append('experiment_id', experiment_id.toString());
    formData.append('file', file);
    const res = await api.post('/predictions/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getHistory: async (): Promise<PredictionRecord[]> => {
    const res = await api.get<PredictionRecord[]>('/predictions/history');
    return res.data;
  }
};

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/stats');
    return res.data;
  },
  listUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/admin/users');
    return res.data;
  },
  updateUserStatus: async (userId: number, is_active: boolean, role?: string) => {
    const res = await api.put(`/admin/users/${userId}/status`, { is_active, role });
    return res.data;
  },
  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    const res = await api.get<AuditLogItem[]>('/admin/audit-logs');
    return res.data;
  }
};
