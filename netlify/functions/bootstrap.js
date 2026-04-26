const { getSql } = require('./_lib/neon-client');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function rowDataOrFallback(row, fallback) {
  if (row && row.data && typeof row.data === 'object') {
    return row.data;
  }
  return fallback;
}

async function ensureOwnershipColumns(sql) {
  await sql`alter table patients add column if not exists owner_username text`;
  await sql`alter table appointments add column if not exists owner_username text`;
  await sql`alter table sessions add column if not exists owner_username text`;
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'GET') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const username = String(event.queryStringParameters?.username || '').trim().toLowerCase();
    if (!username) {
      return json(400, { ok: false, error: 'username is required' });
    }

    const sql = getSql();
    await ensureOwnershipColumns(sql);

    const [patientsRows, appointmentsRows, sessionsRows] = await Promise.all([
      sql`select * from patients where owner_username = ${username} and deleted_at is null order by created_at asc`,
      sql`select * from appointments where owner_username = ${username} and deleted_at is null order by date asc, time asc`,
      sql`select * from sessions where owner_username = ${username} and deleted_at is null order by date desc, created_at desc`,
    ]);

    const patients = patientsRows.map((row) =>
      rowDataOrFallback(row, {
        id: row.id,
        phone: row.phone,
        name: row.name || undefined,
        lastName: row.last_name || undefined,
        email: row.email || undefined,
        birthDate: row.birth_date ? String(row.birth_date).slice(0, 10) : undefined,
        sex: row.sex || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    );

    const appointments = appointmentsRows.map((row) =>
      rowDataOrFallback(row, {
        id: row.id,
        patientId: row.patient_id,
        date: row.date ? String(row.date).slice(0, 10) : undefined,
        time: row.time,
        duration: row.duration,
        status: row.status,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      })
    );

    const sessions = sessionsRows.map((row) =>
      rowDataOrFallback(row, {
        id: row.id,
        patientId: row.patient_id,
        appointmentId: row.appointment_id || undefined,
        date: row.date ? String(row.date).slice(0, 10) : undefined,
        summary: row.summary || undefined,
        selectedPairs: row.selected_pairs || [],
        clinicalChecklist: row.clinical_checklist || [],
        freeNotes: row.free_notes || undefined,
        createdAt: row.created_at,
      })
    );

    return json(200, {
      ok: true,
      patients,
      appointments,
      sessions,
    });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'bootstrap error',
    });
  }
};
