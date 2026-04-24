import { FormEvent, useMemo, useState } from 'react';
import { ActiveOperationsTable } from '../components/monitor/ActiveOperationsTable';
import { MonitorHeader } from '../components/monitor/MonitorHeader';
import { MonitorHistoryTable } from '../components/monitor/MonitorHistoryTable';
import { useMonitorSnapshot } from '../hooks/useMonitorSnapshot';
import { tauriClient } from '../lib/tauri';
import { MonitorSidebar } from '../components/pcp/MonitorSidebar';
import { DashboardView } from '../components/pcp/DashboardView';

function StateCard({ message, tone }: { message: string; tone: 'loading' | 'error' }) {
  const toneClass =
    tone === 'error'
      ? 'border-red-500/30 bg-red-950/30 text-red-300'
      : 'border-zinc-800 bg-zinc-900 text-zinc-300';

  return (
    <section className={`rounded-2xl border p-5 shadow-xl ${toneClass}`}>
      <div className="text-sm font-medium">{message}</div>
    </section>
  );
}

export default function MonitorPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const {
    error,
    runtime,
    monitor,
    activeRows,
    historyRows,
    activeCount,
    currentTime,
    lastUpdate,
    dateFilter,
    setDateFilter,
    filterType,
    setFilterType,
    totalTodayCount,
    refresh,
  } = useMonitorSnapshot();

  const [operatorFilter, setOperatorFilter] = useState('');
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteCredentials, setDeleteCredentials] = useState({ username: '', password: '' });
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredHistoryRows = useMemo(() => {
    if (!operatorFilter.trim()) return historyRows;
    const search = operatorFilter.trim().toLowerCase();
    return historyRows.filter(row => 
      row.operator_name.toLowerCase().includes(search)
    );
  }, [historyRows, operatorFilter]);

  const handleDownloadXml = async (rows: any[], suffix: string) => {
    try {
      if (rows.length === 0) return;
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<MonitorSnapshot>\n';
      xml += `  <generated_at>${new Date().toISOString()}</generated_at>\n`;
      xml += '  <recent_operations>\n';
      rows.forEach(row => {
        xml += '    <OperationSummary>\n';
        xml += `      <operation_id>${row.operation_id}</operation_id>\n`;
        xml += `      <pedido>${row.pedido}</pedido>\n`;
        xml += `      <operator_name>${row.operator_name}</operator_name>\n`;
        xml += `      <machine_name>${row.machine_name}</machine_name>\n`;
        xml += `      <saida>${row.saida}</saida>\n`;
        xml += `      <status>${row.status}</status>\n`;
        xml += `      <started_at>${row.started_at}</started_at>\n`;
        xml += '    </OperationSummary>\n';
      });
      xml += '  </recent_operations>\n</MonitorSnapshot>';
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_pcp_${suffix}_${new Date().toISOString().split('T')[0]}.xml`;
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
      refresh();
    } catch (err: any) {
      setDeleteError(err.message || 'Falha ao excluir registro.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Sidebar - SaaS Shell */}
      <MonitorSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_40%)]">
        
        {/* Header SaaS */}
        <header className="flex h-20 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900/30 px-8 backdrop-blur-md">
          <div>
            <MonitorHeader
              activeCount={activeCount}
              totalTodayCount={totalTodayCount}
              currentTime={currentTime}
              lastUpdate={lastUpdate}
              onRefresh={refresh}
              minimal // Prop fictícia para reduzir o header se necessário, ou apenas estilizamos diferente
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 px-4 text-xs font-medium text-zinc-400">
               <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
               Storage: {runtime?.storage_path || 'Conectando...'}
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div className="mb-6">
                <StateCard message={`Erro de conexão: ${error}`} tone="error" />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView activeCount={activeCount} totalTodayCount={totalTodayCount} />
            )}

            {activeTab === 'operacoes' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h2 className="text-2xl font-bold text-zinc-100">Operações em Tempo Real</h2>
                  <p className="text-sm text-zinc-400">Máquinas atualmente em processamento no chão de fábrica.</p>
                </div>
                <ActiveOperationsTable rows={activeRows} error={error} />
              </div>
            )}

            {activeTab === 'relatorios' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-100">Histórico de Produção</h2>
                    <p className="text-sm text-zinc-400">Consulta e exportação de registros passados.</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                     {selectedIds.length > 0 && (
                        <button
                          onClick={() => { setRowToDelete(null); setShowConfirmDelete(true); }}
                          className="flex items-center gap-2 rounded-xl bg-red-600/10 px-4 py-2 text-xs font-bold text-red-400 border border-red-500/20 transition-all hover:bg-red-600/20"
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

                {/* Filtros SaaS Style */}
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
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Período</span>
                      <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                        {(['day', 'week', 'month'] as const).map((type) => (
                          <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-tight transition-all rounded-lg ${
                              filterType === type ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
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
                     onClick={() => { setDateFilter(new Date().toISOString().split('T')[0]); setOperatorFilter(''); setFilterType('day'); refresh(); }}
                     className="mt-5 flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-100"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                   </button>
                </div>

                <MonitorHistoryTable 
                  rows={filteredHistoryRows} 
                  onDeleteRow={(id) => { setRowToDelete(id); setShowConfirmDelete(true); }}
                  selectedIds={selectedIds}
                  onToggleSelection={(id) => {
                    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
                  }}
                  onToggleAllSelection={(ids) => {
                    setSelectedIds(selectedIds.length === ids.length ? [] : ids);
                  }}
                />
              </div>
            )}
            
            {activeTab === 'config' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-600 mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                 </div>
                 <h2 className="text-xl font-bold text-zinc-100">Configurações de PCP</h2>
                 <p className="mt-2 text-zinc-400 max-w-sm">Use o atalho de configuração no monitor principal para gerenciar os caminhos e parâmetros globais do sistema.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal de Exclusão SaaS Style */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/90 px-4 backdrop-blur-md" onClick={() => !deleteLoading && setShowConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-zinc-100">
              {rowToDelete ? 'Confirmar Exclusão' : `Excluir ${selectedIds.length} registros`}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Esta ação removerá permanentemente os registros do banco de dados local. Informe suas credenciais de administrador.
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleDeleteRow}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Administrador</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-red-500/50"
                  value={deleteCredentials.username}
                  onChange={e => setDeleteCredentials(prev => ({ ...prev, username: e.target.value }))}
                  required
                  disabled={deleteLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Senha</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-red-500/50"
                  value={deleteCredentials.password}
                  onChange={e => setDeleteCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={deleteLoading}
                />
              </div>

              {deleteError && (
                <div className="rounded-xl bg-red-500/10 p-4 text-xs font-medium text-red-400 border border-red-500/20">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-zinc-400 hover:text-zinc-100 transition-colors"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleteLoading}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 transition-all active:scale-[0.98] disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'EXCLUINDO...' : 'EXCLUIR AGORA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
