const { json, requireSession, toPublicUser } = require('./_lib/auth');

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const auth = await requireSession(event);
    if (!auth.ok) return auth.response;
    if (auth.user.role !== 'admin') {
      return json(403, { ok: false, error: 'Forbidden' });
    }

    const rows = await auth.sql`
      select id, username, role, status, created_at, approved_at
      from auth_users
      order by
        case when status = 'pending' then 0 else 1 end,
        username asc
    `;

    return json(200, { ok: true, accounts: rows.map(toPublicUser) });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'Users error' });
  }
};
