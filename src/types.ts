export type RuntimeConfig = {
  app_env: string;
  machine_name: string;
  storage_path: string;
  production_base_path: string;
  server_path: string;
  saidas_cnc_path: string;
  saidas_cortadas_path: string;
  pdf_planos_path: string;
  lock_timeout_seconds: number;
  store_lock_stale_seconds: number;
  monitor_username?: string | null;
  monitor_password?: string | null;
};

export type BackendStatus = {
  app_name: string;
  app_env: string;
  storage_configured: boolean;
  storage_ready: boolean;
  machine_name: string;
  checked_at: string;
};

export type StorageCheckResult = {
  ok: boolean;
  message: string;
  checked_at: string;
};

export type MachineSummary = {
  id: number;
  name: string;
  is_active: boolean;
};

export type OperatorSummary = {
  id: number;
  name: string;
};

export type OperationSummary = {
  operation_id: string;
  pedido: string;
  operator_name: string;
  machine_name: string;
  saida: string;
  tipo: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number | null;
  completed_full: boolean | null;
  incomplete_reason: string | null;
};

export type ActiveLockSummary = {
  machine_name: string;
  saida: string;
  operator_name: string;
  operation_id: string;
  heartbeat_at: string;
};

export type MonitorSnapshot = {
  active_operations: OperationSummary[];
  active_locks: ActiveLockSummary[];
  recent_operations: OperationSummary[];
  machines: MachineSummary[];
  generated_at: string;
};

export type BootstrapResult = {
  ok: boolean;
  message: string;
};

export type StartOperationInput = {
  pedido: string;
  operador: string;
  maquina: string;
  retalho?: string;
  saida: string;
  tipo?: string;
  owner_id?: string;
};

export type StartOperationResult = {
  operation_id: string;
  status: string;
  message: string;
};

export type FinishOperationResult = {
  operation_id: string;
  status: string;
  elapsed_seconds: number;
  message: string;
};

export type FinishOperationInput = {
  operation_id: string;
  completed_full: boolean;
  incomplete_reason?: string | null;
};

export type LockHeartbeatResult = {
  ok: boolean;
  message: string;
  heartbeat_at: string;
};

export type BootstrapData = {
  runtime: RuntimeConfig;
  machines: MachineSummary[];
  operators: OperatorSummary[];
  generated_at: string;
};

export type SearchCncInput = {
  pedido: string;
  tipo: string;
};

export type SearchCncResult = {
  files: string[];
};

export type OpenPdfInput = {
  cnc_filename: string;
};

export type MonitorLoginInput = {
  username: string;
  password: string;
};

export type MonitorLoginResult = {
  ok: boolean;
  message: string;
};

export type MonitorLoginForm = {
  username: string;
  password: string;
};

export type FinishDialogState = {
  completedFull: boolean;
  incompleteReason: string;
};

export type ConfigPaths = {
  shared_store: string;
  machine_name: string;
  app_env: string;
  production_base_path: string;
  server_path: string;
  saidas_cnc_path: string;
  saidas_cortadas_path: string;
  pdf_planos_path: string;
  lock_timeout_seconds: number;
  store_lock_stale_seconds: number;
  monitor_username?: string;
  monitor_password?: string;
};

