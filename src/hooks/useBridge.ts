'use client';

import { useCallback, useEffect, useState } from 'react';
import { bridge, BridgeError, DEFAULT_BRIDGE_SETTINGS, type BridgeSettings, type BridgeStatus, type Position } from '@/lib/bridge';

const STORAGE_KEY = 'achwanya.bridge';
const STATUS_POLL_MS = 15_000;
const POSITIONS_POLL_MS = 5_000;

function loadSettings(): BridgeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_BRIDGE_SETTINGS, ...(JSON.parse(raw) as Partial<BridgeSettings>) };
  } catch {
    // private mode / blocked storage: fall back to defaults
  }
  return DEFAULT_BRIDGE_SETTINGS;
}

/** Connection to the local MT5 bridge. Must only be used client-side (reads localStorage on init). */
export function useBridge() {
  const [settings, setSettingsState] = useState<BridgeSettings>(loadSettings);
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [checking, setChecking] = useState(false);

  const setSettings = useCallback((next: BridgeSettings) => {
    setSettingsState(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // settings just won't persist
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!settings.token) {
      setStatus(null);
      setError('Paste the bridge token to connect.');
      return;
    }
    setChecking(true);
    try {
      setStatus(await bridge.status(settings));
      setError(null);
    } catch (err) {
      setStatus(null);
      setError(err instanceof BridgeError ? err.message : 'Bridge check failed');
    } finally {
      setChecking(false);
    }
  }, [settings]);

  const refreshPositions = useCallback(async () => {
    try {
      setPositions(await bridge.positions(settings));
    } catch {
      // status polling reports connectivity problems
    }
  }, [settings]);

  useEffect(() => {
    if (!settings.token) return;
    const run = () => void checkStatus();
    const first = setTimeout(run, 0);
    const timer = setInterval(run, STATUS_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [checkStatus, settings.token]);

  const online = !!status?.connected;
  useEffect(() => {
    if (!online) return;
    const run = () => void refreshPositions();
    const first = setTimeout(run, 0);
    const timer = setInterval(run, POSITIONS_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [online, refreshPositions]);

  const closePosition = useCallback(
    async (ticket: number) => {
      await bridge.close(settings, ticket);
      await refreshPositions();
    },
    [refreshPositions, settings],
  );

  return {
    settings,
    setSettings,
    status,
    online,
    error,
    checking,
    checkStatus,
    positions: online ? positions : [],
    refreshPositions,
    closePosition,
  };
}

export type BridgeHandle = ReturnType<typeof useBridge>;
