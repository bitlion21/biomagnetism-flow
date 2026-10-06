import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';

const source = stripTypeScriptTypes(fs.readFileSync(new URL('../../src/lib/authClient.ts', import.meta.url), 'utf8'));
const { registerRequest } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('registration is confirmed only by a successful server response', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/auth-register');
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { username: 'fictional', password: 'fictional-secret' });
    return Response.json({ ok: true });
  });
  assert.deepEqual(await registerRequest('fictional', 'fictional-secret'), { ok: true, data: null });
});

test('duplicate usernames return the server error', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({ ok: false, error: 'Ese usuario ya existe' }, { status: 409 }));
  assert.deepEqual(await registerRequest('fictional', 'fictional-secret'), { ok: false, error: 'Ese usuario ya existe' });
});

test('HTML from an unavailable API is not a successful registration', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<!doctype html>', { status: 503, headers: { 'Content-Type': 'text/html' } }));
  assert.deepEqual(await registerRequest('fictional', 'fictional-secret'), { ok: false, error: 'AUTH_API_UNAVAILABLE' });
});

test('a connection failure cannot confirm a registration', async t => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Sin conexion'); });
  assert.deepEqual(await registerRequest('fictional', 'fictional-secret'), { ok: false, error: 'Sin conexion' });
});
