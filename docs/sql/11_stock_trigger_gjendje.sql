-- Stock triggers: dual-write to gjendje table AND legacy produkti columns during migration

create or replace function public.apply_gjendje_stock_delta(
  p_produkti_id uuid,
  p_lokacioni_id uuid,
  p_lloji lloji_veprimi_enum,
  p_sasia integer
)
returns void
language plpgsql
as $$
declare
  current_qty numeric;
  delta numeric;
begin
  if p_sasia = 0 or p_lokacioni_id is null then
    return;
  end if;

  delta := case when p_lloji = 'Dalje' then -p_sasia else p_sasia end;

  select g.sasia
  into current_qty
  from public.gjendje g
  where g.produkti_id = p_produkti_id
    and g.lokacioni_id = p_lokacioni_id
  for update;

  if not found then
    if p_lloji = 'Dalje' then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=0, Kerkuar=%', p_sasia;
    end if;
    insert into public.gjendje (produkti_id, lokacioni_id, sasia)
    values (p_produkti_id, p_lokacioni_id, p_sasia);
  else
    if p_lloji = 'Dalje' and p_sasia > current_qty then
      raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, p_sasia;
    end if;
    update public.gjendje
    set sasia = sasia + delta
    where produkti_id = p_produkti_id
      and lokacioni_id = p_lokacioni_id;
  end if;
end;
$$;

create or replace function public.apply_veprimi_stock_delta(
  p_kodi text,
  p_pronari_id uuid,
  p_shteti shteti_enum,
  p_lokacioni_id uuid,
  p_lloji lloji_veprimi_enum,
  p_sasia integer
)
returns void
language plpgsql
as $$
declare
  v_produkti_id uuid;
  v_lokacioni_id uuid;
  current_qty integer;
begin
  if p_sasia = 0 then
    return;
  end if;

  select p.id
  into v_produkti_id
  from public.produkti p
  where p.kodi = p_kodi
    and p.pronari_id = p_pronari_id
  for update;

  if not found then
    raise exception 'Produkti not found: %', p_kodi;
  end if;

  v_lokacioni_id := p_lokacioni_id;
  if v_lokacioni_id is null then
    select l.id
    into v_lokacioni_id
    from public.lokacioni l
    where l.pronari_id = p_pronari_id
      and l.kodi = p_shteti::text
    limit 1;
  end if;

  -- Update gjendje table (source of truth for multi-location)
  perform public.apply_gjendje_stock_delta(v_produkti_id, v_lokacioni_id, p_lloji, p_sasia);

  -- Dual-write legacy columns only for Kosovo/Albania location codes
  if exists (
    select 1 from public.lokacioni l
    where l.id = v_lokacioni_id and l.kodi in ('XK', 'AL')
  ) then
    select
      case when p_shteti = 'XK' then gjendje_kosove else gjendje_shqiperi end
    into current_qty
    from public.produkti
    where id = v_produkti_id;

    if p_lloji = 'Dalje' then
      if p_sasia > 0 and p_sasia > current_qty then
        raise exception 'Nuk ka gjendje te mjaftueshme. Gjendje=%, Kerkuar=%', current_qty, p_sasia;
      end if;

      update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove - p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi - p_sasia else gjendje_shqiperi end,
        updated_at = now()
      where id = v_produkti_id;
    else
      update public.produkti
      set
        gjendje_kosove = case when p_shteti = 'XK' then gjendje_kosove + p_sasia else gjendje_kosove end,
        gjendje_shqiperi = case when p_shteti = 'AL' then gjendje_shqiperi + p_sasia else gjendje_shqiperi end,
        updated_at = now()
      where id = v_produkti_id;
    end if;
  end if;
end;
$$;

create or replace function public.apply_veprimi_to_stock()
returns trigger
language plpgsql
as $$
begin
  perform public.apply_veprimi_stock_delta(
    new.kodi_produktit,
    new.pronari_id,
    new.shteti,
    new.lokacioni_id,
    new.lloji,
    new.sasia
  );
  return new;
end;
$$;

create or replace function public.revert_veprimi_from_stock()
returns trigger
language plpgsql
as $$
begin
  if old.lloji = 'Hyrje' then
    perform public.apply_veprimi_stock_delta(
      old.kodi_produktit,
      old.pronari_id,
      old.shteti,
      old.lokacioni_id,
      'Dalje'::lloji_veprimi_enum,
      old.sasia
    );
  else
    perform public.apply_veprimi_stock_delta(
      old.kodi_produktit,
      old.pronari_id,
      old.shteti,
      old.lokacioni_id,
      'Hyrje'::lloji_veprimi_enum,
      old.sasia
    );
  end if;
  return old;
end;
$$;

create or replace function public.update_veprimi_stock()
returns trigger
language plpgsql
as $$
begin
  if old.kodi_produktit is distinct from new.kodi_produktit
     or old.shteti is distinct from new.shteti
     or old.lokacioni_id is distinct from new.lokacioni_id
     or old.lloji is distinct from new.lloji
     or old.sasia is distinct from new.sasia
     or old.cmimi_njesi is distinct from new.cmimi_njesi then
    if old.lloji = 'Hyrje' then
      perform public.apply_veprimi_stock_delta(
        old.kodi_produktit, old.pronari_id, old.shteti, old.lokacioni_id,
        'Dalje'::lloji_veprimi_enum, old.sasia
      );
    else
      perform public.apply_veprimi_stock_delta(
        old.kodi_produktit, old.pronari_id, old.shteti, old.lokacioni_id,
        'Hyrje'::lloji_veprimi_enum, old.sasia
      );
    end if;

    perform public.apply_veprimi_stock_delta(
      new.kodi_produktit,
      new.pronari_id,
      new.shteti,
      new.lokacioni_id,
      new.lloji,
      new.sasia
    );
  end if;

  return new;
end;
$$;

drop trigger if exists veprimi_apply_stock_trg on public.veprimi;
drop trigger if exists veprimi_revert_stock_trg on public.veprimi;
drop trigger if exists veprimi_update_stock_trg on public.veprimi;

create trigger veprimi_apply_stock_trg
after insert on public.veprimi
for each row
execute function public.apply_veprimi_to_stock();

create trigger veprimi_revert_stock_trg
after delete on public.veprimi
for each row
execute function public.revert_veprimi_from_stock();

create trigger veprimi_update_stock_trg
after update on public.veprimi
for each row
execute function public.update_veprimi_stock();
