-- Optional batch metadata: time of day and free-text description.
-- Stored on veprim_batch (one action batch), NOT on individual veprimi line rows.
-- Run in Supabase SQL editor after 05_veprim_batch.sql.

alter table public.veprim_batch
  add column if not exists ora time without time zone null,
  add column if not exists pershkrimi text null;

comment on column public.veprim_batch.ora is
  'Optional time of day (HH:mm) for the whole action batch.';

comment on column public.veprim_batch.pershkrimi is
  'Optional free-text note for the whole action batch (max 500 chars in app).';
