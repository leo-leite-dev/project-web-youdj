-- Etapa 1 da fila: itens são aprovados uma única vez e permanecem separados por sala.
create table public.room_music_queue (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  request_id uuid not null unique references public.guest_requests(id) on delete cascade,
  position bigint not null,
  added_at timestamptz not null default now(),
  unique (room_id, position)
);
create index room_music_queue_room_order_idx on public.room_music_queue(room_id, position);
alter table public.room_music_queue enable row level security;
revoke all on public.room_music_queue from public, anon, authenticated, service_role;

create or replace function public.dj_set_guest_request_status(p_request_id uuid, p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  changed integer;
  target_room uuid;
  next_position bigint;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  select request.room_id into target_room from public.guest_requests request
    where request.id = p_request_id and request.status = 'pending' for update;
  if target_room is null or private.current_room_role(target_room) is null then return false; end if;
  update public.guest_requests set status = p_status where id = p_request_id and status = 'pending';
  get diagnostics changed = row_count;
  if changed = 1 and p_status = 'approved' then
    perform 1 from public.rooms where id = target_room for update;
    select coalesce(max(position), 0) + 1 into next_position
      from public.room_music_queue where room_id = target_room;
    insert into public.room_music_queue(room_id, request_id, position)
      values (target_room, p_request_id, next_position) on conflict (request_id) do nothing;
  end if;
  return changed = 1;
end;
$$;

create function public.dj_list_room_music_queue(p_room_id uuid)
returns table (request_id uuid, title text, artist text, video_id text, submitted_url text, guest_name text, position bigint, added_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_room_role(p_room_id) is null then raise exception 'not_authorized' using errcode = '42501'; end if;
  return query select request.id, request.title, request.artist, request.video_id,
    request.submitted_url, coalesce(request.guest_name, 'Convidado'), queue.position, queue.added_at
    from public.room_music_queue queue join public.guest_requests request on request.id = queue.request_id
    where queue.room_id = p_room_id order by queue.position;
end;
$$;

create function public.dj_reorder_room_music_queue(p_room_id uuid, p_request_ids uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare item_id uuid; item_position bigint := 0; queue_count bigint;
begin
  if private.current_room_role(p_room_id) is null then raise exception 'not_authorized' using errcode = '42501'; end if;
  perform 1 from public.rooms where id = p_room_id for update;
  select count(*) into queue_count from public.room_music_queue where room_id = p_room_id;
  if coalesce(array_length(p_request_ids, 1), 0) <> queue_count
    or (select count(distinct value) from unnest(p_request_ids) value) <> queue_count
    or exists (select 1 from public.room_music_queue q where q.room_id = p_room_id and not (q.request_id = any(p_request_ids)))
    or exists (select 1 from unnest(p_request_ids) value where not exists
      (select 1 from public.room_music_queue q where q.room_id = p_room_id and q.request_id = value)) then
    raise exception 'invalid_queue_order' using errcode = '22023';
  end if;
  foreach item_id in array p_request_ids loop
    update public.room_music_queue set position = -item_position - 1 where room_id = p_room_id and request_id = item_id;
    item_position := item_position + 1;
  end loop;
  update public.room_music_queue set position = -position - 1 where room_id = p_room_id;
  return true;
end;
$$;

create function public.dj_remove_room_music_queue_item(p_room_id uuid, p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if private.current_room_role(p_room_id) is null then raise exception 'not_authorized' using errcode = '42501'; end if;
  delete from public.room_music_queue where room_id = p_room_id and request_id = p_request_id;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

revoke all on function public.dj_set_guest_request_status(uuid,text), public.dj_list_room_music_queue(uuid), public.dj_reorder_room_music_queue(uuid,uuid[]), public.dj_remove_room_music_queue_item(uuid,uuid) from public, anon, authenticated;
grant execute on function public.dj_set_guest_request_status(uuid,text), public.dj_list_room_music_queue(uuid), public.dj_reorder_room_music_queue(uuid,uuid[]), public.dj_remove_room_music_queue_item(uuid,uuid) to authenticated;
