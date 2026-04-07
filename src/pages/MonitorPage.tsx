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
  } = useMonitorSnapshot();

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="space-y-5">
        {!monitor && !error ? (
          <StateCard message="Carregando historico do monitor..." tone="loading" />
        ) : null}

        {error && !monitor ? (
          <StateCard message={`Falha ao carregar o monitor: ${error}`} tone="error" />
        ) : null}

        <MonitorHeader
          activeCount={activeCount}
          historyCount={historyCount}
          currentTime={currentTime}
          lastUpdate={lastUpdate}
        />

        <InfoCard title="Armazenamento em uso pelo monitor" content={runtime?.storage_path || '--'} />

        <ActiveOperationsTable rows={activeRows} error={error} />
        <MonitorHistoryTable rows={historyRows} />
      </div>
    </div>
  );
}
