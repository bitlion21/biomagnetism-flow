import { dataRuntime } from '@/lib/dataRuntime';

export type SyncEntity = 'patients' | 'appointments' | 'sessions';
export type SyncAction = 'upsert' | 'delete';

export interface SyncMutation {
  id: string;
  entity: SyncEntity;
  action: SyncAction;
  recordId: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  attempts: number;
}

const STORAGE_KEY = 'biomag_sync_queue_v1';

const getStorageKey = (username?: string) =>
  username ? `${STORAGE_KEY}:${username.trim().toLowerCase()}` : STORAGE_KEY;

const readQueue = (username?: string): SyncMutation[] => {
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: SyncMutation[], username?: string) => {
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(queue));
  } catch {
    // ignore quota/storage errors in local-only mode
  }
};

export const getSyncQueue = (username?: string): SyncMutation[] => readQueue(username);

export const clearSyncQueue = (username?: string) => writeQueue([], username);

export const enqueueSyncMutation = (
  username: string | undefined,
  mutation: Omit<SyncMutation, 'id' | 'createdAt' | 'attempts'>
) => {
  if (!dataRuntime.syncEnabled) return;
  if (!username) return;

  const queue = readQueue(username);
  queue.push({
    ...mutation,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  writeQueue(queue, username);
};

export const replaceSyncQueue = (nextQueue: SyncMutation[], username?: string) => {
  writeQueue(nextQueue, username);
};

export const incrementQueueAttempts = (ids: string[], username?: string) => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = readQueue(username).map((item) =>
    idSet.has(item.id) ? { ...item, attempts: item.attempts + 1 } : item
  );
  writeQueue(next, username);
};
