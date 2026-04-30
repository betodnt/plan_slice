import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { tauriClient } from '../lib/tauri';
import { getErrorMessage } from '../lib/errors';
import { formatDateTime, getLocalDateKey } from '../lib/monitor';
import type { MonitorSnapshot, RuntimeConfig } from '../types';

export function useMonitorSnapshot() {
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [runtime, setRuntime] = useState<RuntimeConfig | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [dateFilter, setDateFilter] = useState(() => getLocalDateKey());
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');

  const loadMonitor = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshot, runtimeValue] = await Promise.all([
        tauriClient.getMonitorSnapshot(),
        tauriClient.getRuntimeConfig(),
      ]);

      startTransition(() => {
        setMonitor(snapshot);
        setRuntime(runtimeValue);
        setError('');
      });
    } catch (loadError) {
      startTransition(() => {
        setError(getErrorMessage(loadError));
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let timeoutId: number;

    const poll = async () => {
      await loadMonitor();
      timeoutId = window.setTimeout(poll, 3000);
    };

    void poll();

    const clockInterval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(clockInterval);
    };
  }, [loadMonitor]);

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
      const targetDate = new Date(`${dateFilter}T12:00:00`);

      filtered = filtered.filter((row) => {
        const rowDate = new Date(row.started_at);

        if (filterType === 'day') {
          return getLocalDateKey(rowDate) === dateFilter;
        }

        if (filterType === 'month') {
          return (
            rowDate.getFullYear() === targetDate.getFullYear() &&
            rowDate.getMonth() === targetDate.getMonth()
          );
        }

        if (filterType === 'week') {
          const getWeekNumber = (d: Date) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return (
              1 +
              Math.round(
                ((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7,
              )
            );
          };

          return (
            rowDate.getFullYear() === targetDate.getFullYear() &&
            getWeekNumber(rowDate) === getWeekNumber(targetDate)
          );
        }

        return true;
      });
    }

    return filtered
      .sort((a, b) => {
        const left = new Date(a.finished_at ?? a.started_at).getTime();
        const right = new Date(b.finished_at ?? b.started_at).getTime();
        return right - left;
      })
      .slice(0, 1000);
  }, [monitor?.recent_operations, dateFilter, filterType]);

  const totalTodayCount = useMemo(() => {
    if (!monitor?.recent_operations) return 0;
    const todayStr = getLocalDateKey();
    return monitor.recent_operations.filter((row) => getLocalDateKey(row.started_at) === todayStr).length;
  }, [monitor?.recent_operations]);

  return {
    error,
    runtime,
    monitor,
    activeRows,
    historyRows,
    dateFilter,
    setDateFilter,
    filterType,
    setFilterType,
    loading,
    refresh: loadMonitor,
    activeCount: activeRows.length,
    instanceCount: monitor?.app_instances?.filter(i => i.view_label !== 'monitor').length || 0,
    historyCount: historyRows.length,
    totalTodayCount,
    totalHistoryCount: monitor?.recent_operations?.length || 0,
    currentTime: new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now),
    lastUpdate: monitor ? formatDateTime(monitor.generated_at) : '--',
  };
}
