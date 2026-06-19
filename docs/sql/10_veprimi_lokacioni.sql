-- Add location FK columns alongside legacy shteti enum (dual-write period)

alter table public.veprimi
  add column if not exists lokacioni_id uuid references public.lokacioni (id);

alter table public.veprim_batch
  add column if not exists lokacioni_id uuid references public.lokacioni (id);

alter table public.veprim_batch
  add column if not exists destination_lokacioni_id uuid references public.lokacioni (id);

-- Backfill veprimi.lokacioni_id from shteti enum
update public.veprimi v
set lokacioni_id = l.id
from public.lokacioni l
where v.pronari_id = l.pronari_id
  and v.lokacioni_id is null
  and (
    (v.shteti = 'XK' and l.kodi = 'XK')
    or (v.shteti = 'AL' and l.kodi = 'AL')
  );

-- Backfill veprim_batch location columns
update public.veprim_batch b
set lokacioni_id = l.id
from public.lokacioni l
where b.pronari_id = l.pronari_id
  and b.lokacioni_id is null
  and (
    (b.shteti = 'XK' and l.kodi = 'XK')
    or (b.shteti = 'AL' and l.kodi = 'AL')
  );

update public.veprim_batch b
set destination_lokacioni_id = l.id
from public.lokacioni l
where b.pronari_id = l.pronari_id
  and b.destination_shteti is not null
  and b.destination_lokacioni_id is null
  and (
    (b.destination_shteti = 'XK' and l.kodi = 'XK')
    or (b.destination_shteti = 'AL' and l.kodi = 'AL')
  );

create index if not exists veprimi_lokacioni_idx on public.veprimi (lokacioni_id);
create index if not exists veprim_batch_lokacioni_idx on public.veprim_batch (lokacioni_id);
