import { useEffect, useRef, useState, useCallback } from 'react';
import type { PoolStatusMessage } from '../types';

export function usePoolStatusWebSocket() {
  const [pools, setPools] = useState<PoolStatusMessage['pools']>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/v1/ws/pool-status`);

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
    ws.onmessage = (event) => {
      try {
        const data: PoolStatusMessage = JSON.parse(event.data);
        if (data.type === 'pool_status') {
          setPools(data.pools);
        }
      } catch {
        // ignore parse errors
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  return { pools, connected };
}
