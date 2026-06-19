-- Multi-tenancy: users and locations
-- Run after 01_tables.sql through 06_veprim_batch_ora_pershkrimi.sql

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ui_lloji_enum') then
    create type ui_lloji_enum as enum ('legacy_fixed', 'dynamic');
  end if;
end
$$;

create table if not exists public.perdorues (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  emri text,
  google_sub text unique,
  ui_lloji ui_lloji_enum not null default 'dynamic',
  is_legacy boolean not null default false,
  krijuar_at timestamptz not null default now(),
  aktiv boolean not null default true
);

create table if not exists public.lokacioni (
  id uuid primary key default gen_random_uuid(),
  pronari_id uuid not null references public.perdorues (id) on delete cascade,
  emri text not null,
  kodi text not null,
  flag_emoji text,
  rradhitja int not null default 0,
  show_in_summary boolean not null default true,
  aktiv boolean not null default true,
  unique (pronari_id, kodi)
);

create index if not exists lokacioni_pronari_idx on public.lokacioni (pronari_id, rradhitja);

-- Placeholder legacy user; email/password updated by scripts/seed-legacy-user.ts
insert into public.perdorues (id, email, password_hash, emri, ui_lloji, is_legacy)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'legacy@pending.migration',
  null,
  'Legacy User',
  'legacy_fixed',
  true
)
on conflict (id) do nothing;
