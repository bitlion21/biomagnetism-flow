const crypto = require('crypto');
const { getSql } = require('./neon-client');

const SESSION_TTL_DAYS = 30;

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function generateId() {
  return crypto.randomUUID();
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, passwordHash) {
  return new Promise((resolve, reject) => {
    const [salt, storedHash] = String(passwordHash || '').split(':');
    if (!salt || !storedHash) {
      resolve(false);
      return;
    }
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      const stored = Buffer.from(storedHash, 'hex');
      const received = Buffer.from(derivedKey.toString('hex'), 'hex');
      if (stored.length !== received.length) {
        resolve(false);
        return;
      }
      resolve(crypto.timingSafeEqual(stored, received));
    });
  });
}

function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    approvedAt: row.approved_at || undefined,
  };
}

async function ensureAuthTables(sql) {
  await sql`
    create table if not exists auth_users (
      id text primary key,
      username text not null unique,
      password_hash text not null,
      role text not null check (role in ('admin', 'therapist')),
      status text not null check (status in ('pending', 'approved', 'disabled', 'rejected')),
      created_at timestamptz not null default now(),
      approved_at timestamptz
    )
  `;

  await sql`
    create table if not exists auth_sessions (
      id text primary key,
      user_id text not null references auth_users(id) on delete cascade,
      token_hash text not null unique,
      created_at timestamptz not null default now(),
      expires_at timestamptz not null
    )
  `;

  await sql`create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id)`;
}

async function seedDefaultUsers(sql) {
  const defaults = [
    { username: 'leo', password: '2225', role: 'admin', status: 'approved' },
    { username: 'cristina', password: 'biomag2026', role: 'therapist', status: 'approved' },
    { username: 'testuser', password: 'biomag', role: 'therapist', status: 'approved' },
  ];

  for (const item of defaults) {
    const existing = await sql`select id from auth_users where username = ${item.username} limit 1`;
    if (existing.length > 0) continue;

    const passwordHash = await hashPassword(item.password);
    await sql`
      insert into auth_users (id, username, password_hash, role, status, created_at, approved_at)
      values (
        ${generateId()},
        ${item.username},
        ${passwordHash},
        ${item.role},
        ${item.status},
        now(),
        ${item.status === 'approved' ? new Date().toISOString() : null}
      )
    `;
  }
}

async function setupAuth() {
  const sql = getSql();
  await ensureAuthTables(sql);
  await seedDefaultUsers(sql);
  return sql;
}

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

async function getSessionUser(sql, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await sql`
    select
      u.id,
      u.username,
      u.role,
      u.status,
      u.created_at,
      u.approved_at
    from auth_sessions s
    join auth_users u on u.id = s.user_id
    where s.token_hash = ${tokenHash}
      and u.status = 'approved'
      and s.expires_at > now()
    limit 1
  `;
  return rows[0] ? toPublicUser(rows[0]) : null;
}

async function requireSession(event) {
  const sql = await setupAuth();
  const token = getBearerToken(event);
  const user = await getSessionUser(sql, token);
  if (!user) {
    return { ok: false, response: json(401, { ok: false, error: 'Unauthorized' }) };
  }
  return { ok: true, sql, user, token };
}

async function createSession(sql, userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await sql`
    insert into auth_sessions (id, user_id, token_hash, created_at, expires_at)
    values (${generateId()}, ${userId}, ${hashToken(token)}, now(), ${expiresAt})
  `;

  return { token, expiresAt };
}

async function revokeSession(sql, token) {
  if (!token) return;
  await sql`delete from auth_sessions where token_hash = ${hashToken(token)}`;
}

module.exports = {
  json,
  normalizeUsername,
  hashPassword,
  verifyPassword,
  toPublicUser,
  setupAuth,
  requireSession,
  createSession,
  revokeSession,
};
