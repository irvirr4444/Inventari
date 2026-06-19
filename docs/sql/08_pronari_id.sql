-- Add owner column to all tenant data tables
-- DATA SAFETY: no DELETE/TRUNCATE/DROP TABLE. Only adds columns, backfills nulls,
-- and swaps constraints/indexes (rows are never removed).

alter table public.produkti
  add column if not exists pronari_id uuid references public.perdorues (id);

alter table public.veprimi
  add column if not exists pronari_id uuid references public.perdorues (id);

alter table public.veprim_batch
  add column if not exists pronari_id uuid references public.perdorues (id);

-- Backfill existing rows to legacy user
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
      'Migration aborted: veprimi rows without matching produkti (no data deleted)';
  end if;
end
$$;

alter table public.veprimi
  add constraint veprimi_produkti_fk
  foreign key (pronari_id, kodi_produktit)
  references public.produkti (pronari_id, kodi)
  on update cascade
  on delete restrict;
