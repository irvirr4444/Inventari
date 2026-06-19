-- Generic stock table (replaces hardcoded gjendje_kosove / gjendje_shqiperi over time)

create table if not exists public.gjendje (
  produkti_id uuid not null references public.produkti (id) on delete cascade,
  lokacioni_id uuid not null references public.lokacioni (id) on delete cascade,
  sasia numeric not null default 0 check (sasia >= 0),
  primary key (produkti_id, lokacioni_id)
);

create index if not exists gjendje_lokacioni_idx on public.gjendje (lokacioni_id);

-- Seed legacy user's two default locations (requires 07 + 08)
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

-- Migrate stock from legacy columns into gjendje rows
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
