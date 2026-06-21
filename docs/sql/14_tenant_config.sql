-- Tenant configuration and product unit of measure
-- Run after 13_perdorues_emri_unique.sql

begin;

create table if not exists public.tenant_config (
  id uuid primary key default gen_random_uuid(),
  pronari_id uuid not null unique references public.perdorues (id) on delete cascade,
  track_price boolean not null default true,
  track_unit boolean not null default false,
  unit_mode text not null default 'per_product' check (unit_mode in ('per_product', 'global')),
  global_unit text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tenant_config_pronari_idx on public.tenant_config (pronari_id);

alter table public.produkti add column if not exists njesi_matese text;

-- Backfill existing dynamic users who already completed location onboarding
insert into public.tenant_config (
  pronari_id,
  track_price,
  track_unit,
  unit_mode,
  global_unit,
  onboarding_completed
)
select distinct p.id,
  true,
  false,
  'per_product',
  null,
  true
from public.perdorues p
inner join public.lokacioni l on l.pronari_id = p.id and l.aktiv = true
where p.ui_lloji = 'dynamic'
  and p.is_legacy = false
  and not exists (
    select 1 from public.tenant_config tc where tc.pronari_id = p.id
  );

commit;
