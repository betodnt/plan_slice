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
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');

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
      const targetDate = new Date(dateFilter + 'T12:00:00'); // Use midday to avoid TZ issues
      
      filtered = filtered.filter((row) => {
        const rowDate = new Date(row.started_at);
        
        if (filterType === 'day') {
          return rowDate.toISOString().split('T')[0] === dateFilter;
        }
        
        if (filterType === 'month') {
          return (
            rowDate.getFullYear() === targetDate.getFullYear() &&
            rowDate.getMonth() === targetDate.getMonth()
          );
        }
        
        if (filterType === 'week') {
          // Simple week check: same year and same week number (approx)
          // For more accuracy, we could calculate the start/end of the week
          const getWeekNumber = (d: Date) => {
            const date = new Date(d.getTime());
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
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
    const todayStr = new Date().toISOString().split('T')[0];
    return monitor.recent_operations.filter(r => 
      new Date(r.started_at).toISOString().split('T')[0] === todayStr
    ).length;
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
    refresh: () => {
      setError('');
      setMonitor(null);
      // O intervalo cuidará do resto ou podemos forçar uma chamada se necessário
    },
    activeCount: activeRows.length,
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
