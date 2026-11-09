-- Room-scoped guest VIP access. The browser keeps a random bearer credential;
-- only its SHA-256 digest is stored. Nicknames and guest UUIDs are not proofs.
alter table public.guest_presence
  add column credential_hash text,
  add constraint guest_presence_credential_hash_check
    check (credential_hash is null or credential_hash ~ '^[a-f0-9]{64}$');

create table public.room_guest_vips (
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest_id uuid not null,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 40),
  credential_hash text not null check (credential_hash ~ '^[a-f0-9]{64}$'),
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  primary key (room_id, guest_id)
);
alter table public.room_guest_vips enable row level security;
revoke all on public.room_guest_vips from public, anon, authenticated, service_role;

create function public.register_guest_presence(
  p_code text, p_guest_id uuid, p_guest_name text, p_guest_credential text
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  normalized_name text;
  credential_digest text;
begin
  normalized_name := pg_catalog.regexp_replace(btrim(p_guest_name), '[[:space:]]+', ' ', 'g');
  if p_guest_id is null or p_guest_credential is null
    or p_guest_credential !~ '^[a-f0-9]{64}$'
    or normalized_name is null or char_length(normalized_name) not between 1 and 40 then
    return false;
  end if;
  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return false; end if;

  credential_digest := encode(extensions.digest(p_guest_credential, 'sha256'), 'hex');
  insert into public.guest_presence as current_presence
    (room_id, guest_id, guest_name, joined_at, last_seen_at, credential_hash)
  values (room_row.id, p_guest_id, normalized_name, now(), now(), credential_digest)
  on conflict (room_id, guest_id) do update
    set guest_name = excluded.guest_name,
        last_seen_at = now(),
        credential_hash = case
          when current_presence.credential_hash is null
            or current_presence.credential_hash = excluded.credential_hash
            or current_presence.last_seen_at < now() - interval '90 seconds'
            then excluded.credential_hash
          else current_presence.credential_hash
        end
    where current_presence.last_seen_at < now() - interval '15 seconds'
      or current_presence.guest_name is distinct from excluded.guest_name
      or current_presence.credential_hash is distinct from excluded.credential_hash;
  return exists (
    select 1 from public.guest_presence
    where room_id = room_row.id and guest_id = p_guest_id
      and last_seen_at > now() - interval '90 seconds'
  );
end;
$$;
revoke all on function public.register_guest_presence(text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.register_guest_presence(text, uuid, text, text)
  to service_role;

create function public.dj_set_room_guest_vip(
  p_room_id uuid, p_guest_id uuid, p_enabled boolean
)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  digest_value text;
  name_value text;
  changed integer;
begin
  if private.current_room_role(p_room_id) is distinct from 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_guest_id is null or p_enabled is null then
    raise exception 'invalid_guest' using errcode = '22023';
  end if;

  if p_enabled then
    select presence.credential_hash, presence.guest_name into digest_value, name_value
      from public.guest_presence as presence
      where presence.room_id = p_room_id and presence.guest_id = p_guest_id
        and presence.last_seen_at > now() - interval '90 seconds'
      for update;
    if digest_value is null then
      raise exception 'guest_not_online' using errcode = 'P0002';
    end if;
    insert into public.room_guest_vips(room_id, guest_id, guest_name, credential_hash, granted_by)
      values (p_room_id, p_guest_id, name_value, digest_value, auth.uid())
      on conflict (room_id, guest_id) do update
        set guest_name = excluded.guest_name,
            credential_hash = excluded.credential_hash,
            granted_by = excluded.granted_by,
            granted_at = now();
    return true;
  end if;

  delete from public.room_guest_vips
    where room_id = p_room_id and guest_id = p_guest_id;
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;
revoke all on function public.dj_set_room_guest_vip(uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.dj_set_room_guest_vip(uuid, uuid, boolean)
  to authenticated;

create function public.dj_list_room_guest_vips(p_room_id uuid)
returns table (guest_id uuid, guest_name text, granted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.current_room_role(p_room_id) is distinct from 'owner' then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query
    select vip.guest_id, vip.guest_name, vip.granted_at
    from public.room_guest_vips as vip
    where vip.room_id = p_room_id
    order by vip.granted_at, vip.guest_id;
end;
$$;
revoke all on function public.dj_list_room_guest_vips(uuid) from public, anon, authenticated;
grant execute on function public.dj_list_room_guest_vips(uuid) to authenticated;

drop function public.dj_room_online_guests(uuid);
create function public.dj_room_online_guests(p_room_id uuid)
returns table (
  online_count bigint, guest_name text, last_seen_at timestamptz,
  guest_id uuid, is_vip boolean
)
language plpgsql stable security definer set search_path = '' as $$
declare
  room_role text := private.current_room_role(p_room_id);
begin
  if room_role is null then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  return query
    with active_guests as (
      select presence.guest_name, presence.last_seen_at, presence.guest_id,
        (room_role = 'owner'
          and vip.credential_hash = presence.credential_hash) as vip_enabled
      from public.guest_presence as presence
      left join public.room_guest_vips as vip
        on vip.room_id = presence.room_id and vip.guest_id = presence.guest_id
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
    select active_count.total, active_guests.guest_name, active_guests.last_seen_at,
      case when room_role = 'owner' then active_guests.guest_id else null end,
      coalesce(active_guests.vip_enabled, false)
    from active_count left join active_guests on true;
end;
$$;
revoke all on function public.dj_room_online_guests(uuid) from public, anon, authenticated;
grant execute on function public.dj_room_online_guests(uuid) to authenticated;

-- Preserve the established submission contract and abuse limits, then promote
-- only when the active room credential matches the owner-granted digest.
create function public.submit_guest_request_with_identity(
  p_code text, p_ip text, p_request jsonb, p_private_code text,
  p_terms_version text, p_privacy_version text, p_guest_id uuid,
  p_guest_credential text
)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  result jsonb;
  request_row public.guest_requests%rowtype;
  credential_digest text;
  presence_digest text;
  vip_matched boolean := false;
  next_position bigint;
begin
  if p_guest_credential is null or p_guest_credential !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error', 'guest_credential_required');
  end if;
  result := public.submit_guest_request_with_identity(
    p_code, p_ip, p_request, p_private_code, p_terms_version,
    p_privacy_version, p_guest_id
  );
  if coalesce((result ->> 'received')::boolean, false) is not true then
    return result;
  end if;

  credential_digest := encode(extensions.digest(p_guest_credential, 'sha256'), 'hex');
  select * into request_row from public.guest_requests
    where private_code_hash = encode(extensions.digest(p_private_code, 'sha256'), 'hex')
      and guest_id = p_guest_id;
  if found then
    select presence.credential_hash into presence_digest
      from public.guest_presence as presence
      where presence.room_id = request_row.room_id and presence.guest_id = p_guest_id
        and presence.credential_hash = credential_digest
        and presence.last_seen_at > now() - interval '90 seconds'
      for key share;
    if found then
      select true into vip_matched from public.room_guest_vips as vip
        where vip.room_id = request_row.room_id and vip.guest_id = p_guest_id
          and vip.credential_hash = credential_digest
        for key share;
    end if;
  end if;
  if not coalesce(vip_matched, false) then
    return result || jsonb_build_object('auto_approved', false);
  end if;

  perform 1 from public.rooms where id = request_row.room_id for update;
  update public.guest_requests set status = 'approved'
    where id = request_row.id and status = 'pending';
  if not found then
    return result || jsonb_build_object('auto_approved', false);
  end if;
  select coalesce(max(queue."position"), 0) + 1 into next_position
    from public.room_music_queue as queue where queue.room_id = request_row.room_id;
  insert into public.room_music_queue(room_id, request_id, "position")
    values (request_row.room_id, request_row.id, next_position)
    on conflict (request_id) do nothing;
  return result || jsonb_build_object('auto_approved', true);
end;
$$;
revoke all on function public.submit_guest_request_with_identity(
  text, text, jsonb, text, text, text, uuid, text
) from public, anon, authenticated;
grant execute on function public.submit_guest_request_with_identity(
  text, text, jsonb, text, text, text, uuid, text
) to service_role;
