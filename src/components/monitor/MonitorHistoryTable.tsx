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
  onDeleteRow: (id: string) => void;
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onToggleAllSelection: (ids: string[]) => void;
};

function getStatusClasses(status: string) {
  switch (status) {
    case 'finished-complete':
      return {
        row: 'hover:bg-sky-950/20',
        status: 'text-sky-400',
      };
    case 'finished-incomplete':
      return {
        row: 'hover:bg-amber-950/20',
        status: 'text-amber-400',
      };
    case 'active':
    case 'in-progress':
      return {
        row: 'hover:bg-emerald-950/20',
        status: 'text-emerald-400',
      };
    default:
      return {
        row: 'hover:bg-zinc-900',
        status: 'text-zinc-400',
      };
  }
}

export function MonitorHistoryTable({ 
  rows, 
  onDeleteRow,
  selectedIds,
  onToggleSelection,
  onToggleAllSelection
}: MonitorHistoryTableProps) {
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < rows.length;

  return (
    <div className="flex flex-col gap-4">

      <div className="overflow-auto rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="min-w-full border-collapse text-sm text-zinc-200">
          <thead className="sticky top-0 z-10 bg-zinc-900">
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => onToggleAllSelection(rows.map(r => r.operation_id))}
                />
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Status
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Operador
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Saída CNC
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Pedido
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Máquina
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Finalizado em
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Tempo
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Motivo
              </th>
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-zinc-600">
                  Nenhum histórico encontrado.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const visualStatus = getOperationVisualStatus(row);
                const classes = getStatusClasses(visualStatus);
                const isSelected = selectedIds.includes(row.operation_id);

                return (
                  <tr
                    key={`history-${row.operation_id}`}
                    className={`group border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${isSelected ? 'bg-emerald-500/5' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500/20"
                        checked={isSelected}
                        onChange={() => onToggleSelection(row.operation_id)}
                      />
                    </td>
                    <td className={`px-4 py-3 font-semibold ${classes.status}`}>
                      {getOperationStatusLabel(row)}
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-100">{row.operator_name}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.saida}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.pedido}</td>
                    <td className="px-4 py-3 text-zinc-300">{row.machine_name}</td>
                    <td className="px-4 py-3 tabular-nums text-zinc-400">
                      {row.finished_at ? formatDateTime(row.finished_at) : '--'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-100">
                      {row.elapsed_seconds !== null
                        ? formatElapsedSeconds(row.elapsed_seconds)
                        : formatDuration(row.started_at)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-500">
                      {row.incomplete_reason?.trim() || '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onDeleteRow(row.operation_id)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Excluir registro"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9 2 2 4-4" />
                        </svg>
                      </button>
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
