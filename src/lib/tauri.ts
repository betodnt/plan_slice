import { invoke } from "@tauri-apps/api/core";
import type {
  BackendStatus,
  BootstrapData,
  BootstrapResult,
  FinishOperationInput,
  FinishOperationResult,
  LockHeartbeatResult,
  MonitorLoginInput,
  MonitorLoginResult,
  MonitorSnapshot,
  RuntimeConfig,
  StorageCheckResult,
  StartOperationInput,
  StartOperationResult,
  SearchCncInput,
  SearchCncResult,
  OpenPdfInput
} from "../types";

type LockHeartbeatInput = {
  operation_id: string;
};

export type SaveConfigInput = {
  machine_name: string;
  storage_path: string;
  app_env: string;
  production_base_path: string;
  server_path: string;
  saidas_cnc_path: string;
  saidas_cortadas_path: string;
  pdf_planos_path: string;
  lock_timeout_seconds: number;
  store_lock_stale_seconds: number;
};

export const tauriClient = {
  getRuntimeConfig() {
    return invoke<RuntimeConfig>("get_runtime_config");
  },
  getBackendStatus() {
    return invoke<BackendStatus>("get_backend_status");
  },
  testStorage() {
    return invoke<StorageCheckResult>("test_storage");
  },
  bootstrapStorage() {
    return invoke<BootstrapResult>("bootstrap_storage");
  },
  getBootstrapData() {
    return invoke<BootstrapData>("get_bootstrap_data");
  },
  startOperation(input: StartOperationInput) {
    return invoke<StartOperationResult>("start_operation", { input });
  },
  finishOperation(input: FinishOperationInput) {
    return invoke<FinishOperationResult>("finish_operation", { input });
  },
  touchOperationLock(input: LockHeartbeatInput) {
    return invoke<LockHeartbeatResult>("touch_operation_lock", { input });
  },
  getMonitorSnapshot() {
    return invoke<MonitorSnapshot>("get_monitor_snapshot");
  },
  searchCncFiles(input: SearchCncInput) {
    return invoke<SearchCncResult>("search_cnc_files", { input });
  },
  openPdf(input: OpenPdfInput) {
    return invoke<boolean>("open_pdf", { input });
  },
  openMonitorWindow() {
    return invoke<void>("open_monitor_window");
  },
  validateMonitorLogin(input: MonitorLoginInput) {
    return invoke<MonitorLoginResult>("validate_monitor_login", { input });
  },
  saveConfig(input: SaveConfigInput) {
    return invoke<void>("save_config", { input });
  }
};
