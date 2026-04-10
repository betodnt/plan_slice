import { useCallback, useEffect, useRef, useState } from 'react';
import { tauriClient } from '../lib/tauri';
import type { MonitorSnapshot } from '../types';

type UseActiveOperationProps = {
  monitor: MonitorSnapshot | null;
  machineName: string;
  operatorName: string;
  isFinishingOperation: boolean;
  onFeedback: (message: string) => void;
};

export function useActiveOperation({
  monitor,
  machineName,
  operatorName,
  isFinishingOperation,
  onFeedback,
}: UseActiveOperationProps) {
  const [activeOperationId, setActiveOperationId] = useState('');
  const [timerString, setTimerString] = useState('00:00:00');

  const heartbeatTimer = useRef<number | null>(null);
  const operationTimer = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (operationTimer.current !== null) {
      window.clearInterval(operationTimer.current);
      operationTimer.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const startTimer = useCallback((startedAt?: string) => {
    stopTimer();
    startTimeRef.current = startedAt ? new Date(startedAt).getTime() : Date.now();

    operationTimer.current = window.setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsedMs = Date.now() - startTimeRef.current;
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const s = String(totalSeconds % 60).padStart(2, '0');
      setTimerString(`${h}:${m}:${s}`);
    }, 1000);
  }, [stopTimer]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimer.current !== null) {
      window.clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const sendHeartbeat = useCallback(async (operationId: string) => {
    try {
      const result = await tauriClient.touchOperationLock({
        operation_id: operationId,
      });
      if (!result.ok) onFeedback(result.message);
    } catch (error) {
      console.warn('Heartbeat failed', error);
    }
  }, [onFeedback]);

  // Sync with monitor snapshot
  useEffect(() => {
    if (isFinishingOperation) return;

    if (!monitor?.active_operations || !machineName.trim()) return;

    const currentOperation = monitor.active_operations.find((row) => {
      const sameMachine = row.machine_name.trim() === machineName.trim();
      const sameOperator = row.operator_name.trim() === operatorName.trim();

      return sameMachine && sameOperator;
    });

    if (!currentOperation) {
      if (activeOperationId) {
        setActiveOperationId('');
        setTimerString('00:00:00');
        stopTimer();
      }
      return;
    }

    if (activeOperationId !== currentOperation.operation_id) {
      setActiveOperationId(currentOperation.operation_id);
    }

    if (operationTimer.current === null) {
      startTimer(currentOperation.started_at);
    }
  }, [
    activeOperationId,
    machineName,
    operatorName,
    isFinishingOperation,
    monitor?.active_operations,
  ]);

  // Heartbeat management
  useEffect(() => {
    if (!activeOperationId) {
      stopHeartbeat();
      stopTimer();
      return;
    }

    void sendHeartbeat(activeOperationId);
    heartbeatTimer.current = window.setInterval(() => {
      void sendHeartbeat(activeOperationId);
    }, 15000);

    return () => stopHeartbeat();
  }, [activeOperationId]);

  return {
    activeOperationId,
    timerString,
    setActiveOperationId,
    setTimerString,
    startTimer,
    stopTimer,
  };
}
