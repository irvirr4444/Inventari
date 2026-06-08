-- MIGRATION: remove the product description column.
-- Run in Supabase SQL editor for existing databases.

alter table public.produkti
  drop column if exists pershkrimi;
