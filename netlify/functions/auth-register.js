const { json, normalizeUsername, setupAuth, hashPassword } = require('./_lib/auth');
const crypto = require('crypto');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const username = normalizeUsername(body.username);
    const password = String(body.password || '');

    if (username.length < 3) {
      return json(400, { ok: false, error: 'El usuario debe tener al menos 3 caracteres' });
    }
    if (password.trim().length < 4) {
      return json(400, { ok: false, error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    const sql = await setupAuth();
    const existing = await sql`select id from auth_users where username = ${username} limit 1`;
    if (existing.length > 0) {
      return json(409, { ok: false, error: 'Ese usuario ya existe' });
    }

    const passwordHash = await hashPassword(password);
    await sql`
      insert into auth_users (id, username, password_hash, role, status, created_at)
      values (${crypto.randomUUID()}, ${username}, ${passwordHash}, ${'therapist'}, ${'pending'}, now())
    `;

    return json(200, { ok: true });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'Register error' });
  }
};
