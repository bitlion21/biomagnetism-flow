const { json, requireSession } = require('./_lib/auth');

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
    if (!userId) {
      return json(400, { ok: false, error: 'userId is required' });
    }

    const users = await auth.sql`
      select id, username, role
      from auth_users
      where id = ${userId}
      limit 1
    `;
    const account = users[0];
    if (!account) {
      return json(404, { ok: false, error: 'Usuario no encontrado' });
    }
    if (account.username === 'leo') {
      return json(400, { ok: false, error: 'No se puede eliminar el administrador principal' });
    }

    const [patientsCount, appointmentsCount, sessionsCount] = await Promise.all([
      auth.sql`select count(*)::int as count from patients where owner_username = ${account.username} and deleted_at is null`,
      auth.sql`select count(*)::int as count from appointments where owner_username = ${account.username} and deleted_at is null`,
      auth.sql`select count(*)::int as count from sessions where owner_username = ${account.username} and deleted_at is null`,
    ]);

    const counts = {
      patients: patientsCount[0]?.count || 0,
      appointments: appointmentsCount[0]?.count || 0,
      sessions: sessionsCount[0]?.count || 0,
    };

    if (counts.patients > 0 || counts.appointments > 0 || counts.sessions > 0) {
      return json(409, {
        ok: false,
        error: 'No se puede eliminar un usuario con datos clínicos asociados',
        counts,
      });
    }

    await auth.sql`delete from auth_sessions where user_id = ${userId}`;
    await auth.sql`delete from auth_users where id = ${userId}`;

    return json(200, { ok: true });
  } catch (error) {
    return json(500, { ok: false, error: error instanceof Error ? error.message : 'User delete error' });
  }
};
