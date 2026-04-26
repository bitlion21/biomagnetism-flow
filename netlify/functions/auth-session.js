const { json, requireSession, revokeSession } = require('./_lib/auth');

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod === 'GET') {
      const auth = await requireSession(event);
      if (!auth.ok) return auth.response;
      return json(200, { ok: true, user: auth.user });
    }

    if (event.httpMethod === 'DELETE') {
      const auth = await requireSession(event);
      if (!auth.ok) return auth.response;
      await revokeSession(auth.sql, auth.token);
      return json(200, { ok: true });
    }

    return json(405, { ok: false, error: 'Method not allowed' });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'Session error' });
  }
};
