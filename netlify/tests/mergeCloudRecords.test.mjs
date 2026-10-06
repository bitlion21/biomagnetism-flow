import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(fs.readFileSync(new URL('../../src/lib/mergeCloudRecords.ts', import.meta.url), 'utf8'));
const { mergeCloudRecords } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('explicit tombstones remove stale records for every clinical entity', () => {
  for (const entity of ['patients', 'appointments', 'sessions']) {
    assert.deepEqual(mergeCloudRecords([{ id: 'deleted' }, { id: 'kept' }], [], entity, [], ['deleted']), [{ id: 'kept' }]);
  }
});

test('missing remote records are not treated as deletions', () => {
  assert.deepEqual(mergeCloudRecords([{ id: 'local-only' }], [], 'patients', []), [{ id: 'local-only' }]);
});

test('pending local edits are protected from cloud deletion and replacement', () => {
  const local = [{ id: 'pending', name: 'unsent' }];
  const pending = [{ entity: 'patients', action: 'upsert', recordId: 'pending' }];
  assert.deepEqual(mergeCloudRecords(local, [], 'patients', pending, ['pending']), local);
  assert.deepEqual(mergeCloudRecords(local, [{ id: 'pending', name: 'remote' }], 'patients', pending), local);
});

test('pending operations in another entity do not block a confirmed deletion', () => {
  assert.deepEqual(mergeCloudRecords([{ id: 'same' }], [], 'patients', [{ entity: 'sessions', recordId: 'same' }], ['same']), []);
});

test('pending local deletion cannot be resurrected by an older cloud response', () => {
  assert.deepEqual(mergeCloudRecords([], [{ id: 'deleted' }], 'patients', [{ entity: 'patients', action: 'delete', recordId: 'deleted' }]), []);
});

test('a live record wins over contradictory deletion metadata', () => {
  assert.deepEqual(mergeCloudRecords([{ id: 'live' }], [{ id: 'live', name: 'current' }], 'patients', [], ['live']), [{ id: 'live', name: 'current' }]);
});

test('malformed tombstones do not delete local records', () => {
  assert.deepEqual(mergeCloudRecords([{ id: 'kept' }], [], 'patients', [], 'kept'), [{ id: 'kept' }]);
});
