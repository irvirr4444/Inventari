-- Scalable grouped summary aggregates for Inventari analytics.
-- Run in Supabase SQL editor (or migration runner) on live DB.

create index if not exists veprimi_pronari_data_idx
  on public.veprimi (pronari_id, data);

create index if not exists veprimi_pronari_lokacioni_data_idx
  on public.veprimi (pronari_id, lokacioni_id, data);

create or replace function public.inventari_summary_agg(
  p_tenant_id uuid,
  p_from date,
  p_to date,
  p_group_by text
)
returns table (
  group_id text,
  in_qty numeric,
  in_value numeric,
  out_qty numeric,
  out_value numeric
)
language sql
stable
as $$
  with scoped as (
    select
      v.lloji,
      v.sasia,
      v.totali,
      v.lokacioni_id,
      v.kodi_produktit,
      coalesce(b.created_by_user_id, v.pronari_id) as created_by_user_id
    from public.veprimi v
    left join public.veprim_batch b on b.id = v.batch_id
    where v.pronari_id = p_tenant_id
      and (p_from is null or v.data >= p_from)
      and (p_to is null or v.data <= p_to)
      and v.lloji in ('Hyrje', 'Dalje')
  )
  select
    case
      when p_group_by = 'location' then s.lokacioni_id::text
      when p_group_by = 'product' then s.kodi_produktit
      when p_group_by = 'user' then s.created_by_user_id::text
      else null
    end as group_id,
    coalesce(sum(case when s.lloji = 'Hyrje' then s.sasia else 0 end), 0) as in_qty,
    coalesce(sum(case when s.lloji = 'Hyrje' then s.totali else 0 end), 0) as in_value,
    coalesce(sum(case when s.lloji = 'Dalje' then s.sasia else 0 end), 0) as out_qty,
    coalesce(sum(case when s.lloji = 'Dalje' then s.totali else 0 end), 0) as out_value
  from scoped s
  where
    case
      when p_group_by = 'location' then s.lokacioni_id is not null
      when p_group_by = 'product' then s.kodi_produktit is not null
      when p_group_by = 'user' then s.created_by_user_id is not null
      else false
    end
  group by 1;
$$;

grant execute on function public.inventari_summary_agg(uuid, date, date, text) to service_role;
