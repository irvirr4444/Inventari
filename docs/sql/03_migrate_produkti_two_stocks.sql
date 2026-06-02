-- MIGRATION: move from per-country products to a single product row with 2 stock columns.
--
-- Old design:
--   produkti(kodi, emri, pershkrimi, gjendje, shteti, ...)
--   veprimi(..., shteti, kodi_produktit, ...) FK (kodi_produktit, shteti) -> produkti(kodi, shteti)
--
-- New design:
--   produkti(kodi, emri, pershkrimi, gjendje_kosove, gjendje_shqiperi, ...)
--   veprimi(..., shteti, kodi_produktit, ...) FK kodi_produktit -> produkti(kodi)
--
-- IMPORTANT:
-- - This merges old rows by `kodi`. If your `emri/pershkrimi` differ per country, we keep one value (MAX()).
-- - Run this in Supabase SQL editor.

begin;

create extension if not exists pgcrypto;

-- 1) New products table
create table if not exists public.produkti_new (
  id uuid primary key default gen_random_uuid(),
  kodi text not null unique,
  emri text not null,
  pershkrimi text,
  gjendje_kosove integer not null default 0 check (gjendje_kosove >= 0),
  gjendje_shqiperi integer not null default 0 check (gjendje_shqiperi >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Copy + merge old data
insert into public.produkti_new (kodi, emri, pershkrimi, gjendje_kosove, gjendje_shqiperi, created_at, updated_at)
select
  kodi,
  max(emri) as emri,
  max(pershkrimi) as pershkrimi,
  coalesce(sum(case when shteti = 'XK' then gjendje else 0 end), 0) as gjendje_kosove,
  coalesce(sum(case when shteti = 'AL' then gjendje else 0 end), 0) as gjendje_shqiperi,
  now(),
  now()
from public.produkti
group by kodi
on conflict (kodi) do nothing;

-- 3) Update veprimi FK to point to (kodi) only
alter table public.veprimi drop constraint if exists veprimi_produkti_fk;

-- 4) Drop stock trigger/function (we'll recreate after swap)
drop trigger if exists veprimi_apply_stock_trg on public.veprimi;
drop function if exists public.apply_veprimi_to_stock();

-- 5) Swap tables
drop table public.produkti;
alter table public.produkti_new rename to produkti;

-- 6) Re-add FK and stock trigger/function referencing the FINAL table name (`produkti`)
alter table public.veprimi
  add constraint veprimi_produkti_fk
  foreign key (kodi_produktit)
  references public.produkti (kodi)
  on update cascade
  on delete restrict;

create or replace function public.apply_veprimi_to_stock()
returns trigger
language plpgsql
as $$
declare
  current_qty integer;
begin
  select
    case when new.shteti = 'XK' then gjendje_kosove else gjendje_shqiperi end
    into current_qty
  from public.produkti
  where kodi = new.kodi_produktit
  for update;

  if not found then
    raise exception 'Produkti not found: %', new.kodi_produktit;
  end if;

  if new.lloji = 'Dalje' then
    if new.sasia > current_qty then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, new.sasia;
    end if;

    update public.produkti
      set
        gjendje_kosove = case when new.shteti = 'XK' then gjendje_kosove - new.sasia else gjendje_kosove end,
        gjendje_shqiperi = case when new.shteti = 'AL' then gjendje_shqiperi - new.sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = new.kodi_produktit;
  else
    update public.produkti
      set
        gjendje_kosove = case when new.shteti = 'XK' then gjendje_kosove + new.sasia else gjendje_kosove end,
        gjendje_shqiperi = case when new.shteti = 'AL' then gjendje_shqiperi + new.sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = new.kodi_produktit;
  end if;

  return new;
end;
$$;

create trigger veprimi_apply_stock_trg
after insert on public.veprimi
for each row
execute function public.apply_veprimi_to_stock();

commit;

