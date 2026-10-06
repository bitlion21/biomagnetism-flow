import type { SyncEntity, SyncMutation } from '@/lib/syncQueue';

// Keep local-only records until their cloud ownership can be verified.
export function mergeCloudRecords<T extends { id: string }>(
  local: T[],
  remote: T[],
  entity: SyncEntity,
  pending: SyncMutation[],
): T[] {
  const protectedIds = new Set(pending.filter(item => item.entity === entity).map(item => item.recordId));
  const records = new Map(local.map(record => [record.id, record]));
  for (const record of remote) {
    if (!protectedIds.has(record.id)) records.set(record.id, record);
  }
  return [...records.values()];
}
