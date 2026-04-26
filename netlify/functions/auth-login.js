const { json, normalizeUsername, setupAuth, verifyPassword, createSession, toPublicUser } = require('./_lib/auth');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const username = normalizeUsername(body.username);
    const password = String(body.password || '');

    if (!username || !password) {
      return json(400, { ok: false, error: 'username and password are required' });
    }

    const sql = await setupAuth();
    const rows = await sql`select * from auth_users where username = ${username} limit 1`;
    const account = rows[0];

    if (!account) {
      return json(401, { ok: false, error: 'Credenciales incorrectas' });
    }

    const passwordOk = await verifyPassword(password, account.password_hash);
    if (!passwordOk) {
      return json(401, { ok: false, error: 'Credenciales incorrectas' });
    }

    if (account.status === 'pending') {
      return json(403, { ok: false, error: 'Tu cuenta está pendiente de aprobación' });
    }
    if (account.status === 'disabled') {
      return json(403, { ok: false, error: 'Tu cuenta está desactivada' });
    }
    if (account.status === 'rejected') {
      return json(403, { ok: false, error: 'Tu solicitud fue rechazada' });
    }

    const session = await createSession(sql, account.id);
    return json(200, {
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: toPublicUser(account),
    });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'Login error' });
  }
};
