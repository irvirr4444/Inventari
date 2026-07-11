-- Track which user created each action batch (for summary grouping by user).
-- Run after 18_user_roles_location_access.sql

alter table public.veprim_batch
  add column if not exists created_by_user_id uuid references public.perdorues (id);

-- Existing batches were created by the account owner.
update public.veprim_batch
set created_by_user_id = pronari_id
where created_by_user_id is null;

create index if not exists veprim_batch_created_by_user_idx
  on public.veprim_batch (created_by_user_id);
