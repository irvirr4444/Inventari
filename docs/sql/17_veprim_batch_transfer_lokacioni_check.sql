-- Allow dynamic transfers between different lokacioni (same country OK).
-- Legacy XK <-> AL transfers still use destination_shteti <> shteti.
-- Run in Supabase SQL editor after 10_veprimi_lokacioni.sql.

alter table public.veprim_batch
  drop constraint if exists veprim_batch_transfer_dest_check;

alter table public.veprim_batch
  add constraint veprim_batch_transfer_dest_check
  check (
    lloji <> 'Transfer'
    or (
      destination_lokacioni_id is not null
      and lokacioni_id is not null
      and destination_lokacioni_id <> lokacioni_id
    )
    or (
      destination_shteti is not null
      and destination_shteti <> shteti
    )
  );
