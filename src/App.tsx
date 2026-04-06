import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { tauriClient } from './lib/tauri';
import './App.css';
import type {
  BackendStatus,
  BootstrapData,
  FinishOperationInput,
  MonitorSnapshot,
  OperationSummary,
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const value = error as { message?: unknown; error?: unknown };

    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message;
    }

    if (typeof value.error === 'string' && value.error.trim()) {
      return value.error;
    }

    if (
      typeof value.error === 'object' &&
      value.error !== null &&
      'message' in value.error &&
      typeof (value.error as { message?: unknown }).message === 'string'
    ) {
      return (value.error as { message: string }).message;
    }
  }
  return String(error);
}

function formatDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  return formatElapsedSeconds(elapsed);
}

function formatElapsedSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const h = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(safeSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

type MonitorLoginForm = {
  username: string;
  password: string;
};

type FinishDialogState = {
  completedFull: boolean;
  incompleteReason: string;
};

function SettingsGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.52 2.31a1 1 0 0 1 1.96 0l.25 1.78a7.99 7.99 0 0 1 1.89.78l1.47-1.03a1 1 0 0 1 1.38.19l1.13 1.6a1 1 0 0 1-.14 1.34l-1.37 1.2c.22.6.37 1.22.43 1.87l1.73.57a1 1 0 0 1 .68.94v1.98a1 1 0 0 1-.68.95l-1.73.56a8.2 8.2 0 0 1-.43 1.87l1.37 1.2a1 1 0 0 1 .14 1.35l-1.13 1.59a1 1 0 0 1-1.38.19l-1.47-1.02a8 8 0 0 1-1.89.77l-.25 1.79a1 1 0 0 1-1.96 0l-.25-1.79a8 8 0 0 1-1.89-.77l-1.47 1.02a1 1 0 0 1-1.38-.19l-1.13-1.59a1 1 0 0 1 .14-1.35l1.37-1.2a8.2 8.2 0 0 1-.43-1.87l-1.73-.56a1 1 0 0 1-.68-.95v-1.98a1 1 0 0 1 .68-.94l1.73-.57c.06-.65.21-1.27.43-1.87l-1.37-1.2a1 1 0 0 1-.14-1.34l1.13-1.6a1 1 0 0 1 1.38-.19l1.47 1.03a7.99 7.99 0 0 1 1.89-.78l.25-1.78ZM12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MonitorGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v7.5A2.75 2.75 0 0 1 17.25 16H13.5l1.4 2H16a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h1.1l1.4-2H6.75A2.75 2.75 0 0 1 4 13.25v-7.5ZM6.75 5a.75.75 0 0 0-.75.75v7.5c0 .41.34.75.75.75h10.5a.75.75 0 0 0 .75-.75v-7.5a.75.75 0 0 0-.75-.75H6.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

function getOperationVisualStatus(row: OperationSummary): 'in-progress' | 'finished-complete' | 'finished-incomplete' {
  if (row.status === 'started') return 'in-progress';
  return row.completed_full ? 'finished-complete' : 'finished-incomplete';
}

function getOperationStatusLabel(row: OperationSummary): string {
  const visualStatus = getOperationVisualStatus(row);

  if (visualStatus === 'in-progress') return 'EM PROCESSO';
  if (visualStatus === 'finished-complete') return 'FINALIZADO COMPLETO';
  return 'FINALIZADO INCOMPLETO';
}

function MonitorView() {
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;

    async function loadMonitor() {
      try {
        const [snapshot, runtimeValue] = await Promise.all([
          tauriClient.getMonitorSnapshot(),
          tauriClient.getRuntimeConfig(),
        ]);
        if (!isMounted) return;
        setMonitor(snapshot);
        setRuntime(runtimeValue);
        setError('');
      } catch (loadError) {
        if (!isMounted) return;
        setError(getErrorMessage(loadError));
      }
    }

    void loadMonitor();

    const monitorInterval = window.setInterval(() => {
      void loadMonitor();
    }, 3000);

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(monitorInterval);
      window.clearInterval(clockInterval);
    };
  }, []);

  const activeRows = useMemo(() => {
    if (!monitor?.active_operations) return [];

    return monitor.active_operations
      .slice()
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [monitor?.active_operations]);

  const historyRows = useMemo(() => {
    if (!monitor?.recent_operations) return [];

    return monitor.recent_operations
      .slice()
      .sort((a, b) => {
        const left = new Date(a.finished_at ?? a.started_at).getTime();
        const right = new Date(b.finished_at ?? b.started_at).getTime();
        return right - left;
      })
      .slice(0, 150);
  }, [monitor?.recent_operations]);

  const lastUpdate = monitor ? formatDateTime(monitor.generated_at) : '--';
  const activeCount = activeRows.length;
  const historyCount = historyRows.length;
  const currentTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);

  return (
    <div className="monitor-shell">
      {!monitor && !error ? (
        <section className="table-card">
          <div className="monitor-loading">Carregando historico do monitor...</div>
        </section>
      ) : null}

      {error && !monitor ? (
        <section className="table-card">
          <div className="error-box">Falha ao carregar o monitor: {error}</div>
        </section>
      ) : null}

      <section className="monitor-header">
        <div className="title-block">
          <p className="eyebrow">Monitor em tempo real</p>
          <h1>Apps rodando agora</h1>
        </div>

        <div className="summary-card">
          <span>Operacoes ativas</span>
          <strong>{activeCount}</strong>
        </div>

        <div className="summary-card">
          <span>Historico carregado</span>
          <strong>{historyCount}</strong>
        </div>

        <div className="header-status">
          <span>Agora</span>
          <strong>{currentTime}</strong>
          <span>Atualizado em {lastUpdate}</span>
        </div>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Diagnostico</p>
            <h2>Armazenamento em uso pelo monitor</h2>
          </div>
        </div>

        <div className="monitor-debug">
          <strong>Store:</strong> {runtime?.storage_path || '--'}
        </div>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Lista viva</p>
            <h2>Operador, saida CNC e data/hora</h2>
          </div>
          <div className="pill">{activeCount} em execucao</div>
        </div>

        {error ? <div className="error-box">{error}</div> : null}

        <div className="table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>OPERARIO</th>
                <th>SAIDA CNC</th>
                <th>MAQUINA</th>
                <th>PEDIDO</th>
                <th>DATA / HORA</th>
                <th>TEMPO RODANDO</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.length === 0 ? (
                <tr className="history">
                  <td colSpan={6}>Nenhum app em execucao no momento.</td>
                </tr>
              ) : (
                activeRows.map((row) => (
                  <tr key={row.operation_id} className="active">
                    <td>{row.operator_name}</td>
                    <td>{row.saida}</td>
                    <td>{row.machine_name}</td>
                    <td>{row.pedido}</td>
                    <td>{formatDateTime(row.started_at)}</td>
                    <td>{formatDuration(row.started_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-card">
        <div className="table-header">
          <div>
            <p className="eyebrow">Historico geral</p>
            <h2>Status, motivo e tempo final</h2>
          </div>
          <div className="pill">{historyRows.length} registros</div>
        </div>

        <div className="table-wrap">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>STATUS</th>
                <th>OPERARIO</th>
                <th>SAIDA CNC</th>
                <th>PEDIDO</th>
                <th>MAQUINA</th>
                <th>FINALIZADO EM</th>
                <th>TEMPO</th>
                <th>MOTIVO</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.length === 0 ? (
                <tr className="history">
                  <td colSpan={8}>Nenhum historico encontrado.</td>
                </tr>
              ) : (
                historyRows.map((row) => {
                  const visualStatus = getOperationVisualStatus(row);

                  return (
                    <tr key={`history-${row.operation_id}`} className={visualStatus}>
                      <td>{getOperationStatusLabel(row)}</td>
                      <td>{row.operator_name}</td>
                      <td>{row.saida}</td>
                      <td>{row.pedido}</td>
                      <td>{row.machine_name}</td>
                      <td>{row.finished_at ? formatDateTime(row.finished_at) : '--'}</td>
                      <td>
                        {row.elapsed_seconds !== null
                          ? formatElapsedSeconds(row.elapsed_seconds)
                          : formatDuration(row.started_at)}
                      </td>
                      <td>{row.incomplete_reason?.trim() || '--'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [isMonitorView, setIsMonitorView] = useState(
    new URLSearchParams(window.location.search).get('view') === 'monitor' ||
      window.location.hash.startsWith('#monitor')
  );
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
  const [configPaths, setConfigPaths] = useState({
    shared_store: '',
    machine_name: '',
  });

  const heartbeatTimer = useRef<number | null>(null);
  const operationTimer = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const monitorUsernameRef = useRef<HTMLInputElement | null>(null);
  const finishReasonRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    try {
      const currentWindow = getCurrentWebviewWindow();
      if (currentWindow.label === 'monitor') {
        setIsMonitorView(true);
      }
    } catch (error) {
      console.warn('Falha ao detectar a janela atual', error);
    }
  }, []);

  useEffect(() => {
    void loadInitialState();

    const monitorInterval = window.setInterval(() => {
      void handleRefreshMonitor();
    }, 10000);

    return () => {
      stopHeartbeat();
      stopTimer();
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
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 5000);
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

  if (isMonitorView) {
    return <MonitorView />;
  }

  return (
    <div className="screen">
      <main className="app-layout">
        <section className="history-panel">
          <h2 className="panel-title">HISTORICO</h2>

          <div className="history-table-frame">
            <table className="history-table">
              <thead>
                <tr>
                  <th>PEDIDO</th>
                  <th>SAIDA</th>
                  <th>TEMPO</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      {form.operador.trim()
                        ? 'Nenhum historico encontrado para este operador.'
                        : 'Selecione um operador para ver o historico.'}
                    </td>
                  </tr>
                ) : (
                  historyRows.map((row) => (
                    <tr key={row.operation_id}>
                      <td>{row.pedido}</td>
                      <td>{row.saida}</td>
                      <td>
                        {row.elapsed_seconds !== null
                          ? formatElapsedSeconds(row.elapsed_seconds)
                          : formatDuration(row.started_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="control-panel">
          <form className="control-form" onSubmit={handleStartOperation}>
            <div className="topbar">
              <div className="topbar-fields">
                <label className="machine-input-wrap">
                  <span>OPERADOR</span>
                  <input
                    className="machine-input"
                    list="operator-options"
                    value={form.operador}
                    onChange={(e) => setForm({ ...form, operador: e.target.value })}
                    disabled={isFormDisabled}
                    placeholder="Digite o nome do operador"
                  />
                </label>

                <label className="machine-input-wrap">
                  <span>NOME DA MAQUINA</span>
                  <input
                    className="machine-input"
                    value={form.maquina}
                    onChange={(e) => setForm({ ...form, maquina: e.target.value })}
                    disabled={isFormDisabled}
                    placeholder={runtime?.machine_name || 'Digite o nome da maquina'}
                  />
                </label>
                <datalist id="operator-options">
                  {operatorOptions.map((operator) => (
                    <option key={operator.id} value={operator.name} />
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                className="settings-button"
                title="Configuracoes e monitor"
                onClick={openMonitorLogin}
              >
                <SettingsGlyph />
              </button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>TIPO</span>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  disabled={isFormDisabled}
                >
                  <option value="Avulso">Avulso</option>
                  <option value="Estoque">Estoque</option>
                  <option value="Pedido">Pedido</option>
                  <option value="Reforma">Reforma</option>
                  <option value="PPD">PPD</option>
                </select>
              </label>

              <label className="field">
                <span>PEDIDO</span>
                <input
                  value={form.pedido}
                  onChange={(e) => setForm({ ...form, pedido: e.target.value })}
                  onBlur={() => {
                    void handleSearchCnc();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isFormDisabled) {
                      e.preventDefault();
                      void handleSearchCnc();
                    }
                  }}
                  disabled={isFormDisabled}
                />
              </label>

              <label className="field">
                <span>CHAPA / RETALHO</span>
                <select
                  value={form.retalho}
                  onChange={(e) => setForm({ ...form, retalho: e.target.value })}
                  disabled={isFormDisabled}
                >
                  <option value="Chapa Inteira">Chapa Inteira</option>
                  <option value="Retalho">Retalho</option>
                </select>
              </label>

              <div className="field pdf-field">
                <span>SAIDA CNC A CORTAR</span>
                <div className="saida-row">
                  <select
                    value={form.saida}
                    onChange={(e) => setForm({ ...form, saida: e.target.value })}
                    disabled={isFormDisabled || availableSaidas.length === 0}
                  >
                    <option value="" />
                    {availableSaidas.map((saida) => (
                      <option key={saida} value={saida}>
                        {saida}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="pdf-button"
                    onClick={handleOpenPdf}
                    disabled={!form.saida}
                  >
                    PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="bottom-area">
              <div className={`network-status ${storageOk ? 'ok' : 'warn'}`}>
                {storageOk
                  ? 'Pastas e gravacao compartilhada OK'
                  : 'Preparando armazenamento compartilhado...'}
              </div>

              <div className="timer-display">{timerString}</div>

              <div className="action-row">
                <button
                  type="submit"
                  className="action-btn start"
                  disabled={loading || activeOperationId !== ''}
                >
                  INICIAR
                </button>
                <button
                  type="button"
                  className="action-btn finish"
                  disabled={activeOperationId === '' || loading}
                  onClick={openFinishDialog}
                >
                  FINALIZAR
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {feedback ? <div className="toast">{feedback}</div> : null}

      {showFinishDialog ? (
        <div className="modal-backdrop" onClick={closeFinishDialog}>
          <section className="login-modal finish-modal" onClick={(event) => event.stopPropagation()}>
            <p className="login-modal-eyebrow">Finalizacao do plano</p>
            <h3>O plano foi cortado completo?</h3>

            <form className="login-form" onSubmit={handleFinishOperation}>
              <div className="finish-choice-row">
                <button
                  type="button"
                  className={`choice-button ${finishDialog.completedFull ? 'selected' : ''}`}
                  onClick={() =>
                    setFinishDialog({
                      completedFull: true,
                      incompleteReason: '',
                    })
                  }
                  disabled={loading}
                >
                  SIM
                </button>
                <button
                  type="button"
                  className={`choice-button ${!finishDialog.completedFull ? 'selected' : ''}`}
                  onClick={() =>
                    setFinishDialog((current) => ({
                      ...current,
                      completedFull: false,
                    }))
                  }
                  disabled={loading}
                >
                  NAO
                </button>
              </div>

              {!finishDialog.completedFull ? (
                <label className="field">
                  <span>POR QUE?</span>
                  <textarea
                    ref={finishReasonRef}
                    className="finish-reason"
                    value={finishDialog.incompleteReason}
                    onChange={(event) =>
                      setFinishDialog((current) => ({
                        ...current,
                        incompleteReason: event.target.value,
                      }))
                    }
                    disabled={loading}
                    placeholder="Descreva o motivo"
                  />
                </label>
              ) : null}

              <div className="login-actions">
                <button
                  type="button"
                  className="action-btn finish"
                  onClick={closeFinishDialog}
                  disabled={loading}
                >
                  CANCELAR
                </button>
                <button type="submit" className="action-btn start" disabled={loading}>
                  CONFIRMAR
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {showMonitorLogin ? (
        <div className="modal-backdrop" onClick={closeMonitorLogin}>
          <section className="login-modal" onClick={(event) => event.stopPropagation()}>
            {!isAdminAuthenticated ? (
              <>
                <p className="login-modal-eyebrow">Acesso restrito</p>
                <h3>Login Administrativo</h3>

                <form className="login-form" onSubmit={handleConfirmMonitorLogin}>
                  <label className="field">
                    <span>USUARIO</span>
                    <input
                      ref={monitorUsernameRef}
                      value={monitorLoginForm.username}
                      onChange={(event) =>
                        setMonitorLoginForm((current) => ({
                          ...current,
                          username: event.target.value,
                        }))
                      }
                      disabled={monitorLoginLoading}
                    />
                  </label>

                  <label className="field">
                    <span>SENHA</span>
                    <input
                      type="password"
                      value={monitorLoginForm.password}
                      onChange={(event) =>
                        setMonitorLoginForm((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                      disabled={monitorLoginLoading}
                    />
                  </label>

                  {monitorLoginError ? <div className="login-error">{monitorLoginError}</div> : null}

                  <div className="login-actions">
                    <button
                      type="button"
                      className="action-btn finish"
                      onClick={closeMonitorLogin}
                      disabled={monitorLoginLoading}
                    >
                      CANCELAR
                    </button>
                    <button
                      type="submit"
                      className="action-btn start"
                      disabled={monitorLoginLoading}
                    >
                      {monitorLoginLoading ? 'VALIDANDO...' : 'ENTRAR'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <div className="settings-dialog-header">
                  <div className="settings-copy">
                    <p className="login-modal-eyebrow">Configuracoes</p>
                    <h3>Caminhos do Sistema</h3>
                    <p className="settings-helper">
                      Ajuste a maquina e o armazenamento compartilhado e abra o monitor em uma janela dedicada.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="monitor-shortcut-button"
                    title="Abrir monitor"
                    onClick={handleOpenMonitorWindow}
                  >
                    <MonitorGlyph />
                  </button>
                </div>

                <div className="login-form settings-form">
                  <label className="field">
                    <span>ARMAZENAMENTO COMPARTILHADO (REDE)</span>
                    <input
                      value={configPaths.shared_store}
                      onChange={(e) =>
                        setConfigPaths({ ...configPaths, shared_store: e.target.value })
                      }
                      placeholder="Ex: \\\\servidor\\pasta\\.plan_slice ou ...\\store.json"
                    />
                  </label>
                  <label className="field">
                    <span>NOME DA MAQUINA</span>
                    <input
                      value={configPaths.machine_name}
                      onChange={(e) =>
                        setConfigPaths({ ...configPaths, machine_name: e.target.value })
                      }
                    />
                  </label>

                  <div className="login-actions settings-actions">
                    <button type="button" className="action-btn finish" onClick={closeMonitorLogin}>
                      FECHAR
                    </button>
                    <button
                      type="button"
                      className="action-btn start"
                      onClick={handleSaveConfig}
                      disabled={loading}
                    >
                      {loading ? 'SALVANDO...' : 'SALVAR'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}
