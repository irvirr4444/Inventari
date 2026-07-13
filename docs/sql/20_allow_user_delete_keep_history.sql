-- Allow hard-deleting users while preserving history rows.
--
-- We store `veprim_batch.created_by_user_id` to support summary grouping by user.
-- If we keep a foreign key to `perdorues(id)`, deleting a user fails (or would require
-- nulling the column, which would mis-attribute history to the account owner).
--
-- This migration drops the FK constraint but keeps the column and index intact.
--
-- Run after 19_veprim_batch_created_by.sql

alter table public.veprim_batch
  drop constraint if exists veprim_batch_created_by_user_id_fkey;

