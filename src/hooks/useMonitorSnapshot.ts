import { startTransition, useEffect, useMemo, useState } from 'react';
import { tauriClient } from '../lib/tauri';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime } from '../lib/monitor';
import type { MonitorSnapshot, RuntimeConfig } from '../types';

export function useMonitorSnapshot() {
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadMonitor() {
      try {
        const [snapshot, runtimeValue] = await Promise.all([
          tauriClient.getMonitorSnapshot(),
          tauriClient.getRuntimeConfig(),
        ]);

        if (!isMounted) return;

        startTransition(() => {
          setMonitor(snapshot);
          setRuntime(runtimeValue);
          setError('');
        });
      } catch (loadError) {
        if (!isMounted) return;

        startTransition(() => {
          setError(getErrorMessage(loadError));
        });
      }
    }

    void loadMonitor();

    const monitorInterval = window.setInterval(() => {
      void loadMonitor();
    }, 3000);

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      isMounted = false;
      window.clearInterval(monitorInterval);
      window.clearInterval(clockInterval);
    };
  }, []);

  const activeRows = useMemo(() => {
    if (!monitor?.active_operations) return [];

    return monitor.active_operations
      .slice()
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [monitor?.active_operations]);

  const historyRows = useMemo(() => {
    if (!monitor?.recent_operations) return [];

    let filtered = monitor.recent_operations.slice();

    if (dateFilter) {
      filtered = filtered.filter((row) => {
        const rowDate = new Date(row.started_at).toISOString().split('T')[0];
        return rowDate === dateFilter;
      });
    }

    return filtered
      .sort((a, b) => {
        const left = new Date(a.finished_at ?? a.started_at).getTime();
        const right = new Date(b.finished_at ?? b.started_at).getTime();
        return right - left;
      })
      .slice(0, 500);
  }, [monitor?.recent_operations, dateFilter]);

  return {
    error,
    runtime,
    monitor,
    activeRows,
    historyRows,
    dateFilter,
    setDateFilter,
    refresh: () => {
      setError('');
      setMonitor(null);
      // O intervalo cuidará do resto ou podemos forçar uma chamada se necessário
    },
    activeCount: activeRows.length,
    historyCount: historyRows.length,
    currentTime: new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now),
    lastUpdate: monitor ? formatDateTime(monitor.generated_at) : '--',
  };
}
