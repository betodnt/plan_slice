import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveOperationsTable } from '../components/monitor/ActiveOperationsTable';
import { MonitorHeader } from '../components/monitor/MonitorHeader';
import { MonitorHistoryTable } from '../components/monitor/MonitorHistoryTable';
import { useMonitorSnapshot } from '../hooks/useMonitorSnapshot';
import { getLocalDateKey } from '../lib/monitor';
import { tauriClient } from '../lib/tauri';
import { MonitorSidebar } from '../components/pcp/MonitorSidebar';
import { DashboardView } from '../components/pcp/DashboardView';
import { LoginModal } from '../components/common/LoginModal';
import type { OperationSummary } from '../types';

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const instanceIdRef = useRef(`monitor-${crypto.randomUUID()}`);

  const {
    error,
    runtime,
    monitor,
    activeRows,
    historyRows,
    activeCount,
    instanceCount,
    currentTime,
    lastUpdate,
    dateFilter,
    setDateFilter,
    filterType,
    setFilterType,
    totalTodayCount,
    loading,
    refresh,
  } = useMonitorSnapshot();

  const [operatorFilter, setOperatorFilter] = useState('');
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCredentials, setDeleteCredentials] = useState({ username: '', password: '' });
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [savingConfig, setSavingConfig] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [configPaths, setConfigPaths] = useState({
    shared_store: '',
    machine_name: '',
    app_env: '',
    production_base_path: '',
    server_path: '',
    saidas_cnc_path: '',
    saidas_cortadas_path: '',
    pdf_planos_path: '',
    lock_dir: '',
    protheus_url: '',
    lock_timeout_seconds: 14400,
    store_lock_stale_seconds: 30,
  });

  const monitorUsernameRef = useRef<HTMLInputElement | null>(null);

  const handleOpenConfig = () => {
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
        lock_dir: runtime.lock_dir || '',
        protheus_url: runtime.protheus_url || '',
        lock_timeout_seconds: runtime.lock_timeout_seconds || 14400,
        store_lock_stale_seconds: runtime.store_lock_stale_seconds || 30,
      });
    }
    setShowConfigModal(true);
  };

  const handleConfirmLogin = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const result = await tauriClient.validateMonitorLogin(deleteCredentials);
      if (result.ok) {
        setIsAdminAuthenticated(true);
      } else {
        setDeleteError(result.message);
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao autenticar.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
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
        lock_dir: configPaths.lock_dir,
        protheus_url: configPaths.protheus_url,
        lock_timeout_seconds: configPaths.lock_timeout_seconds,
        store_lock_stale_seconds: configPaths.store_lock_stale_seconds,
      });
      await refresh();
    } catch (err: any) {
      alert(`Falha ao salvar configuração: ${err.message}`);
    } finally {
      setSavingConfig(false);
    }
  };

  useEffect(() => {
    if (!runtime?.machine_name) return;

    const sendPresence = async () => {
      try {
        await tauriClient.touchAppInstance({
          instance_id: instanceIdRef.current,
          machine_name: runtime.machine_name,
          view_label: 'monitor',
          active_operation_id: null,
        });
      } catch (error) {
        console.warn('Falha ao atualizar presenca do monitor:', error);
      }
    };

    void sendPresence();
    const heartbeatInterval = window.setInterval(() => {
      void sendPresence();
    }, 10000);

    return () => {
      window.clearInterval(heartbeatInterval);
    };
  }, [runtime?.machine_name]);

  const filteredHistoryRows = useMemo(() => {
    if (!operatorFilter.trim()) return historyRows;
    const search = operatorFilter.trim().toLowerCase();
    return historyRows.filter((row) => row.operator_name.toLowerCase().includes(search));
  }, [historyRows, operatorFilter]);

  const escapeXml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const handleDownloadXml = async (rows: OperationSummary[], suffix: string) => {
    try {
      if (rows.length === 0) return;
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<MonitorSnapshot>\n';
      xml += `  <generated_at>${new Date().toISOString()}</generated_at>\n`;
      xml += '  <recent_operations>\n';
      rows.forEach((row) => {
        xml += '    <OperationSummary>\n';
        xml += `      <operation_id>${escapeXml(row.operation_id)}</operation_id>\n`;
        xml += `      <pedido>${escapeXml(row.pedido)}</pedido>\n`;
        xml += `      <operator_name>${escapeXml(row.operator_name)}</operator_name>\n`;
        xml += `      <machine_name>${escapeXml(row.machine_name)}</machine_name>\n`;
        xml += `      <saida>${escapeXml(row.saida)}</saida>\n`;
        xml += `      <status>${escapeXml(row.status)}</status>\n`;
        xml += `      <started_at>${row.started_at}</started_at>\n`;
        xml += '    </OperationSummary>\n';
      });
      xml += '  </recent_operations>\n</MonitorSnapshot>';
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_pcp_${suffix}_${getLocalDateKey()}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao baixar XML:', err);
    }
  };

  const handleDeleteRow = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!rowToDelete && selectedIds.length === 0) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (rowToDelete) {
        await tauriClient.deleteOperation(rowToDelete, deleteCredentials);
      } else {
        await tauriClient.deleteOperationsBulk(selectedIds, deleteCredentials);
      }
      setShowConfirmDelete(false);
      setRowToDelete(null);
      setSelectedIds([]);
      setDeleteCredentials({ username: '', password: '' });
      await refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir registro.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <MonitorSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_40%)]">
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <MonitorHeader
              activeCount={activeCount}
              instanceCount={instanceCount}
              totalTodayCount={totalTodayCount}
              currentTime={currentTime}
              lastUpdate={lastUpdate}
              onRefresh={refresh}
              minimal
            />
            {loading && (
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-500">
                <div className="h-2 w-2 animate-spin rounded-full border border-emerald-500/20 border-t-emerald-500" />
                ATUALIZANDO...
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-xs font-medium text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              Storage: {runtime?.storage_path || 'Conectando...'}
            </div>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-red-300 shadow-xl">
                  <div className="text-sm font-medium">Erro de conexao: {error}</div>
                  <button
                    onClick={() => refresh()}
                    className="rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold hover:bg-red-500/30"
                  >
                    Tentar novamente
                  </button>
                </div>
              </div>
            )}

            {loading && !monitor && (
              <div className="flex h-64 items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500" />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                activeCount={activeCount}
                totalTodayCount={totalTodayCount}
                instanceCount={instanceCount}
              />
            )}

            {activeTab === 'operacoes' && (() => {
              const corteApps = monitor?.app_instances?.filter(i => i.view_label !== 'monitor') || [];
              
              return (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Operacoes em Tempo Real</h2>
                  <p className="text-sm text-zinc-400">
                    Maquinas atualmente em processamento no chao de fabrica. {corteApps.length} maquinas conectadas agora.
                  </p>
                </div>
                <ActiveOperationsTable rows={activeRows} error={error} />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-zinc-400">Instancias Online</h3>
                    <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                      {corteApps.length}
                    </span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {corteApps.length ? (
                      corteApps.map((instance) => (
                        <div key={instance.instance_id} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-zinc-100">{instance.machine_name}</p>
                              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{instance.view_label}</p>
                            </div>
                            <span className={`h-2.5 w-2.5 rounded-full ${instance.active_operation_id ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]'}`} />
                          </div>
                          <p className="mt-3 truncate text-xs text-zinc-400">Instancia: {instance.instance_id}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {instance.active_operation_id
                              ? `Operacao ativa ${instance.active_operation_id}`
                              : 'Sem operacao ativa no momento'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4 text-sm text-zinc-500">
                        Nenhuma maquina com operacao aberta no momento.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ); })()}

            {activeTab === 'relatorios' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Historico de Producao</h2>
                    <p className="text-sm text-zinc-400">Consulta e exportacao de registros passados.</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {selectedIds.length > 0 && (
                      <button
                        onClick={() => {
                          setRowToDelete(null);
                          setShowConfirmDelete(true);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-600/10 px-4 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-600/20"
                      >
                        EXCLUIR SELECIONADOS ({selectedIds.length})
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadXml(filteredHistoryRows, filterType)}
                      disabled={filteredHistoryRows.length === 0}
                      className="flex items-center gap-2 rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 disabled:opacity-50"
                    >
                      EXPORTAR XML
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-sm">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Operador</span>
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      className="h-10 w-48 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 outline-none focus:border-emerald-500/40"
                      value={operatorFilter}
                      onChange={(e) => setOperatorFilter(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Periodo</span>
                    <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                      {(['day', 'week', 'month'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setFilterType(type)}
                          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all ${
                            filterType === type ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mes'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Data</span>
                    <input
                      type="date"
                      className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-xs text-zinc-100 outline-none focus:border-emerald-500/40"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => {
                      setDateFilter(getLocalDateKey());
                      setOperatorFilter('');
                      setFilterType('day');
                      void refresh();
                    }}
                    className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                  </button>
                </div>

                <MonitorHistoryTable
                  rows={filteredHistoryRows}
                  onDeleteRow={(id) => {
                    setRowToDelete(id);
                    setShowConfirmDelete(true);
                  }}
                  selectedIds={selectedIds}
                  onToggleSelection={(id) => {
                    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
                  }}
                  onToggleAllSelection={(ids) => {
                    setSelectedIds(selectedIds.length === ids.length ? [] : ids);
                  }}
                />
              </div>
            )}

            {activeTab === 'config' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Configuracoes do Monitor</h2>
                  <p className="text-sm text-zinc-400">Gerencie os parametros locais de visualizacao e acesso ao backend.</p>
                </div>

                <div className="max-w-xl space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm">
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-300">
                      Para alterar as configurações globais de rede e pastas, é necessário acesso administrativo.
                    </p>
                    <button
                      onClick={handleOpenConfig}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/10"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                      ACESSAR CONFIGURAÇÕES
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 px-4 backdrop-blur-md" onClick={() => !deleteLoading && setShowConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-zinc-100">
              {rowToDelete ? 'Confirmar Exclusao' : `Excluir ${selectedIds.length} registros`}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Esta acao removera permanentemente os registros do banco de dados local. Informe suas credenciais de administrador.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleDeleteRow}>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Usuario</span>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    value={deleteCredentials.username}
                    onChange={(e) => setDeleteCredentials((prev) => ({ ...prev, username: e.target.value }))}
                    required
                    disabled={deleteLoading}
                    autoComplete="username"
                    placeholder="Seu usuario"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">Senha</span>
                  <input
                    type="password"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                    value={deleteCredentials.password}
                    onChange={(e) => setDeleteCredentials((prev) => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={deleteLoading}
                    autoComplete="current-password"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              {deleteError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-medium text-red-400">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 transition-colors hover:text-zinc-100"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleteLoading}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-500 active:scale-[0.98] disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'EXCLUINDO...' : 'EXCLUIR AGORA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoginModal
        open={showConfigModal}
        onClose={() => {
          setShowConfigModal(false);
          setIsAdminAuthenticated(false);
        }}
        isAdminAuthenticated={isAdminAuthenticated}
        monitorLoginLoading={deleteLoading}
        monitorLoginError={deleteError}
        monitorLoginForm={deleteCredentials}
        monitorUsernameRef={monitorUsernameRef}
        onMonitorLoginFormChange={(patch) => setDeleteCredentials(prev => ({ ...prev, ...patch }))}
        onConfirmMonitorLogin={handleConfirmLogin}
        configPaths={configPaths}
        onConfigPathsChange={(patch) => setConfigPaths(prev => ({ ...prev, ...patch }))}
        onSaveConfig={handleSaveConfig}
        loading={savingConfig}
        title="Configurações PCP"
        subtitle="Gerencie os parâmetros globais de monitoramento e rede."
      />
    </div>
  );
}
