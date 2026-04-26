const { getSql } = require('./_lib/neon-client');

const ALLOWED_ENTITIES = new Set(['patients', 'appointments', 'sessions']);
const ALLOWED_ACTIONS = new Set(['upsert', 'delete']);

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function validateMutations(input) {
  if (!Array.isArray(input)) return { ok: false, error: 'mutations must be an array' };
  for (const item of input) {
    if (!item || typeof item !== 'object') return { ok: false, error: 'invalid mutation item' };
    if (!ALLOWED_ENTITIES.has(item.entity)) return { ok: false, error: `invalid entity: ${item.entity}` };
    if (!ALLOWED_ACTIONS.has(item.action)) return { ok: false, error: `invalid action: ${item.action}` };
    if (!item.recordId || typeof item.recordId !== 'string') return { ok: false, error: 'recordId is required' };
    if (!item.id || typeof item.id !== 'string') return { ok: false, error: 'id is required' };
    if (item.action === 'upsert' && (!item.payload || typeof item.payload !== 'object')) {
      return { ok: false, error: 'payload is required for upsert' };
    }
  }
  return { ok: true };
}

async function ensureSyncLogTable(sql) {
  await sql`
    create table if not exists sync_mutation_log (
      mutation_id text primary key,
      owner_username text not null,
      entity text not null,
      action text not null,
      record_id text not null,
      received_at timestamptz not null default now()
    )
  `;
}

async function ensureOwnershipColumns(sql) {
  await sql`alter table patients add column if not exists owner_username text`;
  await sql`alter table appointments add column if not exists owner_username text`;
  await sql`alter table sessions add column if not exists owner_username text`;
}

const asIsoOrNow = (value) => {
  if (!value) return new Date().toISOString();
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
};

const asDateOnly = (value, fallback = null) => {
  if (!value) return fallback;
  return String(value).slice(0, 10);
};

async function upsertPatient(sql, username, payload) {
  const id = String(payload.id || '');
  if (!id) throw new Error('patient.id is required');
  const phone = String(payload.phone || '').trim();
  if (!phone) throw new Error('patient.phone is required');

  await sql`
    insert into patients (
      id, owner_username, phone, name, last_name, email, birth_date, sex, data, created_at, updated_at, deleted_at
    ) values (
      ${id},
      ${username},
      ${phone},
      ${payload.name ? String(payload.name) : null},
      ${payload.lastName ? String(payload.lastName) : null},
      ${payload.email ? String(payload.email) : null},
      ${asDateOnly(payload.birthDate)},
      ${payload.sex ? String(payload.sex) : null},
      ${JSON.stringify(payload)},
      ${asIsoOrNow(payload.createdAt)},
      ${asIsoOrNow(payload.updatedAt)},
      ${null}
    )
    on conflict (id) do update set
      owner_username = excluded.owner_username,
      phone = excluded.phone,
      name = excluded.name,
      last_name = excluded.last_name,
      email = excluded.email,
      birth_date = excluded.birth_date,
      sex = excluded.sex,
      data = excluded.data,
      updated_at = excluded.updated_at,
      deleted_at = null
    where excluded.updated_at >= patients.updated_at
  `;
}

async function deletePatient(sql, username, recordId) {
  await sql`
    update patients
    set deleted_at = now(), updated_at = now()
    where id = ${recordId} and owner_username = ${username}
  `;
}

async function upsertAppointment(sql, username, payload) {
  const id = String(payload.id || '');
  if (!id) throw new Error('appointment.id is required');
  if (!payload.patientId) throw new Error('appointment.patientId is required');
  if (!payload.date) throw new Error('appointment.date is required');
  if (!payload.time) throw new Error('appointment.time is required');

  await sql`
    insert into appointments (
      id, owner_username, patient_id, date, time, duration, status, notes, data, created_at, updated_at, deleted_at
    ) values (
      ${id},
      ${username},
      ${String(payload.patientId)},
      ${asDateOnly(payload.date)},
      ${String(payload.time)},
      ${Number(payload.duration || 0)},
      ${String(payload.status || 'scheduled')},
      ${payload.notes ? String(payload.notes) : null},
      ${JSON.stringify(payload)},
      ${asIsoOrNow(payload.createdAt)},
      ${asIsoOrNow(payload.updatedAt || payload.createdAt)},
      ${null}
    )
    on conflict (id) do update set
      owner_username = excluded.owner_username,
      patient_id = excluded.patient_id,
      date = excluded.date,
      time = excluded.time,
      duration = excluded.duration,
      status = excluded.status,
      notes = excluded.notes,
      data = excluded.data,
      updated_at = excluded.updated_at,
      deleted_at = null
    where excluded.updated_at >= appointments.updated_at
  `;
}

async function deleteAppointment(sql, username, recordId) {
  await sql`
    update appointments
    set deleted_at = now(), updated_at = now()
    where id = ${recordId} and owner_username = ${username}
  `;
}

async function upsertSession(sql, username, payload) {
  const id = String(payload.id || '');
  if (!id) throw new Error('session.id is required');
  if (!payload.patientId) throw new Error('session.patientId is required');
  if (!payload.date) throw new Error('session.date is required');

  await sql`
    insert into sessions (
      id, owner_username, patient_id, appointment_id, date, summary, selected_pairs, clinical_checklist, free_notes, data, created_at, updated_at, deleted_at
    ) values (
      ${id},
      ${username},
      ${String(payload.patientId)},
      ${payload.appointmentId ? String(payload.appointmentId) : null},
      ${asDateOnly(payload.date)},
      ${payload.summary ? String(payload.summary) : null},
      ${JSON.stringify(Array.isArray(payload.selectedPairs) ? payload.selectedPairs : [])},
      ${JSON.stringify(Array.isArray(payload.clinicalChecklist) ? payload.clinicalChecklist : [])},
      ${payload.freeNotes ? String(payload.freeNotes) : null},
      ${JSON.stringify(payload)},
      ${asIsoOrNow(payload.createdAt)},
      ${asIsoOrNow(payload.updatedAt || payload.createdAt)},
      ${null}
    )
    on conflict (id) do update set
      owner_username = excluded.owner_username,
      patient_id = excluded.patient_id,
      appointment_id = excluded.appointment_id,
      date = excluded.date,
      summary = excluded.summary,
      selected_pairs = excluded.selected_pairs,
      clinical_checklist = excluded.clinical_checklist,
      free_notes = excluded.free_notes,
      data = excluded.data,
      updated_at = excluded.updated_at,
      deleted_at = null
    where excluded.updated_at >= sessions.updated_at
  `;
}

async function deleteSession(sql, username, recordId) {
  await sql`
    update sessions
    set deleted_at = now(), updated_at = now()
    where id = ${recordId} and owner_username = ${username}
  `;
}

async function applyMutation(sql, username, mutation) {
  if (mutation.entity === 'patients' && mutation.action === 'upsert') return upsertPatient(sql, username, mutation.payload);
  if (mutation.entity === 'patients' && mutation.action === 'delete') return deletePatient(sql, username, mutation.recordId);
  if (mutation.entity === 'appointments' && mutation.action === 'upsert') return upsertAppointment(sql, username, mutation.payload);
  if (mutation.entity === 'appointments' && mutation.action === 'delete') return deleteAppointment(sql, username, mutation.recordId);
  if (mutation.entity === 'sessions' && mutation.action === 'upsert') return upsertSession(sql, username, mutation.payload);
  if (mutation.entity === 'sessions' && mutation.action === 'delete') return deleteSession(sql, username, mutation.recordId);
  throw new Error(`Unsupported mutation ${mutation.entity}/${mutation.action}`);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const username = String(body.username || '').trim().toLowerCase();
    if (!username) return json(400, { ok: false, error: 'username is required' });
    const mutations = body.mutations || [];
    const validation = validateMutations(mutations);
    if (!validation.ok) return json(400, validation);

    const sql = getSql();
    await ensureOwnershipColumns(sql);
    await ensureSyncLogTable(sql);

    const processedIds = [];
    for (const mutation of mutations) {
      const inserted = await sql`
        insert into sync_mutation_log (mutation_id, owner_username, entity, action, record_id)
        values (${mutation.id}, ${username}, ${mutation.entity}, ${mutation.action}, ${mutation.recordId})
        on conflict (mutation_id) do nothing
        returning mutation_id
      `;

      // Already processed previously: treat as success (idempotent).
      if (!inserted || inserted.length === 0) {
        processedIds.push(mutation.id);
        continue;
      }

      await applyMutation(sql, username, mutation);
      processedIds.push(mutation.id);
    }

    return json(200, { ok: true, processedIds });
  } catch (error) {
    return json(500, {
      ok: false,
      error: error instanceof Error ? error.message : 'sync error',
    });
  }
};
