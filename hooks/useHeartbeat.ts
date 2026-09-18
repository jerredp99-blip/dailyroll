import { useEffect } from 'react';

export function useHeartbeat(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    const sendPing = () => {
      if (document.visibilityState === 'visible') {
        navigator.sendBeacon?.('/api/user/heartbeat', JSON.stringify({ userId }));
      }
    };

    sendPing();
    const interval = setInterval(sendPing, 2 * 60 * 1000); // 2 minutes

    return () => clearInterval(interval);
  }, [userId]);
}

