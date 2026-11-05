-- Role-based access for each room. Membership is private and can only be
-- managed through owner-checked RPCs; guests remain unauthenticated.
create table public.room_moderators (
  room_id uuid not null references public.rooms(id) on delete cascade,
  moderator_id uuid not null references auth.users(id) on delete cascade,
  granted_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (room_id, moderator_id)
);
create index room_moderators_user_room_idx
  on public.room_moderators (moderator_id, room_id);
alter table public.room_moderators enable row level security;
revoke all on public.room_moderators from public, anon, authenticated, service_role;

-- Internal role lookup. It reads only trusted JWT claims and the room-scoped
-- membership table; client input cannot supply an actor ID or role.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
create or replace function private.current_room_role(p_room_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  room_owner_id uuid;
begin
  if current_user_id is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    return null;
  end if;

  select room.dj_id into room_owner_id
  from public.rooms as room
  where room.id = p_room_id;
  if not found then return null; end if;

  if room_owner_id = current_user_id then return 'owner'; end if;
  if exists (
    select 1 from public.room_moderators as moderator
    where moderator.room_id = p_room_id
      and moderator.moderator_id = current_user_id
  ) then
    return 'moderator';
  end if;
  return null;
end;
$$;
revoke all on function private.current_room_role(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.dj_get_room_management_context(p_room_id uuid)
returns table (
  room_id uuid,
  room_name text,
  code text,
  status text,
  dj_name text,
  access_role text,
  surprise_mode boolean,
  show_playlist boolean,
  show_now_playing boolean,
  show_guest_requests boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room_role text := private.current_room_role(p_room_id);
begin
  if room_role is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select room.id, room.name, room.code, room.status,
      coalesce(nullif(btrim(profile.display_name), ''), 'DJ'), room_role,
      room.surprise_mode, room.show_playlist,
      room.show_now_playing, room.show_guest_requests
    from public.rooms as room
    join public.dj_profiles as profile on profile.id = room.dj_id
    where room.id = p_room_id;
end;
$$;

create or replace function public.dj_list_room_moderators(p_room_id uuid)
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.current_room_role(p_room_id) is distinct from 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select moderator.moderator_id, account.email,
      coalesce(profile.display_name, 'DJ'), moderator.created_at
    from public.room_moderators as moderator
    join auth.users as account on account.id = moderator.moderator_id
    left join public.dj_profiles as profile on profile.id = moderator.moderator_id
    where moderator.room_id = p_room_id
    order by moderator.created_at, moderator.moderator_id;
end;
$$;

create or replace function public.dj_invite_room_moderator(
  p_room_id uuid,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  target_id uuid;
  normalized_email text := lower(btrim(p_email));
  inserted_count integer;
begin
  if private.current_room_role(p_room_id) is distinct from 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if normalized_email is null or char_length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select account.id into target_id
  from auth.users as account
  join public.dj_profiles as profile on profile.id = account.id
  where lower(account.email) = normalized_email
    and not coalesce(account.is_anonymous, false)
    and account.email_confirmed_at is not null
  limit 1;
  if target_id is null then
    raise exception 'moderator_account_not_found' using errcode = 'P0002';
  end if;
  if target_id = owner_id then
    raise exception 'owner_cannot_be_moderator' using errcode = '22023';
  end if;

  insert into public.room_moderators (room_id, moderator_id, granted_by)
  values (p_room_id, target_id, owner_id)
  on conflict (room_id, moderator_id) do nothing;
  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

create or replace function public.dj_revoke_room_moderator(
  p_room_id uuid,
  p_moderator_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_count integer;
begin
  if private.current_room_role(p_room_id) is distinct from 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.room_moderators
  where room_id = p_room_id and moderator_id = p_moderator_id;
  get diagnostics removed_count = row_count;
  return removed_count = 1;
end;
$$;

create or replace function public.dj_list_room_guest_requests(p_room_id uuid)
returns table (
  id uuid,
  room_name text,
  title text,
  artist text,
  video_id text,
  submitted_url text,
  guest_name text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select request.id, room.name, request.title, request.artist,
      request.video_id, request.submitted_url,
      coalesce(request.guest_name, 'Convidado sem apelido (pedido antigo)'),
      request.status, request.created_at
    from public.guest_requests as request
    join public.rooms as room on room.id = request.room_id
    where request.room_id = p_room_id
      and request.created_at > now() - interval '30 days'
      and request.status in ('pending', 'approved', 'rejected')
    order by request.created_at desc
    limit 500;
end;
$$;

create or replace function public.dj_room_online_guests(p_room_id uuid)
returns table (online_count bigint, guest_name text, last_seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.current_room_role(p_room_id) is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    with active_guests as (
      select presence.guest_name, presence.last_seen_at
      from public.guest_presence as presence
      where presence.room_id = p_room_id
        and presence.last_seen_at > now() - interval '90 seconds'
      order by presence.last_seen_at desc
      limit 100
    ), active_count as (
      select count(*)::bigint as total
      from public.guest_presence as presence
      where presence.room_id = p_room_id
        and presence.last_seen_at > now() - interval '90 seconds'
    )
    select active_count.total, active_guests.guest_name, active_guests.last_seen_at
    from active_count left join active_guests on true;
end;
$$;

create or replace function public.dj_set_guest_request_status(
  p_request_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if auth.uid() is null
    or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.guest_requests as request
  set status = p_status
  where request.id = p_request_id
    and request.status = 'pending'
    and private.current_room_role(request.room_id) in ('owner', 'moderator');
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

-- Keep room_by_code(text)'s established seven-column response intact for the
-- currently published guest frontend. The newer UI uses this separate RPC for
-- membership context; internal room UUIDs are returned only to members.
create function public.room_by_code_with_membership(p_code text)
returns table (
  code text,
  name text,
  status text,
  surprise_mode boolean,
  show_playlist boolean,
  show_now_playing boolean,
  show_guest_requests boolean,
  dj_name text,
  viewer_role text,
  room_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select room.code, room.name, room.status,
    room.surprise_mode, room.show_playlist,
    room.show_now_playing, room.show_guest_requests,
    coalesce(nullif(btrim(profile.display_name), ''), 'DJ'),
    coalesce(private.current_room_role(room.id),
      case when auth.uid() is not null
        and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true)
        then 'unauthorized' else 'guest' end),
    case when private.current_room_role(room.id) is not null then room.id else null end
  from public.rooms as room
  join public.dj_profiles as profile on profile.id = room.dj_id
  where room.code = upper(btrim(p_code))
  limit 1;
$$;
comment on function public.room_by_code_with_membership(text) is
  'Consulta por código com contexto de membership; expõe nome público do DJ e ID/papel somente ao membro autenticado.';

revoke all on function public.dj_get_room_management_context(uuid)
  from public, anon, authenticated;
revoke all on function public.dj_list_room_moderators(uuid)
  from public, anon, authenticated;
revoke all on function public.dj_invite_room_moderator(uuid, text)
  from public, anon, authenticated;
revoke all on function public.dj_revoke_room_moderator(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.dj_list_room_guest_requests(uuid)
  from public, anon, authenticated;
revoke all on function public.dj_room_online_guests(uuid)
  from public, anon, authenticated;
revoke all on function public.dj_set_guest_request_status(uuid, text)
  from public, anon, authenticated;
revoke all on function public.room_by_code_with_membership(text)
  from public, anon, authenticated;
grant execute on function public.dj_get_room_management_context(uuid) to authenticated;
grant execute on function public.dj_list_room_moderators(uuid) to authenticated;
grant execute on function public.dj_invite_room_moderator(uuid, text) to authenticated;
grant execute on function public.dj_revoke_room_moderator(uuid, uuid) to authenticated;
grant execute on function public.dj_list_room_guest_requests(uuid) to authenticated;
grant execute on function public.dj_room_online_guests(uuid) to authenticated;
grant execute on function public.dj_set_guest_request_status(uuid, text) to authenticated;
grant execute on function public.room_by_code(text) to anon, authenticated;
grant execute on function public.room_by_code_with_membership(text) to anon, authenticated;
