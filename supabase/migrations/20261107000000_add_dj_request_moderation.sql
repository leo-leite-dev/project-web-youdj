-- Etapa 4B: expose only room-owner-scoped request moderation through RPCs.
create or replace function public.dj_list_guest_requests()
returns table (
  id uuid,
  room_name text,
  title text,
  artist text,
  video_id text,
  submitted_url text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select request.id, room.name, request.title, request.artist,
      request.video_id, request.submitted_url, request.status, request.created_at
    from public.guest_requests as request
    join public.rooms as room on room.id = request.room_id
    where request.dj_id = auth.uid()
      and request.created_at > now() - interval '30 days'
      and request.status in ('pending', 'approved')
    order by request.created_at desc
    limit 500;
end;
$$;

create or replace function public.dj_set_guest_request_status(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.guest_requests
    set status = p_status
    where id = p_request_id
      and dj_id = auth.uid()
      and status = 'pending';
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.dj_list_guest_requests() from public, anon, authenticated;
revoke all on function public.dj_set_guest_request_status(uuid, text) from public, anon, authenticated;
grant execute on function public.dj_list_guest_requests() to authenticated;
grant execute on function public.dj_set_guest_request_status(uuid, text) to authenticated;
