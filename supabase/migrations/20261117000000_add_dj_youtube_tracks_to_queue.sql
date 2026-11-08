-- Allow DJ-selected YouTube videos to be queue items without manufacturing guest requests.
alter table public.room_music_queue
  alter column request_id drop not null,
  add column source text not null default 'request',
  add column dj_video_id text,
  add column dj_title text,
  add column dj_artist text,
  add constraint room_music_queue_source_metadata_check check (
    (source = 'request' and request_id is not null and dj_video_id is null and dj_title is null and dj_artist is null)
    or
    (source = 'dj' and request_id is null and dj_video_id is not null
      and dj_video_id ~ '^[A-Za-z0-9_-]{11}$'
      and nullif(btrim(dj_title), '') is not null and length(dj_title) <= 200
      and nullif(btrim(dj_artist), '') is not null and length(dj_artist) <= 200)
  );

create unique index room_music_queue_dj_video_unique
  on public.room_music_queue (room_id, dj_video_id) where source = 'dj';

drop function public.dj_list_room_music_queue(uuid);
create function public.dj_list_room_music_queue(p_room_id uuid)
returns table (
  request_id uuid,
  title text,
  artist text,
  video_id text,
  submitted_url text,
  guest_name text,
  "position" bigint,
  added_at timestamptz,
  source text
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select coalesce(request.id, queue.id),
      coalesce(request.title, queue.dj_title),
      coalesce(request.artist, queue.dj_artist),
      coalesce(request.video_id, queue.dj_video_id),
      request.submitted_url,
      case when queue.source = 'dj' then 'DJ' else coalesce(request.guest_name, 'Convidado') end,
      queue."position", queue.added_at, queue.source
    from public.room_music_queue as queue
    left join public.guest_requests as request on request.id = queue.request_id
    where queue.room_id = p_room_id
    order by queue."position";
end;
$$;

create or replace function public.dj_add_youtube_track_to_queue(p_room_id uuid, p_video_id text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  next_position bigint;
  queue_item_id uuid;
  track_title text;
  track_artist text;
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_video_id is null or p_video_id !~ '^[A-Za-z0-9_-]{11}$' then
    raise exception 'invalid_youtube_track' using errcode = '22023';
  end if;

  perform 1 from public.rooms where id = p_room_id for update;
  if not found or private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select queue.id into queue_item_id
    from public.room_music_queue as queue
    where queue.room_id = p_room_id and queue.source = 'dj' and queue.dj_video_id = p_video_id;
  if found then return queue_item_id; end if;

  select item->>'title', item->>'channel' into track_title, track_artist
    from public.youtube_search_cache as cache,
      jsonb_array_elements(coalesce(cache.videos, '[]'::jsonb)) as video(item)
    where cache.expires_at > now()
      and item->>'videoId' = p_video_id
      and nullif(btrim(item->>'title'), '') is not null
      and nullif(btrim(item->>'channel'), '') is not null
    limit 1;
  if track_title is null or track_artist is null
    or length(track_title) > 200 or length(track_artist) > 200 then
    raise exception 'youtube_video_not_in_recent_search' using errcode = '22023';
  end if;

  select coalesce(max(queue."position"), 0) + 1 into next_position
    from public.room_music_queue as queue where queue.room_id = p_room_id;
  insert into public.room_music_queue (room_id, request_id, "position", source, dj_video_id, dj_title, dj_artist)
    values (p_room_id, null, next_position, 'dj', p_video_id, btrim(track_title), btrim(track_artist))
    on conflict (room_id, dj_video_id) where source = 'dj' do nothing
    returning id into queue_item_id;

  if queue_item_id is null then
    select queue.id into queue_item_id
      from public.room_music_queue as queue
      where queue.room_id = p_room_id and queue.source = 'dj' and queue.dj_video_id = p_video_id;
  end if;
  if queue_item_id is null then
    raise exception 'queue_insert_failed' using errcode = 'P0001';
  end if;
  return queue_item_id;
end;
$$;

create or replace function public.dj_reorder_room_music_queue(p_room_id uuid, p_request_ids uuid[])
returns boolean language plpgsql security definer set search_path = '' as $$
declare item_id uuid; item_position bigint := 0; queue_count bigint;
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform 1 from public.rooms where id = p_room_id for update;
  select count(*) into queue_count from public.room_music_queue where room_id = p_room_id;
  if coalesce(array_length(p_request_ids, 1), 0) <> queue_count
    or (select count(distinct value) from unnest(p_request_ids) value) <> queue_count
    or exists (select 1 from public.room_music_queue q where q.room_id = p_room_id and not (coalesce(q.request_id, q.id) = any(p_request_ids)))
    or exists (select 1 from unnest(p_request_ids) value where not exists
      (select 1 from public.room_music_queue q where q.room_id = p_room_id and coalesce(q.request_id, q.id) = value)) then
    raise exception 'invalid_queue_order' using errcode = '22023';
  end if;
  foreach item_id in array p_request_ids loop
    update public.room_music_queue set "position" = -item_position - 1
      where room_id = p_room_id and coalesce(request_id, id) = item_id;
    item_position := item_position + 1;
  end loop;
  update public.room_music_queue set "position" = -"position" - 1 where room_id = p_room_id;
  return true;
end;
$$;

create or replace function public.dj_remove_room_music_queue_item(p_room_id uuid, p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare removed integer;
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  perform 1 from public.rooms where id = p_room_id for update;
  if not found or private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  delete from public.room_music_queue
    where room_id = p_room_id and coalesce(request_id, id) = p_request_id;
  get diagnostics removed = row_count;
  return removed = 1;
end;
$$;

revoke all on function public.dj_list_room_music_queue(uuid), public.dj_add_youtube_track_to_queue(uuid,text),
  public.dj_reorder_room_music_queue(uuid,uuid[]), public.dj_remove_room_music_queue_item(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.dj_list_room_music_queue(uuid), public.dj_add_youtube_track_to_queue(uuid,text),
  public.dj_reorder_room_music_queue(uuid,uuid[]), public.dj_remove_room_music_queue_item(uuid,uuid)
  to authenticated;
