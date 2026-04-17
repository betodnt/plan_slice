import { formatDuration, formatElapsedSeconds } from '../../lib/monitor';
import type { OperationSummary } from '../../types';

type HistoryPanelProps = {
  historyRows: OperationSummary[];
  operatorName: string;
  dateFilter: string;
  setDateFilter: (val: string) => void;
  onRefresh?: () => void;
};

export function HistoryPanel({ historyRows, operatorName, dateFilter, setDateFilter, onRefresh }: HistoryPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-sm">
      <div className="mb-4 flex flex-col gap-3 border-b border-zinc-800/50 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              Operador selecionado
            </p>
            <h2 className="mt-1.5 truncate text-lg font-semibold text-zinc-100">Histórico</h2>
          </div>
          <div className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Total: {historyRows.length}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="h-9 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 text-sm font-medium text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button
            onClick={() => {
              setDateFilter(new Date().toISOString().split('T')[0]);
              if (onRefresh) onRefresh();
            }}
            title="Atualizar e voltar para hoje"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-left">
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Pedido
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Saída
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Tempo
              </th>
            </tr>
          </thead>
          <tbody>
            {historyRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-zinc-600">
                  {operatorName.trim()
                    ? 'Nenhum histórico encontrado para este operador.'
                    : 'Selecione um operador para ver o histórico.'}
                </td>
              </tr>
            ) : (
              historyRows.map((row) => (
                <tr
                  key={row.operation_id}
                  className="border-t border-zinc-800/70 transition-colors duration-100 hover:bg-zinc-900/80"
                >
                  <td className="px-3 py-2.5 font-medium text-zinc-100">{row.pedido}</td>
                  <td className="px-3 py-2.5 text-zinc-400">{row.saida}</td>
                  <td className="px-3 py-2.5 tabular-nums text-zinc-500">
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
  );
}
