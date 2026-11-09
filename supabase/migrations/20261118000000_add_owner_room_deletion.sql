-- Permanent room deletion is owner-only and cascades only through room-owned rows.
create function public.dj_delete_room(p_room_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.rooms as room
    where room.id = p_room_id and room.dj_id = auth.uid();
  if not found then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return true;
end;
$$;

revoke all on function public.dj_delete_room(uuid) from public, anon, authenticated, service_role;
grant execute on function public.dj_delete_room(uuid) to authenticated;
