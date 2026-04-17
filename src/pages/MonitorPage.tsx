import { FormEvent, useMemo, useState } from 'react';
import { ActiveOperationsTable } from '../components/monitor/ActiveOperationsTable';
import { MonitorHeader } from '../components/monitor/MonitorHeader';
import { MonitorHistoryTable } from '../components/monitor/MonitorHistoryTable';
import { useMonitorSnapshot } from '../hooks/useMonitorSnapshot';
import { tauriClient } from '../lib/tauri';

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="mb-4 border-b border-zinc-800/50 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
          Diagnostico
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{title}</h2>
      </div>
      <div className="text-sm text-zinc-300">
        <strong className="text-zinc-100">Store:</strong> {content || '--'}
      </div>
    </section>
  );
}

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
        xml += `      <tipo>${row.tipo || ''}</tipo>\n`;
        xml += `      <status>${row.status}</status>\n`;
        xml += `      <started_at>${row.started_at}</started_at>\n`;
        xml += `      <finished_at>${row.finished_at || ''}</finished_at>\n`;
        xml += `      <elapsed_seconds>${row.elapsed_seconds || ''}</elapsed_seconds>\n`;
        xml += `      <completed_full>${row.completed_full ?? ''}</completed_full>\n`;
        xml += `      <incomplete_reason>${row.incomplete_reason || ''}</incomplete_reason>\n`;
        xml += '    </OperationSummary>\n';
      });
      
      xml += '  </recent_operations>\n</MonitorSnapshot>';

      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_operacoes_${suffix}_${new Date().toISOString().split('T')[0]}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Falha ao baixar XML:', err);
    }
  };

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
    <div className="min-h-screen bg-zinc-950 p-4 text-zinc-100 sm:p-6 lg:p-8 xl:p-10">
      <div className="mx-auto max-w-[1600px] space-y-6 lg:space-y-8">
        {!monitor && !error ? (
          <StateCard message="Carregando historico do monitor..." tone="loading" />
        ) : null}

        {error ? (
          <StateCard message={`Falha na atualização do monitor: ${error}`} tone="error" />
        ) : null}

        <MonitorHeader
          activeCount={activeCount}
          totalTodayCount={totalTodayCount}
          currentTime={currentTime}
          lastUpdate={lastUpdate}
          onRefresh={refresh}
        />

        <InfoCard title="Armazenamento em uso pelo monitor" content={runtime?.storage_path || '--'} />

        <ActiveOperationsTable rows={activeRows} error={error} />

        <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm lg:p-8">
          <div className="mb-5 flex flex-col gap-4 border-b border-zinc-800/50 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Filtros de consulta
              </p>
              <h2 className="mt-1.5 text-xl font-semibold text-zinc-100 lg:text-2xl">Histórico de Produção</h2>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {selectedIds.length > 0 && (
                <button
                  onClick={() => {
                    setRowToDelete(null);
                    setShowConfirmDelete(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-red-600/10 px-4 py-2 text-sm font-semibold text-red-400 border border-red-500/20 transition-all hover:bg-red-600/20"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9 2 2 4-4" />
                  </svg>
                  EXCLUIR {selectedIds.length} SELECIONADOS
                </button>
              )}
              
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="operator-filter" className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Operador
                </label>
                <input
                  id="operator-filter"
                  type="text"
                  placeholder="Pesquisar operador..."
                  className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 sm:w-64"
                  value={operatorFilter}
                  onChange={(e) => setOperatorFilter(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Período
                </label>
                <div className="flex rounded-xl border border-zinc-800 bg-zinc-950 p-1">
                  {(['day', 'week', 'month'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-lg ${
                        filterType === type 
                          ? 'bg-zinc-100 text-zinc-950 shadow-lg' 
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {type === 'day' ? 'Dia' : type === 'week' ? 'Semana' : 'Mês'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label htmlFor="date-filter" className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                  Referência
                </label>
                <input
                  id="date-filter"
                  type="date"
                  className="h-10 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                <button
                  onClick={() => {
                    setDateFilter(new Date().toISOString().split('T')[0]);
                    setOperatorFilter('');
                    setFilterType('day');
                    refresh();
                  }}
                  title="Atualizar e limpar filtros"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              </div>

              <button
                onClick={() => handleDownloadXml(filteredHistoryRows, filterType)}
                disabled={filteredHistoryRows.length === 0}
                className="flex items-center gap-2 rounded-xl bg-zinc-100 px-5 py-2 text-sm font-bold text-zinc-950 transition-colors hover:bg-zinc-200 disabled:opacity-50"
                title="Exportar registros filtrados para XML"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                BAIXAR XML
              </button>
            </div>
          </div>

          <MonitorHistoryTable 
            rows={filteredHistoryRows} 
            onDeleteRow={(id) => {
              setRowToDelete(id);
              setShowConfirmDelete(true);
            }}
            selectedIds={selectedIds}
            onToggleSelection={(id) => {
              setSelectedIds(prev => 
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
              );
            }}
            onToggleAllSelection={(ids) => {
              if (selectedIds.length === ids.length) {
                setSelectedIds([]);
              } else {
                setSelectedIds(ids);
              }
            }}
          />
        </section>
      </div>

      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 px-4 backdrop-blur-sm" onClick={() => !deleteLoading && setShowConfirmDelete(false)}>
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-semibold text-zinc-100">
              {rowToDelete ? 'Confirmar Exclusão' : `Excluir ${selectedIds.length} registros`}
            </h3>
            <p className="mt-2 text-sm text-zinc-400">
              {rowToDelete 
                ? 'Esta ação é permanente. Informe suas credenciais de administrador para continuar.' 
                : 'Todos os registros selecionados serão apagados permanentemente. Informe suas credenciais.'
              }
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleDeleteRow}>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Usuário</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500/50"
                  value={deleteCredentials.username}
                  onChange={e => setDeleteCredentials(prev => ({ ...prev, username: e.target.value }))}
                  required
                  disabled={deleteLoading}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Senha</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-500/50"
                  value={deleteCredentials.password}
                  onChange={e => setDeleteCredentials(prev => ({ ...prev, password: e.target.value }))}
                  required
                  disabled={deleteLoading}
                />
              </div>

              {deleteError && (
                <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-zinc-100 disabled:opacity-50"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={deleteLoading}
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? 'EXCLUINDO...' : 'EXCLUIR REGISTRO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
