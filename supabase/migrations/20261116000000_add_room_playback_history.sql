-- Persistent, room-scoped playback history. A request ID (not video ID) is
-- the identity so two guests requesting the same video remain independent.
create table public.room_music_playback_history (
  request_id uuid primary key references public.guest_requests(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  started_at timestamptz not null default now(),
  constraint room_music_playback_history_request_room_unique unique (room_id, request_id)
);

create index room_music_playback_history_room_started_idx
  on public.room_music_playback_history (room_id, started_at desc);
alter table public.room_music_playback_history enable row level security;
revoke all on public.room_music_playback_history from public, anon, authenticated, service_role;

create function public.dj_mark_room_request_played(p_room_id uuid, p_request_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.guest_requests request
    where request.id = p_request_id and request.room_id = p_room_id
      and request.status = 'approved'
  ) then return false; end if;

  insert into public.room_music_playback_history (request_id, room_id)
  values (p_request_id, p_room_id)
  on conflict (request_id) do nothing;
  return true;
end;
$$;

create function public.dj_list_room_played_requests(p_room_id uuid)
returns setof uuid language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query select history.request_id
    from public.room_music_playback_history history
    where history.room_id = p_room_id
    order by history.started_at, history.request_id;
end;
$$;

revoke all on function public.dj_mark_room_request_played(uuid, uuid), public.dj_list_room_played_requests(uuid)
  from public, anon, authenticated;
grant execute on function public.dj_mark_room_request_played(uuid, uuid), public.dj_list_room_played_requests(uuid)
  to authenticated;
