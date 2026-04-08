import { ActiveOperationsTable } from '../components/monitor/ActiveOperationsTable';
import { MonitorHeader } from '../components/monitor/MonitorHeader';
import { MonitorHistoryTable } from '../components/monitor/MonitorHistoryTable';
import { useMonitorSnapshot } from '../hooks/useMonitorSnapshot';

function InfoCard({ title, content }: { title: string; content: string }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
      <div className="mb-4 border-b border-zinc-800 pb-4">
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
  const {
    error,
    runtime,
    monitor,
    activeRows,
    historyRows,
    activeCount,
    historyCount,
    currentTime,
    lastUpdate,
    dateFilter,
    setDateFilter,
    refresh,
  } = useMonitorSnapshot();

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="space-y-5">
        {!monitor && !error ? (
          <StateCard message="Carregando historico do monitor..." tone="loading" />
        ) : null}

        {error ? (
          <StateCard message={`Falha na atualização do monitor: ${error}`} tone="error" />
        ) : null}

        <MonitorHeader
          activeCount={activeCount}
          historyCount={historyCount}
          currentTime={currentTime}
          lastUpdate={lastUpdate}
          onRefresh={refresh}
        />

        <InfoCard title="Armazenamento em uso pelo monitor" content={runtime?.storage_path || '--'} />

        <ActiveOperationsTable rows={activeRows} error={error} />

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Filtros de consulta
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Histórico de Produção</h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label htmlFor="date-filter" className="text-xs font-bold text-zinc-500 uppercase">
                Data do corte
              </label>
              <input
                id="date-filter"
                type="date"
                className="h-10 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none focus:border-emerald-500/50"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter('')}
                  className="h-10 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-xs font-bold text-zinc-400 hover:text-zinc-100"
                >
                  LIMPAR
                </button>
              )}
            </div>
          </div>

          <MonitorHistoryTable rows={historyRows} />
        </section>
      </div>
    </div>
  );
}
