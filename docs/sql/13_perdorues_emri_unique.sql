-- Emri-based auth: unique display names, nullable email for password-only signups
-- Run after 07_perdorues_lokacioni.sql

begin;

-- Backfill emri for rows that have none (legacy seed user)
update public.perdorues
set emri = 'Legacy User'
where emri is null or trim(emri) = '';

-- Allow password-only users without email (Google/legacy users keep theirs)
alter table public.perdorues
  alter column email drop not null;

-- Case-insensitive unique emri (trimmed)
create unique index if not exists perdorues_emri_lower_idx
  on public.perdorues (lower(trim(emri)))
  where emri is not null;

commit;
