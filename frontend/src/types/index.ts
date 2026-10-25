export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface ColumnMeta {
  name: string;
  dtype: string;
  null_count: number;
  unique_count: number;
  sample_values: any[];
}

export interface Dataset {
  id: number;
  name: string;
  filename: string;
  row_count: number;
  col_count: number;
  target_column?: string;
  feature_columns?: string[];
  is_sample: number;
  created_at: string;
  columns_meta?: ColumnMeta[];
  summary_stats?: Record<string, Record<string, number>>;
  preview_rows?: Record<string, any>[];
}

export interface PreprocessResult {
  dataset_id: number;
  total_samples: number;
  train_samples: number;
  test_samples: number;
  num_features: number;
  target_column: string;
  feature_names: string[];
  classes: string[];
  class_distribution: Record<string, number>;
  train_preview: number[][];
  test_preview: number[][];
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  confusion_matrix: number[][];
  roc_auc?: number;
  roc_curve?: {
    fpr: number[];
    tpr: number[];
  };
  support_vectors_count: number;
  support_vector_indices?: number[];
  dual_coefficients_count?: number;
  classes: string[];
}

export interface Experiment {
  id: number;
  name: string;
  description?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  dataset_id: number;
  dataset_name?: string;
  feature_map_type: 'ZZFeatureMap' | 'PauliFeatureMap' | 'ZFeatureMap' | 'AngleEncoding';
  num_qubits: number;
  circuit_depth: number;
  c_param: number;
  classical_kernel: string;
  test_size?: number;
  random_seed?: number;
  circuit_depth_actual?: number;
  circuit_gate_count?: number;
  qiskit_circuit_str?: string;
  qasm_code?: string;
  kernel_compute_time?: number;
  qsvm_train_time?: number;
  qsvm_predict_time?: number;
  classical_train_time?: number;
  classical_predict_time?: number;
  qsvm_metrics?: ModelMetrics;
  classical_metrics?: ModelMetrics;
  kernel_matrix_sample?: number[][];
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface CircuitPreview {
  feature_map_type: string;
  num_qubits: number;
  circuit_depth: number;
  gate_count: number;
  gates_breakdown: Record<string, number>;
  qiskit_diagram_ascii: string;
  qasm_code: string;
  circuit_json_layers: any[];
  explanation: string;
}

export interface KernelPreview {
  feature_map_type: string;
  num_qubits: number;
  matrix_dim: number;
  kernel_matrix: number[][];
  is_symmetric: boolean;
  is_positive_semidefinite: boolean;
  compute_time_seconds: number;
  min_value: number;
  max_value: number;
  diagonal_mean: number;
}

export interface PredictionRecord {
  id: number;
  experiment_id: number;
  input_features: Record<string, any>;
  qsvm_predicted_label: string;
  classical_predicted_label?: string;
  confidence?: number;
  latency_ms?: number;
  is_batch: number;
  created_at: string;
}

export interface DashboardStats {
  user: User;
  total_datasets: number;
  total_experiments: number;
  completed_experiments: number;
  running_experiments: number;
  failed_experiments: number;
  recent_predictions: PredictionRecord[];
  history_charts: Array<{
    experiment_id: number;
    name: string;
    qsvm_accuracy: number;
    classical_accuracy: number;
    qsvm_f1: number;
    classical_f1: number;
    kernel_time: number;
    classical_time: number;
  }>;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  suspended_users: number;
  total_datasets: number;
  total_experiments: number;
  completed_experiments: number;
  failed_experiments: number;
  total_predictions: number;
  system_health: 'optimal' | 'warning' | 'degraded';
  memory_usage_mb: number;
  cpu_usage_percent: number;
  python_quantum_backend: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_email?: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}
