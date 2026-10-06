import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { syncPendingMutations } from './syncClient';
import { enqueueSyncMutation, getSyncQueue } from './syncQueue';
import { mergeCloudRecords } from './mergeCloudRecords';

vi.mock('@/lib/dataRuntime', () => ({ dataRuntime: { syncEnabled: true, syncApiBase: '/api' } }));

const enqueue = (recordId: string) => enqueueSyncMutation('leo', {
  entity: 'patients', action: 'upsert', recordId, payload: { id: recordId },
});

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

describe('patient sync preservation', () => {
  it('keeps edits saved while the server is responding and shares concurrent requests', async () => {
    enqueue('first');
    const firstId = getSyncQueue('leo')[0].id;
    let respond!: (response: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(resolve => { respond = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const first = syncPendingMutations('leo');
    const second = syncPendingMutations('leo');
    enqueue('second');
    respond(new Response(JSON.stringify({ ok: true, processedIds: [firstId] })));
    await Promise.all([first, second]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getSyncQueue('leo').map(item => item.recordId)).toEqual(['second']);
  });

  it('retains the queue if the server fails', async () => {
    enqueue('first');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Offline')));
    expect((await syncPendingMutations('leo')).ok).toBe(false);
    expect(getSyncQueue('leo')[0].recordId).toBe('first');
  });

  it('keeps local-only patients and pending edits while adding remote patients', () => {
    enqueue('editing');
    const local = [{ id: 'local-only', name: 'Local' }, { id: 'editing', name: 'New edit' }];
    const remote = [{ id: 'editing', name: 'Old edit' }, { id: 'remote', name: 'Remote' }];
    expect(mergeCloudRecords(local, remote, 'patients', getSyncQueue('leo'))).toEqual([
      ...local, remote[1],
    ]);
    expect(mergeCloudRecords(local, [], 'patients', [])).toEqual(local);
  });

  it('does not bring back a patient with a pending deletion', () => {
    enqueueSyncMutation('leo', { entity: 'patients', action: 'delete', recordId: 'deleted' });
    expect(mergeCloudRecords([], [{ id: 'deleted' }], 'patients', getSyncQueue('leo'))).toEqual([]);
  });
});
