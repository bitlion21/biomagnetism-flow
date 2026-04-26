import { dataRuntime } from '@/lib/dataRuntime';
import {
  getSyncQueue,
  incrementQueueAttempts,
  replaceSyncQueue,
  type SyncMutation,
} from '@/lib/syncQueue';

interface SyncBatchResponse {
  ok: boolean;
  processedIds?: string[];
  error?: string;
}

export const syncPendingMutations = async (username?: string): Promise<SyncBatchResponse> => {
  if (!dataRuntime.syncEnabled) {
    return { ok: true, processedIds: [] };
  }
  if (!username) {
    return { ok: false, error: 'Missing username for sync' };
  }

  const queue = getSyncQueue(username);
  if (queue.length === 0) {
    return { ok: true, processedIds: [] };
  }

  const batch = queue.slice(0, 50);
  const batchIds = batch.map((item) => item.id);

  try {
    const response = await fetch(`${dataRuntime.syncApiBase}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, mutations: batch }),
    });
    const payload = (await response.json()) as SyncBatchResponse;

    if (!response.ok || !payload.ok) {
      incrementQueueAttempts(batchIds, username);
      return {
        ok: false,
        error: payload.error || `HTTP ${response.status}`,
      };
    }

    const processed = new Set(payload.processedIds || []);
    replaceSyncQueue(queue.filter((item) => !processed.has(item.id)), username);
    return { ok: true, processedIds: [...processed] };
  } catch (error) {
    incrementQueueAttempts(batchIds, username);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error de sincronización',
    };
  }
};

export const getPendingSyncCount = (username?: string) => getSyncQueue(username).length;

interface HybridBootstrapPayload {
  ok: boolean;
  patients?: unknown[];
  appointments?: unknown[];
  sessions?: unknown[];
  error?: string;
}

export const fetchHybridBootstrap = async (username?: string): Promise<HybridBootstrapPayload> => {
  if (!dataRuntime.syncEnabled) {
    return { ok: false, error: 'Hybrid mode disabled' };
  }
  if (!username) {
    return { ok: false, error: 'Missing username for bootstrap' };
  }

  try {
    const params = new URLSearchParams({ username });
    const response = await fetch(`${dataRuntime.syncApiBase}/bootstrap?${params.toString()}`);
    const payload = (await response.json()) as HybridBootstrapPayload;
    if (!response.ok) return { ok: false, error: payload.error || `HTTP ${response.status}` };
    return payload;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Bootstrap error',
    };
  }
};

export type { SyncMutation };
