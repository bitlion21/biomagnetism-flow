import type { SyncEntity, SyncMutation } from '@/lib/syncQueue';

// Keep local-only records until their cloud ownership can be verified.
export function mergeCloudRecords<T extends { id: string }>(
  local: T[],
  remote: T[],
  entity: SyncEntity,
  pending: SyncMutation[],
  deleted: string[] = [],
): T[] {
  const protectedIds = new Set(pending.filter(item => item.entity === entity).map(item => item.recordId));
  const records = new Map(local.map(record => [record.id, record]));
  const activeIds = new Set(remote.map(record => record.id));
  // Only explicit cloud tombstones remove records; unsent edits remain protected.
  if (Array.isArray(deleted)) {
    for (const id of deleted) {
      if (typeof id === 'string' && !protectedIds.has(id) && !activeIds.has(id)) records.delete(id);
    }
  }
  for (const record of remote) {
    if (!protectedIds.has(record.id)) records.set(record.id, record);
  }
  return [...records.values()];
}
