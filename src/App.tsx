import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ControlPanel } from './components/main/ControlPanel';
import { FinishOperationModal } from './components/main/FinishOperationModal';
import { HistoryPanel } from './components/main/HistoryPanel';
import { MonitorAccessModal } from './components/main/MonitorAccessModal';
import { useActiveOperation } from './hooks/useActiveOperation';
import { getErrorMessage } from './lib/errors';
import { tauriClient } from './lib/tauri';
import MonitorPage from './pages/MonitorPage';
import type {
  BackendStatus,
  BootstrapData,
  ConfigPaths,
  FinishDialogState,
  FinishOperationInput,
  MonitorLoginForm,
  MonitorSnapshot,
  RuntimeConfig,
  StartOperationInput,
} from './types';

const initialForm: StartOperationInput = {
  pedido: '',
  operador: '',
  maquina: '',
  retalho: 'Chapa Inteira',
  saida: '',
  tipo: 'Avulso',
  owner_id: 'desktop-tauri',
};

function detectMonitorView(): boolean {
  // Em ambiente de desenvolvimento web/teste, o tauri-apps/api pode não estar disponível
  // ou falhar ao invocar comandos nativos.
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'monitor' || window.location.hash.includes('monitor')) {
    return true;
  }

  try {
    // Tenta obter a janela atual. Se falhar (ex: ambiente web puro), tratamos o erro.
    const win = getCurrentWebviewWindow();
    return win.label === 'monitor';
  } catch (err) {
    // Silencioso em produção, útil em desenvolvimento
    return false;
  }
}

function MainApp() {
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [bootstrapData, setBootstrapData] = useState<BootstrapData | null>(null);
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [form, setForm] = useState<StartOperationInput>(initialForm);
  const [availableSaidas, setAvailableSaidas] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFinishingOperation, setIsFinishingOperation] = useState(false);
  const [showFinishDialog, setShowFinishDialog] = useState(false);
  const [finishDialog, setFinishDialog] = useState<FinishDialogState>({
    completedFull: true,
    incompleteReason: '',
  });
  const [showMonitorLogin, setShowMonitorLogin] = useState(false);
  const [monitorLoginLoading, setMonitorLoginLoading] = useState(false);
  const [monitorLoginError, setMonitorLoginError] = useState('');
  const [monitorLoginForm, setMonitorLoginForm] = useState<MonitorLoginForm>({
    username: '',
    password: '',
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [configPaths, setConfigPaths] = useState<ConfigPaths>({
    shared_store: '',
    machine_name: '',
    app_env: '',
    production_base_path: '',
    server_path: '',
    saidas_cnc_path: '',
    saidas_cortadas_path: '',
    pdf_planos_path: '',
    lock_timeout_seconds: 14400,
    store_lock_stale_seconds: 30,
  });

  const monitorUsernameRef = useRef<HTMLInputElement | null>(null);
  const finishReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }

    setFeedback(message);
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback('');
      feedbackTimer.current = null;
    }, 5000);
  }, []);

  const handleRefreshMonitor = useCallback(async () => {
    try {
      const snapshot = await tauriClient.getMonitorSnapshot();
      setMonitor(snapshot);
    } catch (error) {
      console.warn('Monitor erro:', error);
    }
  }, []);

  const handleLoadBootstrapData = useCallback(async () => {
    try {
      const data = await tauriClient.getBootstrapData();
      setBootstrapData(data);
      setForm((current) => ({
        ...current,
        maquina: current.maquina || data.runtime.machine_name,
        operador: current.operador || data.operators[0]?.name || '',
      }));
    } catch (error) {
      showFeedback(getErrorMessage(error));
    }
  }, [showFeedback]);

  const loadInitialState = useCallback(async () => {
    try {
      const storageBootstrap = await tauriClient.bootstrapStorage();
      if (!storageBootstrap.ok) console.warn('Bootstrap falhou', storageBootstrap.message);

      const [runtimeValue, statusValue] = await Promise.all([
        tauriClient.getRuntimeConfig(),
        tauriClient.getBackendStatus(),
      ]);

      setRuntime(runtimeValue);
      setStatus(statusValue);

      await handleLoadBootstrapData();
      await handleRefreshMonitor();
    } catch (error) {
      showFeedback(getErrorMessage(error));
    }
  }, [handleLoadBootstrapData, handleRefreshMonitor, showFeedback]);

  const {
    activeOperationId,
    timerString,
    setActiveOperationId,
    setTimerString,
    startTimer,
    stopTimer,
  } = useActiveOperation({
    monitor,
    machineName: form.maquina,
    operatorName: form.operador,
    isFinishingOperation,
    onFeedback: showFeedback,
  });

  useEffect(() => {
    void loadInitialState();

    const monitorInterval = window.setInterval(() => {
      void handleRefreshMonitor();
    }, 3000);

    return () => {
      stopTimer();
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
      window.clearInterval(monitorInterval);
    };
  }, [handleRefreshMonitor, loadInitialState, stopTimer]);

  const handleFormChange = useCallback((patch: Partial<StartOperationInput>) => {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const handleFinishDialogChange = useCallback((patch: Partial<FinishDialogState>) => {
    setFinishDialog((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const handleMonitorLoginFormChange = useCallback((patch: Partial<MonitorLoginForm>) => {
    setMonitorLoginForm((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const handleConfigPathsChange = useCallback((patch: Partial<ConfigPaths>) => {
    setConfigPaths((current) => ({
      ...current,
      ...patch,
    }));
  }, []);

  const openMonitorLogin = useCallback(() => {
    setMonitorLoginForm({ username: '', password: '' });
    setMonitorLoginError('');
    setIsAdminAuthenticated(false);
    setShowMonitorLogin(true);

    if (runtime) {
      setConfigPaths({
        shared_store: runtime.storage_path || '',
        machine_name: runtime.machine_name || '',
        app_env: runtime.app_env || 'production',
        production_base_path: runtime.production_base_path || '',
        server_path: runtime.server_path || '',
        saidas_cnc_path: runtime.saidas_cnc_path || '',
        saidas_cortadas_path: runtime.saidas_cortadas_path || '',
        pdf_planos_path: runtime.pdf_planos_path || '',
        lock_timeout_seconds: runtime.lock_timeout_seconds || 14400,
        store_lock_stale_seconds: runtime.store_lock_stale_seconds || 30,
      });
    }

    window.setTimeout(() => monitorUsernameRef.current?.focus(), 50);
  }, [runtime]);

  const closeMonitorLogin = useCallback(() => {
    if (monitorLoginLoading) return;
    setShowMonitorLogin(false);
    setIsAdminAuthenticated(false);
    setMonitorLoginError('');
    setMonitorLoginForm({ username: '', password: '' });
  }, [monitorLoginLoading]);

  const openFinishDialog = useCallback(() => {
    if (!activeOperationId || loading) return;
    setFinishDialog({
      completedFull: true,
      incompleteReason: '',
    });
    setShowFinishDialog(true);
  }, [activeOperationId, loading]);

  const closeFinishDialog = useCallback(() => {
    if (loading) return;
    setShowFinishDialog(false);
    setFinishDialog({
      completedFull: true,
      incompleteReason: '',
    });
  }, [loading]);

  const handleSearchCnc = useCallback(async () => {
    if (!form.pedido || !form.tipo) return;
    setLoading(true);

    try {
      const result = await tauriClient.searchCncFiles({
        pedido: form.pedido,
        tipo: form.tipo,
      });

      const lockedSaidas = monitor?.active_locks.map((lock) => lock.saida) || [];
      const available = result.files.filter((file) => !lockedSaidas.includes(file));

      setAvailableSaidas(available);

      if (available.length > 0) {
        setForm((prev) => ({ ...prev, saida: available[0] }));
      } else {
        setForm((prev) => ({ ...prev, saida: '' }));
        showFeedback('Nenhuma saida disponivel encontrada.');
      }
    } catch (error) {
      showFeedback(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [form.pedido, form.tipo, monitor?.active_locks, showFeedback]);

  const handleOpenPdf = useCallback(async () => {
    if (!form.saida) return;

    try {
      await tauriClient.openPdf({ cnc_filename: form.saida });
    } catch (error) {
      showFeedback(getErrorMessage(error));
    }
  }, [form.saida, showFeedback]);

  const handleStartOperation = useCallback(
    async (event?: FormEvent) => {
      if (event) event.preventDefault();

      if (!form.saida || !form.operador || !form.maquina) {
        showFeedback('Preencha os campos obrigatorios.');
        return;
      }

      setLoading(true);

      try {
        const result = await tauriClient.startOperation(form);
        setActiveOperationId(result.operation_id);
        showFeedback('Corte iniciado com sucesso.');
        startTimer();
        await handleRefreshMonitor();
        await handleLoadBootstrapData();
      } catch (error) {
        showFeedback(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    },
    [form, handleLoadBootstrapData, handleRefreshMonitor, setActiveOperationId, showFeedback, startTimer]
  );

  const handleFinishOperation = useCallback(
    async (event?: FormEvent) => {
      if (event) event.preventDefault();
      if (!activeOperationId) return;
      if (!finishDialog.completedFull && !finishDialog.incompleteReason.trim()) {
        showFeedback('Informe o motivo quando o plano nao for cortado completo.');
        window.setTimeout(() => finishReasonRef.current?.focus(), 50);
        return;
      }

      const operationIdToFinish = activeOperationId;
      const currentSaida = form.saida;
      const finishPayload: FinishOperationInput = {
        operation_id: operationIdToFinish,
        completed_full: finishDialog.completedFull,
        incomplete_reason: finishDialog.completedFull ? null : finishDialog.incompleteReason.trim(),
      };

      setLoading(true);
      setIsFinishingOperation(true);
      setShowFinishDialog(false);
      stopTimer();
      setTimerString('00:00:00');
      setActiveOperationId('');

      try {
        const result = await tauriClient.finishOperation(finishPayload);

        showFeedback(`Operacao finalizada. Tempo: ${result.elapsed_seconds}s`);
        setForm((prev) => ({ ...prev, saida: '', pedido: prev.pedido }));
        setAvailableSaidas([]);
        setFinishDialog({
          completedFull: true,
          incompleteReason: '',
        });
        await handleRefreshMonitor();
      } catch (error) {
        setActiveOperationId(operationIdToFinish);
        setForm((prev) => ({ ...prev, saida: prev.saida || currentSaida }));
        setShowFinishDialog(true);
        await handleRefreshMonitor();
        showFeedback(getErrorMessage(error));
      } finally {
        setIsFinishingOperation(false);
        setLoading(false);
      }
    },
    [
      activeOperationId,
      finishDialog,
      form.saida,
      handleRefreshMonitor,
      setActiveOperationId,
      setTimerString,
      showFeedback,
      stopTimer,
    ]
  );

  const handleConfirmMonitorLogin = useCallback(
    async (event?: FormEvent) => {
      if (event) event.preventDefault();

      if (!monitorLoginForm.username.trim() || !monitorLoginForm.password) {
        setMonitorLoginError('Informe usuario e senha.');
        return;
      }

      setMonitorLoginLoading(true);

      try {
        const result = await tauriClient.validateMonitorLogin(monitorLoginForm);

        if (!result.ok) {
          setMonitorLoginError(result.message);
          return;
        }

        setMonitorLoginError('');
        setIsAdminAuthenticated(true);
      } catch (error) {
        setMonitorLoginError(getErrorMessage(error));
      } finally {
        setMonitorLoginLoading(false);
      }
    },
    [monitorLoginForm]
  );

  const handleSaveConfig = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await tauriClient.saveConfig({
        machine_name: configPaths.machine_name,
        storage_path: configPaths.shared_store,
        app_env: configPaths.app_env,
        production_base_path: configPaths.production_base_path,
        server_path: configPaths.server_path,
        saidas_cnc_path: configPaths.saidas_cnc_path,
        saidas_cortadas_path: configPaths.saidas_cortadas_path,
        pdf_planos_path: configPaths.pdf_planos_path,
        lock_timeout_seconds: configPaths.lock_timeout_seconds,
        store_lock_stale_seconds: configPaths.store_lock_stale_seconds,
      });
      showFeedback('Configuracoes salvas com sucesso.');
      await loadInitialState();
    } catch (error) {
      showFeedback(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [configPaths, loading, loadInitialState, showFeedback]);

  const isFormDisabled = loading || activeOperationId !== '';
  const historyRows = useMemo(() => {
    if (!monitor?.recent_operations || !form.operador.trim()) return [];
    const selectedOperator = form.operador.trim().toLocaleLowerCase('pt-BR');

    return monitor.recent_operations
      .slice()
      .filter((row) => row.operator_name.trim().toLocaleLowerCase('pt-BR') === selectedOperator)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 100);
  }, [form.operador, monitor?.recent_operations]);

  const operatorOptions = bootstrapData?.operators ?? [];
  const storageOk = !!status?.storage_ready;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <main className="grid min-h-[calc(100vh-3rem)] grid-cols-[minmax(340px,0.82fr)_minmax(680px,1.28fr)] gap-6">
        <HistoryPanel historyRows={historyRows} operatorName={form.operador} />
        <ControlPanel
          form={form}
          operatorOptions={operatorOptions}
          runtimeMachineName={runtime?.machine_name}
          isFormDisabled={isFormDisabled}
          availableSaidas={availableSaidas}
          storageOk={storageOk}
          timerString={timerString}
          loading={loading}
          activeOperationId={activeOperationId}
          onSubmit={handleStartOperation}
          onFormChange={handleFormChange}
          onOpenMonitorLogin={openMonitorLogin}
          onPedidoLookup={handleSearchCnc}
          onOpenPdf={handleOpenPdf}
          onOpenFinishDialog={openFinishDialog}
        />
      </main>

      {feedback ? (
        <div className="pointer-events-none fixed inset-x-0 top-6 z-40 flex justify-center px-4">
          <div className="max-w-xl rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-100 shadow-2xl">
            {feedback}
          </div>
        </div>
      ) : null}

      <FinishOperationModal
        open={showFinishDialog}
        loading={loading}
        finishDialog={finishDialog}
        finishReasonRef={finishReasonRef}
        onClose={closeFinishDialog}
        onChange={handleFinishDialogChange}
        onSubmit={handleFinishOperation}
      />

      <MonitorAccessModal
        open={showMonitorLogin}
        onClose={closeMonitorLogin}
        isAdminAuthenticated={isAdminAuthenticated}
        monitorLoginLoading={monitorLoginLoading}
        monitorLoginError={monitorLoginError}
        monitorLoginForm={monitorLoginForm}
        monitorUsernameRef={monitorUsernameRef}
        onMonitorLoginFormChange={handleMonitorLoginFormChange}
        onConfirmMonitorLogin={handleConfirmMonitorLogin}
        configPaths={configPaths}
        onConfigPathsChange={handleConfigPathsChange}
        onSaveConfig={handleSaveConfig}
        loading={loading}
      />
    </div>
  );
}

export default function App() {
  return detectMonitorView() ? <MonitorPage /> : <MainApp />;
}
