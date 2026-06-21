-- Per-line-item optional note on action/transfer rows
ALTER TABLE public.veprimi ADD COLUMN IF NOT EXISTS shenim TEXT NULL;
