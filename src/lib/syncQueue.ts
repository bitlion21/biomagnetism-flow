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

const readQueue = (): SyncMutation[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: SyncMutation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // ignore quota/storage errors in local-only mode
  }
};

export const getSyncQueue = (): SyncMutation[] => readQueue();

export const clearSyncQueue = () => writeQueue([]);

export const enqueueSyncMutation = (
  mutation: Omit<SyncMutation, 'id' | 'createdAt' | 'attempts'>
) => {
  if (!dataRuntime.syncEnabled) return;

  const queue = readQueue();
  queue.push({
    ...mutation,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  writeQueue(queue);
};

export const replaceSyncQueue = (nextQueue: SyncMutation[]) => {
  writeQueue(nextQueue);
};

export const incrementQueueAttempts = (ids: string[]) => {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const next = readQueue().map((item) =>
    idSet.has(item.id) ? { ...item, attempts: item.attempts + 1 } : item
  );
  writeQueue(next);
};
