begin;

alter table patients add column if not exists owner_username text;
alter table appointments add column if not exists owner_username text;
alter table sessions add column if not exists owner_username text;
alter table sync_mutation_log add column if not exists owner_username text;

update patients
set owner_username = 'leo'
where owner_username is null or btrim(owner_username) = '';

update appointments
set owner_username = 'leo'
where owner_username is null or btrim(owner_username) = '';

update sessions
set owner_username = 'leo'
where owner_username is null or btrim(owner_username) = '';

update sync_mutation_log
set owner_username = 'leo'
where owner_username is null or btrim(owner_username) = '';

alter table patients alter column owner_username set not null;
alter table appointments alter column owner_username set not null;
alter table sessions alter column owner_username set not null;
alter table sync_mutation_log alter column owner_username set not null;

create index if not exists patients_owner_username_idx on patients(owner_username);
create index if not exists appointments_owner_username_idx on appointments(owner_username);
create index if not exists sessions_owner_username_idx on sessions(owner_username);

commit;
