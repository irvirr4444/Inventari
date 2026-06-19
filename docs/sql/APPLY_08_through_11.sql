-- Run this in Supabase SQL Editor if migrations 08–11 were skipped or failed.
-- Requires 07_perdorues_lokacioni.sql to have run first.
--
-- DATA SAFETY: This script does NOT delete, truncate, or drop produkti / veprimi /
-- veprim_batch rows. It only:
--   - ADD columns (pronari_id, lokacioni_id)
--   - UPDATE null owner/location fields on existing rows
--   - DROP and re-create constraints/indexes (metadata only — rows stay)
--   - INSERT into new tables (lokacioni, gjendje) copied from existing stock columns
--   - REPLACE trigger functions (does not re-run on existing rows)
-- The whole script runs in one transaction and ROLLS BACK if row counts drop.

begin;

create temp table _migration_safety_counts as
select
  (select count(*) from public.produkti) as produkti,
  (select count(*) from public.veprimi) as veprimi,
  (select count(*) from public.veprim_batch) as veprim_batch;

-- === 08_pronari_id.sql ===
alter table public.produkti
  add column if not exists pronari_id uuid references public.perdorues (id);

alter table public.veprimi
  add column if not exists pronari_id uuid references public.perdorues (id);

alter table public.veprim_batch
  add column if not exists pronari_id uuid references public.perdorues (id);

update public.produkti
set pronari_id = '00000000-0000-4000-8000-000000000001'::uuid
where pronari_id is null;

update public.veprimi
set pronari_id = '00000000-0000-4000-8000-000000000001'::uuid
where pronari_id is null;

update public.veprim_batch
set pronari_id = '00000000-0000-4000-8000-000000000001'::uuid
where pronari_id is null;

alter table public.produkti alter column pronari_id set not null;
alter table public.veprimi alter column pronari_id set not null;
alter table public.veprim_batch alter column pronari_id set not null;

create index if not exists produkti_pronari_idx on public.produkti (pronari_id);
create index if not exists veprimi_pronari_idx on public.veprimi (pronari_id);
create index if not exists veprim_batch_pronari_idx on public.veprim_batch (pronari_id);

-- Per-tenant product code uniqueness (drop veprimi FK first — it depends on produkti.kodi unique)
alter table public.veprimi drop constraint if exists veprimi_produkti_fk;

alter table public.produkti drop constraint if exists produkti_kodi_key;
alter table public.produkti drop constraint if exists produkti_kodi_unique;
drop index if exists produkti_kodi_key;

create unique index if not exists produkti_pronari_kodi_unique
  on public.produkti (pronari_id, kodi);

-- Abort before re-adding FK if any veprimi row would not match (no rows are deleted)
do $$
begin
  if exists (
    select 1
    from public.veprimi v
    left join public.produkti p
      on p.pronari_id = v.pronari_id
     and p.kodi = v.kodi_produktit
    where p.id is null
  ) then
    raise exception
      'Migration aborted: % veprimi rows have no matching produkti. Existing data was NOT modified.',
      (
        select count(*)
        from public.veprimi v
        left join public.produkti p
          on p.pronari_id = v.pronari_id
         and p.kodi = v.kodi_produktit
        where p.id is null
      );
  end if;
end
$$;

alter table public.veprimi
  add constraint veprimi_produkti_fk
  foreign key (pronari_id, kodi_produktit)
  references public.produkti (pronari_id, kodi)
  on update cascade
  on delete restrict;

-- === 09_gjendje.sql ===
create table if not exists public.gjendje (
  produkti_id uuid not null references public.produkti (id) on delete cascade,
  lokacioni_id uuid not null references public.lokacioni (id) on delete cascade,
  sasia numeric not null default 0 check (sasia >= 0),
  primary key (produkti_id, lokacioni_id)
);

create index if not exists gjendje_lokacioni_idx on public.gjendje (lokacioni_id);

insert into public.lokacioni (id, pronari_id, emri, kodi, flag_emoji, rradhitja, show_in_summary, aktiv)
values
  (
    '00000000-0000-4000-8000-000000000101'::uuid,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Kosova',
    'XK',
    null,
    0,
    true,
    true
  ),
  (
    '00000000-0000-4000-8000-000000000102'::uuid,
    '00000000-0000-4000-8000-000000000001'::uuid,
    'Shqiperia',
    'AL',
    null,
    1,
    true,
    true
  )
on conflict (pronari_id, kodi) do nothing;

insert into public.gjendje (produkti_id, lokacioni_id, sasia)
select
  p.id,
  '00000000-0000-4000-8000-000000000101'::uuid,
  p.gjendje_kosove
from public.produkti p
where p.pronari_id = '00000000-0000-4000-8000-000000000001'::uuid
on conflict (produkti_id, lokacioni_id) do nothing;

insert into public.gjendje (produkti_id, lokacioni_id, sasia)
select
  p.id,
  '00000000-0000-4000-8000-000000000102'::uuid,
  p.gjendje_shqiperi
from public.produkti p
where p.pronari_id = '00000000-0000-4000-8000-000000000001'::uuid
on conflict (produkti_id, lokacioni_id) do nothing;

-- === 10_veprimi_lokacioni.sql ===
alter table public.veprimi
  add column if not exists lokacioni_id uuid references public.lokacioni (id);

alter table public.veprim_batch
  add column if not exists lokacioni_id uuid references public.lokacioni (id);

alter table public.veprim_batch
  add column if not exists destination_lokacioni_id uuid references public.lokacioni (id);

update public.veprimi v
set lokacioni_id = l.id
from public.lokacioni l
where v.pronari_id = l.pronari_id
  and v.lokacioni_id is null
  and (
    (v.shteti = 'XK' and l.kodi = 'XK')
    or (v.shteti = 'AL' and l.kodi = 'AL')
  );

update public.veprim_batch b
set lokacioni_id = l.id
from public.lokacioni l
where b.pronari_id = l.pronari_id
  and b.lokacioni_id is null
  and (
    (b.shteti = 'XK' and l.kodi = 'XK')
    or (b.shteti = 'AL' and l.kodi = 'AL')
  );

update public.veprim_batch b
set destination_lokacioni_id = l.id
from public.lokacioni l
where b.pronari_id = l.pronari_id
  and b.destination_shteti is not null
  and b.destination_lokacioni_id is null
  and (
    (b.destination_shteti = 'XK' and l.kodi = 'XK')
    or (b.destination_shteti = 'AL' and l.kodi = 'AL')
  );

create index if not exists veprimi_lokacioni_idx on public.veprimi (lokacioni_id);
create index if not exists veprim_batch_lokacioni_idx on public.veprim_batch (lokacioni_id);

-- === 11_stock_trigger_gjendje.sql ===
create or replace function public.apply_gjendje_stock_delta(
  p_produkti_id uuid,
  p_lokacioni_id uuid,
  p_lloji lloji_veprimi_enum,
  p_sasia integer
)
returns void
language plpgsql
as $$
declare
  current_qty numeric;
  delta numeric;
begin
  if p_sasia = 0 or p_lokacioni_id is null then
    return;
  end if;

  delta := case when p_lloji = 'Dalje' then -p_sasia else p_sasia end;

  select g.sasia
  into current_qty
  from public.gjendje g
  where g.produkti_id = p_produkti_id
    and g.lokacioni_id = p_lokacioni_id
  for update;

  if not found then
    if p_lloji = 'Dalje' then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=0, Kerkuar=%', p_sasia;
    end if;
    insert into public.gjendje (produkti_id, lokacioni_id, sasia)
    values (p_produkti_id, p_lokacioni_id, p_sasia);
  else
    if p_lloji = 'Dalje' and p_sasia > current_qty then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, p_sasia;
    end if;
    update public.gjendje
    set sasia = sasia + delta
    where produkti_id = p_produkti_id
      and lokacioni_id = p_lokacioni_id;
  end if;
end;
$$;

create or replace function public.apply_veprimi_stock_delta(
  p_kodi text,
  p_pronari_id uuid,
  p_shteti shteti_enum,
  p_lokacioni_id uuid,
  p_lloji lloji_veprimi_enum,
  p_sasia integer
)
returns void
language plpgsql
as $$
declare
  v_produkti_id uuid;
  v_lokacioni_id uuid;
  current_qty integer;
begin
  if p_sasia = 0 then
    return;
  end if;

  select p.id
  into v_produkti_id
  from public.produkti p
  where p.kodi = p_kodi
    and p.pronari_id = p_pronari_id
  for update;

  if not found then
    raise exception 'Produkti not found: %', p_kodi;
  end if;

  v_lokacioni_id := p_lokacioni_id;
  if v_lokacioni_id is null then
    select l.id
    into v_lokacioni_id
    from public.lokacioni l
    where l.pronari_id = p_pronari_id
      and l.kodi = p_shteti::text
    limit 1;
  end if;

  perform public.apply_gjendje_stock_delta(v_produkti_id, v_lokacioni_id, p_lloji, p_sasia);

  if exists (
    select 1 from public.lokacioni l
    where l.id = v_lokacioni_id and l.kodi in ('XK', 'AL')
  ) then
    select
      case when p_shteti = 'XK' then gjendje_kosove else gjendje_shqiperi end
    into current_qty
    from public.produkti
    where id = v_produkti_id;

    if p_lloji = 'Dalje' then
      if p_sasia > 0 and p_sasia > current_qty then
        raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, p_sasia;
      end if;

      update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove - p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi - p_sasia else gjendje_shqiperi end,
        updated_at = now()
      where id = v_produkti_id;
    else
      update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove + p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi + p_sasia else gjendje_shqiperi end,
        updated_at = now()
      where id = v_produkti_id;
    end if;
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
    new.pronari_id,
    new.shteti,
    new.lokacioni_id,
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
      old.pronari_id,
      old.shteti,
      old.lokacioni_id,
      'Dalje'::lloji_veprimi_enum,
      old.sasia
    );
  else
    perform public.apply_veprimi_stock_delta(
      old.kodi_produktit,
      old.pronari_id,
      old.shteti,
      old.lokacioni_id,
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
     or old.lokacioni_id is distinct from new.lokacioni_id
     or old.lloji is distinct from new.lloji
     or old.sasia is distinct from new.sasia
     or old.cmimi_njesi is distinct from new.cmimi_njesi then
    if old.lloji = 'Hyrje' then
      perform public.apply_veprimi_stock_delta(
        old.kodi_produktit, old.pronari_id, old.shteti, old.lokacioni_id,
        'Dalje'::lloji_veprimi_enum, old.sasia
      );
    else
      perform public.apply_veprimi_stock_delta(
        old.kodi_produktit, old.pronari_id, old.shteti, old.lokacioni_id,
        'Hyrje'::lloji_veprimi_enum, old.sasia
      );
    end if;

    perform public.apply_veprimi_stock_delta(
      new.kodi_produktit,
      new.pronari_id,
      new.shteti,
      new.lokacioni_id,
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

-- Fail and roll back entire transaction if any core row was lost
do $$
declare
  before record;
  after_produkti int;
  after_veprimi int;
  after_batch int;
begin
  select * into before from _migration_safety_counts;

  select count(*) into after_produkti from public.produkti;
  select count(*) into after_veprimi from public.veprimi;
  select count(*) into after_batch from public.veprim_batch;

  if after_produkti < before.produkti
     or after_veprimi < before.veprimi
     or after_batch < before.veprim_batch then
    raise exception
      'Migration rolled back: row counts decreased (produkti % -> %, veprimi % -> %, veprim_batch % -> %)',
      before.produkti, after_produkti,
      before.veprimi, after_veprimi,
      before.veprim_batch, after_batch;
  end if;

  raise notice 'Migration OK — row counts unchanged: produkti=%, veprimi=%, veprim_batch=%',
    after_produkti, after_veprimi, after_batch;
end
$$;

commit;
