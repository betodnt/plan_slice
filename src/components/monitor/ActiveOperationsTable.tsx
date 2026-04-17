import { formatDateTime, formatDuration } from '../../lib/monitor';
import type { OperationSummary } from '../../types';

type ActiveOperationsTableProps = {
  rows: OperationSummary[];
  error: string;
};

export function ActiveOperationsTable({ rows, error }: ActiveOperationsTableProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl backdrop-blur-sm lg:p-8">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-zinc-800/50 pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Lista viva
          </p>
          <h2 className="mt-1.5 text-xl font-semibold text-zinc-100 lg:text-2xl">
            Operações em andamento
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-400">
          {rows.length} ativas
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm font-medium text-red-300">
          {error}
        </div>
      ) : null}

      <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="min-w-full border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-left">
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Operador
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Saída CNC
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Máquina
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Pedido
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Data / Hora
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Tempo rodando
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-600">
                  Nenhuma operação em execução no momento.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.operation_id}
                  className="border-t border-zinc-800/70 transition-colors duration-100 hover:bg-emerald-950/20"
                >
                  <td className="px-4 py-3 font-semibold text-emerald-400">{row.operator_name}</td>
                  <td className="px-4 py-3 font-medium text-amber-300">{row.saida}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.machine_name}</td>
                  <td className="px-4 py-3 text-zinc-300">{row.pedido}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">{formatDateTime(row.started_at)}</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-100">{formatDuration(row.started_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
