const { json, requireSession, toPublicUser } = require('./_lib/auth');

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'disabled', 'rejected']);

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const auth = await requireSession(event);
    if (!auth.ok) return auth.response;
    if (auth.user.role !== 'admin') {
      return json(403, { ok: false, error: 'Forbidden' });
    }

    const body = JSON.parse(event.body || '{}');
    const userId = String(body.userId || '');
    const status = String(body.status || '');

    if (!userId || !ALLOWED_STATUSES.has(status)) {
      return json(400, { ok: false, error: 'userId and valid status are required' });
    }

    const result = await auth.sql`
      update auth_users
      set
        status = ${status},
        approved_at = case
          when ${status} = 'approved' then now()
          else approved_at
        end
      where id = ${userId}
      returning id, username, role, status, created_at, approved_at
    `;

    if (result.length === 0) {
      return json(404, { ok: false, error: 'Usuario no encontrado' });
    }

    return json(200, { ok: true, account: toPublicUser(result[0]) });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'User update error' });
  }
};
