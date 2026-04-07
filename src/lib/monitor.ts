import type { OperationSummary } from '../types';

export function formatElapsedSeconds(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const h = String(Math.floor(safeSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(safeSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export function formatDuration(startedAt: string): string {
  const start = new Date(startedAt).getTime();
  const elapsed = Math.floor((Date.now() - start) / 1000);
  return formatElapsedSeconds(elapsed);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date(value));
}

export function getOperationVisualStatus(
  row: OperationSummary
): 'in-progress' | 'finished-complete' | 'finished-incomplete' {
  if (row.status === 'started') return 'in-progress';
  return row.completed_full ? 'finished-complete' : 'finished-incomplete';
}

export function getOperationStatusLabel(row: OperationSummary): string {
  const visualStatus = getOperationVisualStatus(row);

  if (visualStatus === 'in-progress') return 'EM PROCESSO';
  if (visualStatus === 'finished-complete') return 'FINALIZADO COMPLETO';
  return 'FINALIZADO INCOMPLETO';
}
