import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSyncHandler } from '../functions/sync.js';

function fakeDatabase() {
  const state = { records: new Map(), logs: new Map(), transactions: 0, failLogOnce: false };
  function apply(query) {
    const { text, values } = query;
    if (text.includes('select owner_username')) {
      const log = state.logs.get(values[0]);
      return log ? [log] : [];
    }
    if (text.includes('insert into patients')) {
      state.records.set(values[0], { owner: values[1], phone: values[2] });
      return [];
    }
    if (text.includes('insert into sync_mutation_log')) {
      if (state.failLogOnce) { state.failLogOnce = false; throw new Error('Database failure'); }
      state.logs.set(values[0], { owner_username: values[1], entity: values[2], action: values[3], record_id: values[4] });
      return [];
    }
    return [];
  }
  const sql = (strings, ...values) => {
    const query = { text: strings.join('?'), values };
    return { ...query, then: (resolve, reject) => Promise.resolve().then(() => apply(query)).then(resolve, reject) };
  };
  sql.transaction = async queries => {
    state.transactions++;
    const before = { records: new Map(state.records), logs: new Map(state.logs) };
    try { return queries.map(apply); }
    catch (error) { state.records = before.records; state.logs = before.logs; throw error; }
  };
  return { sql, state };
}

const mutation = phone => ({ id: 'synthetic-mutation', entity: 'patients', action: 'upsert',
  recordId: 'synthetic-patient', payload: { id: 'synthetic-patient', ...(phone ? { phone } : {}) } });
const event = item => ({ httpMethod: 'POST', body: JSON.stringify({ username: 'leo', mutations: [item] }) });

test('a rejected write cannot be acknowledged on retry', async () => {
  const { sql, state } = fakeDatabase();
  const handler = createSyncHandler(() => sql);
  assert.equal((await handler(event(mutation()))).statusCode, 500);
  assert.equal((await handler(event(mutation()))).statusCode, 500);
  assert.equal(state.logs.size, 0);
  assert.equal(state.records.size, 0);
  const success = await handler(event(mutation('+00 000000000')));
  assert.equal(success.statusCode, 200);
  assert.deepEqual(JSON.parse(success.body).processedIds, ['synthetic-mutation']);
  assert.equal(state.records.size, 1);
});

test('a database failure rolls back both the record and acknowledgement', async () => {
  const { sql, state } = fakeDatabase();
  state.failLogOnce = true;
  const handler = createSyncHandler(() => sql);
  assert.equal((await handler(event(mutation('+00 000000000')))).statusCode, 500);
  assert.equal(state.records.size, 0);
  assert.equal(state.logs.size, 0);
  assert.equal((await handler(event(mutation('+00 000000000')))).statusCode, 200);
  assert.equal(state.records.size, 1);
  assert.equal(state.logs.size, 1);
});

test('an already committed retry is acknowledged without writing twice', async () => {
  const { sql, state } = fakeDatabase();
  const handler = createSyncHandler(() => sql);
  const item = mutation('+00 000000000');
  assert.equal((await handler(event(item))).statusCode, 200);
  assert.equal((await handler(event(item))).statusCode, 200);
  assert.equal(state.transactions, 1);
});

test('an operation id cannot acknowledge another owner or record', async () => {
  const { sql } = fakeDatabase();
  const handler = createSyncHandler(() => sql);
  const item = mutation('+00 000000000');
  assert.equal((await handler(event(item))).statusCode, 200);
  const otherOwner = { httpMethod: 'POST', body: JSON.stringify({ username: 'testuser', mutations: [item] }) };
  assert.equal((await handler(otherOwner)).statusCode, 500);
});
