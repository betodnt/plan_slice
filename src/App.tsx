import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { ControlPanel } from './components/main/ControlPanel';
import { FinishOperationModal } from './components/main/FinishOperationModal';
import { HistoryPanel } from './components/main/HistoryPanel';
import { MonitorAccessModal } from './components/main/MonitorAccessModal';
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
  pedido: '2130',
  operador: '',
  maquina: '',
  retalho: 'Chapa Inteira',
  saida: '',
  tipo: 'Avulso',
  owner_id: 'desktop-tauri',
};

function detectMonitorView(): boolean {
  if (
    new URLSearchParams(window.location.search).get('view') === 'monitor' ||
    window.location.hash.startsWith('#monitor')
  ) {
    return true;
  }

  try {
    return getCurrentWebviewWindow().label === 'monitor';
  } catch {
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
  const [activeOperationId, setActiveOperationId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFinishingOperation, setIsFinishingOperation] = useState(false);
  const [timerString, setTimerString] = useState('00:00:00');
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
  });

  const heartbeatTimer = useRef<number | null>(null);
  const operationTimer = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const monitorUsernameRef = useRef<HTMLInputElement | null>(null);
  const finishReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const feedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    void loadInitialState();

    const monitorInterval = window.setInterval(() => {
      void handleRefreshMonitor();
    }, 10000);

    return () => {
      stopHeartbeat();
      stopTimer();
      if (feedbackTimer.current !== null) {
        window.clearTimeout(feedbackTimer.current);
      }
      window.clearInterval(monitorInterval);
    };
  }, []);

  useEffect(() => {
    if (!activeOperationId) {
      stopHeartbeat();
      stopTimer();
      return;
    }

    void sendHeartbeat();
    heartbeatTimer.current = window.setInterval(() => {
      void sendHeartbeat();
    }, 15000);

    return () => stopHeartbeat();
  }, [activeOperationId]);

  useEffect(() => {
    if (isFinishingOperation) {
      return;
    }

    if (!monitor?.active_operations || !form.maquina.trim()) return;

    const currentOperation = monitor.active_operations.find((row) => {
      const sameMachine = row.machine_name.trim() === form.maquina.trim();
      const sameOperator =
        !form.operador.trim() || row.operator_name.trim() === form.operador.trim();

      return sameMachine && sameOperator;
    });

    if (!currentOperation) {
      if (activeOperationId) {
        setActiveOperationId('');
        setTimerString('00:00:00');
        stopTimer();
      }
      return;
    }

    if (activeOperationId !== currentOperation.operation_id) {
      setActiveOperationId(currentOperation.operation_id);
    }

    if (operationTimer.current === null) {
      startTimer(currentOperation.started_at);
    }
  }, [activeOperationId, form.maquina, form.operador, isFinishingOperation, monitor?.active_operations]);

  async function loadInitialState() {
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
  }

  async function handleLoadBootstrapData() {
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
  }

  async function handleRefreshMonitor() {
    try {
      const snapshot = await tauriClient.getMonitorSnapshot();
      setMonitor(snapshot);
    } catch (error) {
      console.warn('Monitor erro:', error);
    }
  }

  function showFeedback(message: string) {
    if (feedbackTimer.current !== null) {
      window.clearTimeout(feedbackTimer.current);
    }

    setFeedback(message);
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback('');
      feedbackTimer.current = null;
    }, 5000);
  }

  function handleFormChange(patch: Partial<StartOperationInput>) {
    setForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleFinishDialogChange(patch: Partial<FinishDialogState>) {
    setFinishDialog((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleMonitorLoginFormChange(patch: Partial<MonitorLoginForm>) {
    setMonitorLoginForm((current) => ({
      ...current,
      ...patch,
    }));
  }

  function handleConfigPathsChange(patch: Partial<ConfigPaths>) {
    setConfigPaths((current) => ({
      ...current,
      ...patch,
    }));
  }

  function openMonitorLogin() {
    setMonitorLoginForm({ username: '', password: '' });
    setMonitorLoginError('');
    setIsAdminAuthenticated(false);
    setShowMonitorLogin(true);

    if (runtime) {
      setConfigPaths({
        shared_store: runtime.storage_path || '',
        machine_name: runtime.machine_name || '',
      });
    }

    window.setTimeout(() => monitorUsernameRef.current?.focus(), 50);
  }

  function closeMonitorLogin() {
    if (monitorLoginLoading) return;
    setShowMonitorLogin(false);
    setIsAdminAuthenticated(false);
    setMonitorLoginError('');
    setMonitorLoginForm({ username: '', password: '' });
  }

  function openFinishDialog() {
    if (!activeOperationId || loading) return;
    setFinishDialog({
      completedFull: true,
      incompleteReason: '',
    });
    setShowFinishDialog(true);
  }

  function closeFinishDialog() {
    if (loading) return;
    setShowFinishDialog(false);
    setFinishDialog({
      completedFull: true,
      incompleteReason: '',
    });
  }

  async function handleSearchCnc() {
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
  }

  async function handleOpenPdf() {
    if (!form.saida) return;

    try {
      await tauriClient.openPdf({ cnc_filename: form.saida });
    } catch (error) {
      showFeedback(getErrorMessage(error));
    }
  }

  async function handleStartOperation(event?: FormEvent) {
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
  }

  async function handleFinishOperation(event?: FormEvent) {
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
  }

  async function sendHeartbeat() {
    if (!activeOperationId) return;

    try {
      const result = await tauriClient.touchOperationLock({
        operation_id: activeOperationId,
      });
      if (!result.ok) showFeedback(result.message);
    } catch (error) {
      console.warn('Heartbeat failed', error);
    }
  }

  function stopHeartbeat() {
    if (heartbeatTimer.current !== null) {
      window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }

  function startTimer(startedAt?: string) {
    stopTimer();
    startTimeRef.current = startedAt ? new Date(startedAt).getTime() : Date.now();

    operationTimer.current = window.setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsedMs = Date.now() - startTimeRef.current;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      setTimerString(`${h}:${m}:${s}`);
    }, 1000);
  }

  function stopTimer() {
    if (operationTimer.current !== null) {
      window.clearInterval(operationTimer.current);
      operationTimer.current = null;
    }
    startTimeRef.current = null;
  }

  async function handleOpenMonitorWindow() {
    try {
      await tauriClient.openMonitorWindow();
      showFeedback('Monitor aberto em uma nova janela.');
    } catch (error) {
      showFeedback(getErrorMessage(error));
    }
  }

  async function handleConfirmMonitorLogin(event?: FormEvent) {
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
  }

  async function handleSaveConfig() {
    if (loading) return;
    setLoading(true);
    try {
      await tauriClient.saveConfig({
        machine_name: configPaths.machine_name,
        storage_path: configPaths.shared_store,
      });
      showFeedback('Configuracoes salvas com sucesso.');
      await loadInitialState();
    } catch (error) {
      showFeedback(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

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
        onOpenMonitorWindow={handleOpenMonitorWindow}
        onSaveConfig={handleSaveConfig}
        loading={loading}
      />
    </div>
  );
}

export default function App() {
  return detectMonitorView() ? <MonitorPage /> : <MainApp />;
}
