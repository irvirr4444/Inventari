-- Multi-user roles and per-location access
-- Run manually in Supabase SQL editor after 07_perdorues_lokacioni.sql and 08_pronari_id.sql
-- DATA SAFETY: adds columns/tables only; backfills existing users as account owners and admins.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'perdorues_role_enum') then
    create type perdorues_role_enum as enum ('admin', 'perdorues');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lokacioni_akses_enum') then
    create type lokacioni_akses_enum as enum ('view', 'add', 'edit_delete');
  end if;
end
$$;

alter table public.perdorues
  add column if not exists account_owner_id uuid references public.perdorues (id);

alter table public.perdorues
  add column if not exists role perdorues_role_enum;

-- Existing users own their account and are admins (preserves current behavior).
update public.perdorues
set account_owner_id = id
where account_owner_id is null;

update public.perdorues
set role = 'admin'
where role is null;

-- Any user who owns tenant data (locations/products/actions) is admin of their own platform.
update public.perdorues p
set
  account_owner_id = p.id,
  role = 'admin'
where exists (select 1 from public.lokacioni l where l.pronari_id = p.id)
   or exists (select 1 from public.produkti pr where pr.pronari_id = p.id)
   or exists (select 1 from public.veprimi v where v.pronari_id = p.id)
   or exists (select 1 from public.veprim_batch b where b.pronari_id = p.id);

-- Account owners (their own platform) are always admin.
update public.perdorues
set role = 'admin'
where account_owner_id = id
  and role is distinct from 'admin';

alter table public.perdorues alter column account_owner_id set not null;
alter table public.perdorues alter column role set not null;
alter table public.perdorues alter column role set default 'perdorues';

create index if not exists perdorues_account_owner_idx on public.perdorues (account_owner_id);
create index if not exists perdorues_role_idx on public.perdorues (role);

create table if not exists public.lokacioni_perdorues_access (
  id uuid primary key default gen_random_uuid(),
  account_owner_id uuid not null references public.perdorues (id) on delete cascade,
  lokacioni_id uuid not null references public.lokacioni (id) on delete cascade,
  perdorues_id uuid not null references public.perdorues (id) on delete cascade,
  akses lokacioni_akses_enum not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lokacioni_id, perdorues_id)
);

create index if not exists lokacioni_perdorues_access_perdorues_idx
  on public.lokacioni_perdorues_access (perdorues_id);

create index if not exists lokacioni_perdorues_access_lokacioni_idx
  on public.lokacioni_perdorues_access (lokacioni_id);

create index if not exists lokacioni_perdorues_access_account_idx
  on public.lokacioni_perdorues_access (account_owner_id);

-- Ensure access rows belong to the same account as the location owner.
create or replace function public.check_lokacioni_perdorues_access_account()
returns trigger
language plpgsql
as $$
declare
  loc_owner uuid;
  user_owner uuid;
begin
  select pronari_id into loc_owner from public.lokacioni where id = new.lokacioni_id;
  select account_owner_id into user_owner from public.perdorues where id = new.perdorues_id;

  if loc_owner is null or user_owner is null then
    raise exception 'Invalid lokacioni or perdorues reference';
  end if;

  if loc_owner <> new.account_owner_id then
    raise exception 'account_owner_id must match lokacioni.pronari_id';
  end if;

  if user_owner <> new.account_owner_id then
    raise exception 'perdorues must belong to the same account_owner_id';
  end if;

  return new;
end;
$$;

drop trigger if exists lokacioni_perdorues_access_account_check on public.lokacioni_perdorues_access;
create trigger lokacioni_perdorues_access_account_check
  before insert or update on public.lokacioni_perdorues_access
  for each row execute function public.check_lokacioni_perdorues_access_account();
