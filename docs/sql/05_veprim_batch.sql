-- Action batch grouping for history UI (Historiku)
-- Run in Supabase SQL editor after 01_tables.sql and 02_stock_trigger.sql.
-- Safe to run standalone: creates shteti_enum / lloji_veprimi_enum if missing.

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

-- Stop early with a clear message if base schema is missing.
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'veprimi'
  ) then
    raise exception
      'public.veprimi does not exist in this database. Run docs/sql/01_tables.sql first, and make sure the Supabase project matches SUPABASE_URL in your .env (ref: dbcglycuswhbzjegmear).';
  end if;
end
$$;

create table if not exists public.veprim_batch (
  id uuid primary key default gen_random_uuid(),
  lloji text not null check (lloji in ('Hyrje', 'Dalje', 'Transfer')),
  data date not null default current_date,
  shteti shteti_enum not null,
  destination_shteti shteti_enum,
  ora time without time zone null,
  pershkrimi text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint veprim_batch_transfer_dest_check
    check (
      lloji <> 'Transfer'
      or (destination_shteti is not null and destination_shteti <> shteti)
    )
);

create index if not exists veprim_batch_data_created_idx
  on public.veprim_batch (data desc, created_at desc);

alter table public.veprimi
  add column if not exists batch_id uuid references public.veprim_batch (id) on delete cascade;

create index if not exists veprimi_batch_id_idx on public.veprimi (batch_id);

-- Apply signed stock delta: Hyrje adds, Dalje subtracts (with guard).
create or replace function public.apply_veprimi_stock_delta(
  p_kodi text,
  p_shteti shteti_enum,
  p_lloji lloji_veprimi_enum,
  p_sasia integer
)
returns void
language plpgsql
as $$
declare
  current_qty integer;
begin
  if p_sasia = 0 then
    return;
  end if;

  select
    case when p_shteti = 'XK' then gjendje_kosove else gjendje_shqiperi end
    into current_qty
  from public.produkti
  where kodi = p_kodi
  for update;

  if not found then
    raise exception 'Produkti not found: %', p_kodi;
  end if;

  if p_lloji = 'Dalje' then
    if p_sasia > 0 and p_sasia > current_qty then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, p_sasia;
    end if;

    update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove - p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi - p_sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = p_kodi;
  else
    update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove + p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi + p_sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = p_kodi;
  end if;
end;
$$;

create or replace function public.apply_veprimi_to_stock()
returns trigger
language plpgsql
as $$
begin
  perform public.apply_veprimi_stock_delta(
    new.kodi_produktit,
    new.shteti,
    new.lloji,
    new.sasia
  );
  return new;
end;
$$;

create or replace function public.revert_veprimi_from_stock()
returns trigger
language plpgsql
as $$
begin
  if old.lloji = 'Hyrje' then
    perform public.apply_veprimi_stock_delta(
      old.kodi_produktit,
      old.shteti,
      'Dalje'::lloji_veprimi_enum,
      old.sasia
    );
  else
    perform public.apply_veprimi_stock_delta(
      old.kodi_produktit,
      old.shteti,
      'Hyrje'::lloji_veprimi_enum,
      old.sasia
    );
  end if;
  return old;
end;
$$;

create or replace function public.update_veprimi_stock()
returns trigger
language plpgsql
as $$
begin
  if old.kodi_produktit is distinct from new.kodi_produktit
     or old.shteti is distinct from new.shteti
     or old.lloji is distinct from new.lloji
     or old.sasia is distinct from new.sasia
     or old.cmimi_njesi is distinct from new.cmimi_njesi then
    if old.lloji = 'Hyrje' then
      perform public.apply_veprimi_stock_delta(old.kodi_produktit, old.shteti, 'Dalje'::lloji_veprimi_enum, old.sasia);
    else
      perform public.apply_veprimi_stock_delta(old.kodi_produktit, old.shteti, 'Hyrje'::lloji_veprimi_enum, old.sasia);
    end if;

    perform public.apply_veprimi_stock_delta(
      new.kodi_produktit,
      new.shteti,
      new.lloji,
      new.sasia
    );
  end if;

  return new;
end;
$$;

drop trigger if exists veprimi_apply_stock_trg on public.veprimi;
drop trigger if exists veprimi_revert_stock_trg on public.veprimi;
drop trigger if exists veprimi_update_stock_trg on public.veprimi;

create trigger veprimi_apply_stock_trg
after insert on public.veprimi
for each row
execute function public.apply_veprimi_to_stock();

create trigger veprimi_revert_stock_trg
after delete on public.veprimi
for each row
execute function public.revert_veprimi_from_stock();

create trigger veprimi_update_stock_trg
after update on public.veprimi
for each row
execute function public.update_veprimi_stock();
