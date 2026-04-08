import {
  formatDateTime,
  formatDuration,
  formatElapsedSeconds,
  getOperationStatusLabel,
  getOperationVisualStatus,
} from '../../lib/monitor';
import type { OperationSummary } from '../../types';

type MonitorHistoryTableProps = {
  rows: OperationSummary[];
};

function getStatusClasses(status: string) {
  switch (status) {
    case 'finished-complete':
      return {
        row: 'hover:bg-sky-950/30',
        status: 'text-sky-300',
      };
    case 'finished-incomplete':
      return {
        row: 'hover:bg-amber-950/30',
        status: 'text-amber-300',
      };
    case 'active':
    case 'in-progress':
      return {
        row: 'hover:bg-emerald-950/30',
        status: 'text-emerald-300',
      };
    default:
      return {
        row: 'hover:bg-zinc-900',
        status: 'text-zinc-300',
      };
  }
}

export function MonitorHistoryTable({ rows }: MonitorHistoryTableProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <div className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-400">
          {rows.length} registros exibidos
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="min-w-[1320px] border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Operario
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Saida CNC
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Pedido
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Maquina
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Finalizado em
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Tempo
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Motivo
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Nenhum historico encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const visualStatus = getOperationVisualStatus(row);
                const classes = getStatusClasses(visualStatus);

                return (
                  <tr
                    key={`history-${row.operation_id}`}
                    className={`border-t border-zinc-800 transition ${classes.row}`}
                  >
                    <td className={`px-4 py-3 font-semibold ${classes.status}`}>
                      {getOperationStatusLabel(row)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-100">{row.operator_name}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.saida}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.pedido}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.machine_name}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {row.finished_at ? formatDateTime(row.finished_at) : '--'}
                    </td>
                    <td className="px-4 py-3 text-zinc-100">
                      {row.elapsed_seconds !== null
                        ? formatElapsedSeconds(row.elapsed_seconds)
                        : formatDuration(row.started_at)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {row.incomplete_reason?.trim() || '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
