-- Keeps product stock correct when inserting rows into `veprimi`.
-- This makes OUT safe (prevents negative stock) and handles concurrency.

create or replace function public.apply_veprimi_to_stock()
returns trigger
language plpgsql
as $$
declare
  current_qty integer;
begin
  select
    case when new.shteti = 'XK' then gjendje_kosove else gjendje_shqiperi end
    into current_qty
  from public.produkti
  where kodi = new.kodi_produktit
  for update;

  if not found then
    raise exception 'Produkti not found: %', new.kodi_produktit;
  end if;

  if new.lloji = 'Dalje' then
    if new.sasia > current_qty then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, new.sasia;
    end if;

    update public.produkti
      set
        gjendje_kosove = case when new.shteti = 'XK' then gjendje_kosove - new.sasia else gjendje_kosove end,
        gjendje_shqiperi = case when new.shteti = 'AL' then gjendje_shqiperi - new.sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = new.kodi_produktit;
  else
    update public.produkti
      set
        gjendje_kosove = case when new.shteti = 'XK' then gjendje_kosove + new.sasia else gjendje_kosove end,
        gjendje_shqiperi = case when new.shteti = 'AL' then gjendje_shqiperi + new.sasia else gjendje_shqiperi end,
        updated_at = now()
    where kodi = new.kodi_produktit;
  end if;

  return new;
end;
$$;

drop trigger if exists veprimi_apply_stock_trg on public.veprimi;

create trigger veprimi_apply_stock_trg
after insert on public.veprimi
for each row
execute function public.apply_veprimi_to_stock();

