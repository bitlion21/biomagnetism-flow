-- Fase 1 (offline-first híbrido): tablas base para sincronización futura.
-- Nota: en esta iteración la función /api/sync solo registra mutaciones idempotentes.

create table if not exists patients (
  id text primary key,
  owner_username text not null,
  phone text not null,
  name text,
  last_name text,
  email text,
  birth_date date,
  sex text check (sex in ('male', 'female', 'other')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table patients add column if not exists owner_username text;

create table if not exists appointments (
  id text primary key,
  owner_username text not null,
  patient_id text not null references patients(id),
  date date not null,
  time text not null,
  duration integer not null,
  status text not null,
  notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table appointments add column if not exists owner_username text;

create table if not exists sessions (
  id text primary key,
  owner_username text not null,
  patient_id text not null references patients(id),
  appointment_id text,
  date date not null,
  summary text,
  selected_pairs jsonb not null default '[]'::jsonb,
  clinical_checklist jsonb not null default '[]'::jsonb,
  free_notes text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table sessions add column if not exists owner_username text;

create table if not exists sync_mutation_log (
  mutation_id text primary key,
  owner_username text not null,
  entity text not null,
  action text not null,
  record_id text not null,
  received_at timestamptz not null default now()
);

alter table sync_mutation_log add column if not exists owner_username text;

create index if not exists patients_owner_username_idx on patients(owner_username);
create index if not exists appointments_owner_username_idx on appointments(owner_username);
create index if not exists sessions_owner_username_idx on sessions(owner_username);

create table if not exists auth_users (
  id text primary key,
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin', 'therapist')),
  status text not null check (status in ('pending', 'approved', 'disabled', 'rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create table if not exists auth_sessions (
  id text primary key,
  user_id text not null references auth_users(id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists auth_sessions_user_id_idx on auth_sessions(user_id);
