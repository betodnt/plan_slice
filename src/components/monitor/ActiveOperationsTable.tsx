import { formatDateTime, formatDuration } from '../../lib/monitor';
import type { OperationSummary } from '../../types';

type ActiveOperationsTableProps = {
  rows: OperationSummary[];
  error: string;
};

export function ActiveOperationsTable({ rows, error }: ActiveOperationsTableProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur-sm">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-zinc-800/50 pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Lista viva
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-zinc-100">
            Operador, saida CNC e data/hora
          </h2>
        </div>
        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {rows.length} em execucao
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="min-w-[1080px] border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Operario
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Saida CNC
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Maquina
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Pedido
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Data / Hora
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Tempo rodando
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Nenhum app em execucao no momento.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.operation_id}
                  className="border-t border-zinc-800 transition hover:bg-zinc-900"
                >
                  <td className="px-4 py-3 font-semibold text-emerald-400">{row.operator_name}</td>
                  <td className="px-4 py-3 font-medium text-amber-300">{row.saida}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.machine_name}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.pedido}</td>
                  <td className="px-4 py-3 text-zinc-400">{formatDateTime(row.started_at)}</td>
                  <td className="px-4 py-3 text-zinc-100">{formatDuration(row.started_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
