-- Fase 1 (offline-first híbrido): tablas base para sincronización futura.
-- Nota: en esta iteración la función /api/sync solo registra mutaciones idempotentes.

create table if not exists patients (
  id text primary key,
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

create table if not exists appointments (
  id text primary key,
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

create table if not exists sessions (
  id text primary key,
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

create table if not exists sync_mutation_log (
  mutation_id text primary key,
  entity text not null,
  action text not null,
  record_id text not null,
  received_at timestamptz not null default now()
);
