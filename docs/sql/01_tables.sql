-- Inventari base schema (Supabase Postgres)
-- Run in Supabase SQL editor.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'shteti_enum') then
    create type shteti_enum as enum ('XK', 'AL');
  end if;

  if not exists (select 1 from pg_type where typname = 'lloji_veprimi_enum') then
    create type lloji_veprimi_enum as enum ('Hyrje', 'Dalje');
  end if;
end
$$;

create table if not exists public.produkti (
  id uuid primary key default gen_random_uuid(),
  kodi text not null unique,
  emri text not null,
  gjendje_kosove integer not null default 0 check (gjendje_kosove >= 0),
  gjendje_shqiperi integer not null default 0 check (gjendje_shqiperi >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.veprimi (
  id uuid primary key default gen_random_uuid(),
  lloji lloji_veprimi_enum not null,
  data date not null default current_date,
  shteti shteti_enum not null,
  kodi_produktit text not null,
  cmimi_njesi numeric(12,2) not null check (cmimi_njesi >= 0),
  sasia integer not null check (sasia > 0),
  totali numeric(14,2) generated always as (cmimi_njesi * sasia) stored,
  created_at timestamptz not null default now(),
  constraint veprimi_produkti_fk
    foreign key (kodi_produktit)
    references public.produkti (kodi)
    on update cascade
    on delete restrict
);

create index if not exists veprimi_shteti_data_idx on public.veprimi (shteti, data);
create index if not exists veprimi_kodi_idx on public.veprimi (kodi_produktit);

