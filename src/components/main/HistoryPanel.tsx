import { formatDuration, formatElapsedSeconds } from '../../lib/monitor';
import type { OperationSummary } from '../../types';

type HistoryPanelProps = {
  historyRows: OperationSummary[];
  operatorName: string;
};

export function HistoryPanel({ historyRows, operatorName }: HistoryPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-zinc-800 bg-zinc-900/50 p-5 shadow-2xl backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-zinc-800/50 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Operador selecionado
          </p>
          <h2 className="mt-2 text-lg font-semibold text-zinc-100">Historico</h2>
        </div>
        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {historyRows.length} registros
        </div>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Pedido
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Saida
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Tempo
              </th>
            </tr>
          </thead>
          <tbody>
            {historyRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-zinc-500">
                  {operatorName.trim()
                    ? 'Nenhum historico encontrado para este operador.'
                    : 'Selecione um operador para ver o historico.'}
                </td>
              </tr>
            ) : (
              historyRows.map((row) => (
                <tr
                  key={row.operation_id}
                  className="border-t border-zinc-800 transition hover:bg-zinc-900"
                >
                  <td className="px-4 py-3 font-medium text-zinc-100">{row.pedido}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.saida}</td>
                  <td className="px-4 py-3 text-zinc-400">
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
