import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { tauriClient } from './lib/tauri';
import './App.css';
import type {
  BackendStatus,
  BootstrapData,
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
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
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

function MonitorView() {
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let isMounted = true;

    async function loadMonitor() {
      try {
        const snapshot = await tauriClient.getMonitorSnapshot();
        if (!isMounted) return;
        setMonitor(snapshot);
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

  const lastUpdate = monitor ? formatDateTime(monitor.generated_at) : '--';
  const activeCount = activeRows.length;
  const currentTime = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(now);

  return (
    <div className="monitor-shell">
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

        <div className="header-status">
          <span>Agora</span>
          <strong>{currentTime}</strong>
          <span>Atualizado em {lastUpdate}</span>
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
    </div>
  );
}

export default function App() {
  const isMonitorView =
    new URLSearchParams(window.location.search).get('view') === 'monitor' ||
    window.location.hash === '#monitor';
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [status, setStatus] = useState<BackendStatus | null>(null);
  const [bootstrapData, setBootstrapData] = useState<BootstrapData | null>(null);
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [form, setForm] = useState<StartOperationInput>(initialForm);
  const [availableSaidas, setAvailableSaidas] = useState<string[]>([]);
  const [activeOperationId, setActiveOperationId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);
  const [timerString, setTimerString] = useState('00:00:00');
  const [showMonitorLogin, setShowMonitorLogin] = useState(false);
  const [monitorLoginLoading, setMonitorLoginLoading] = useState(false);
  const [monitorLoginError, setMonitorLoginError] = useState('');
  const [monitorLoginForm, setMonitorLoginForm] = useState<MonitorLoginForm>({
    username: '',
    password: '',
  });

  const heartbeatTimer = useRef<number | null>(null);
  const operationTimer = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const monitorUsernameRef = useRef<HTMLInputElement | null>(null);

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
    setShowMonitorLogin(true);
    window.setTimeout(() => monitorUsernameRef.current?.focus(), 50);
  }

  function closeMonitorLogin() {
    if (monitorLoginLoading) return;
    setShowMonitorLogin(false);
    setMonitorLoginError('');
    setMonitorLoginForm({ username: '', password: '' });
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

  async function handleFinishOperation() {
    if (!activeOperationId) return;

    const confirmed = window.confirm(`Tem certeza que deseja finalizar a saida '${form.saida}'?`);
    if (!confirmed) return;

    setLoading(true);

    try {
      const result = await tauriClient.finishOperation({
        operation_id: activeOperationId,
      });

      showFeedback(`Operacao finalizada. Tempo: ${result.elapsed_seconds}s`);
      setActiveOperationId('');
      setForm((prev) => ({ ...prev, saida: '', pedido: prev.pedido }));
      setAvailableSaidas([]);
      stopTimer();
      setTimerString('00:00:00');
      await handleRefreshMonitor();
    } catch (error) {
      showFeedback(getErrorMessage(error));
    } finally {
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

  function startTimer() {
    stopTimer();
    startTimeRef.current = Date.now();

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
  }

  async function handleOpenMonitorWindow() {
    try {
      await tauriClient.openMonitorWindow();
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

      showFeedback('Abrindo monitor...');
      setShowMonitorLogin(false);
      setMonitorLoginError('');
      setMonitorLoginForm({ username: '', password: '' });
      await handleOpenMonitorWindow();
    } catch (error) {
      setMonitorLoginError(getErrorMessage(error));
    } finally {
      setMonitorLoginLoading(false);
    }
  }

  const isFormDisabled = loading || activeOperationId !== '';
  const historyRows = useMemo(() => {
    if (!monitor?.active_operations) return [];
    return monitor.active_operations
      .slice()
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 100);
  }, [monitor?.active_operations]);

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
                {historyRows.map((row) => (
                  <tr key={row.operation_id}>
                    <td>{row.pedido}</td>
                    <td>{row.saida}</td>
                    <td>{formatDuration(row.started_at)}</td>
                  </tr>
                ))}
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
                title="Abrir monitor"
                onClick={openMonitorLogin}
              >
                ⚙
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
                {storageOk ? 'Pastas e gravacao local OK' : 'Preparando armazenamento local...'}
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
                  onClick={handleFinishOperation}
                >
                  FINALIZAR
                </button>
              </div>
            </div>
          </form>
        </section>
      </main>

      {feedback ? <div className="toast">{feedback}</div> : null}

      {showMonitorLogin ? (
        <div className="modal-backdrop" onClick={closeMonitorLogin}>
          <section className="login-modal" onClick={(event) => event.stopPropagation()}>
            <p className="login-modal-eyebrow">Acesso restrito</p>
            <h3>Confirme o login para abrir o monitor</h3>

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
          </section>
        </div>
      ) : null}
    </div>
  );
}
