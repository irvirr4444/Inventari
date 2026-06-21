-- Simplify tenant_config for Onboarding V2 (track_price only)
-- Run after 14_tenant_config.sql

begin;

alter table public.tenant_config
  add column if not exists tutorial_seen boolean not null default false;

alter table public.tenant_config
  add column if not exists updated_at timestamptz not null default now();

-- Rename onboarding flag to match V2 spec
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_config'
      and column_name = 'onboarding_completed'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tenant_config'
      and column_name = 'onboarding_complete'
  ) then
    alter table public.tenant_config
      rename column onboarding_completed to onboarding_complete;
  end if;
end $$;

-- Existing users who finished onboarding should not see tutorial again
update public.tenant_config
set tutorial_seen = true
where onboarding_complete = true
  and tutorial_seen = false;

-- Drop unit-tracking columns (V2: price only)
alter table public.tenant_config drop column if exists track_unit;
alter table public.tenant_config drop column if exists unit_mode;
alter table public.tenant_config drop column if exists global_unit;

alter table public.tenant_config enable row level security;

commit;
