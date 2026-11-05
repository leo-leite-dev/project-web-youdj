-- Guest nicknames are unverified display labels, never authentication.
alter table public.guest_requests
  add column guest_id uuid,
  add column guest_name text,
  add constraint guest_requests_guest_identity_check check (
    (guest_id is null and guest_name is null)
    or (guest_id is not null and guest_name is not null
      and char_length(btrim(guest_name)) between 1 and 40)
  );

create index guest_requests_room_guest_created_idx
  on public.guest_requests (room_id, guest_id, created_at desc);

create table public.guest_presence (
  room_id uuid not null references public.rooms(id) on delete cascade,
  guest_id uuid not null,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 40),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, guest_id)
);
create index guest_presence_room_active_idx
  on public.guest_presence (room_id, last_seen_at desc);
create index guest_presence_cleanup_idx on public.guest_presence (last_seen_at);
alter table public.guest_presence enable row level security;
revoke all on public.guest_presence from public, anon, authenticated, service_role;

create or replace function public.register_guest_presence(
  p_code text,
  p_guest_id uuid,
  p_guest_name text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.rooms%rowtype;
  normalized_name text;
  changed integer;
begin
  normalized_name := pg_catalog.regexp_replace(btrim(p_guest_name), '[[:space:]]+', ' ', 'g');
  if p_guest_id is null or normalized_name is null
    or char_length(normalized_name) not between 1 and 40 then
    return false;
  end if;

  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return false; end if;

  insert into public.guest_presence as current_presence
    (room_id, guest_id, guest_name, joined_at, last_seen_at)
  values (room_row.id, p_guest_id, normalized_name, now(), now())
  on conflict (room_id, guest_id) do update
    set guest_name = excluded.guest_name,
        last_seen_at = now()
    where current_presence.last_seen_at < now() - interval '15 seconds'
      or current_presence.guest_name is distinct from excluded.guest_name;
  get diagnostics changed = row_count;

  if changed > 0 then return true; end if;
  -- Duplicate pings within the write cooldown are accepted without another write.
  return exists (
    select 1 from public.guest_presence
    where room_id = room_row.id and guest_id = p_guest_id
      and last_seen_at > now() - interval '90 seconds'
  );
end;
$$;

revoke all on function public.register_guest_presence(text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.register_guest_presence(text, uuid, text)
  to service_role;

create or replace function public.submit_guest_request_with_identity(
  p_code text,
  p_ip text,
  p_request jsonb,
  p_private_code text,
  p_terms_version text,
  p_privacy_version text,
  p_guest_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.rooms%rowtype;
  ip_fingerprint text;
  title_value text;
  artist_value text;
  video_value text;
  url_value text;
  kind_value text;
  private_hash text;
  guest_name_value text;
begin
  if p_private_code is null or p_private_code !~ '^[a-f0-9]{64}$'
    or p_terms_version is null or char_length(p_terms_version) > 40
    or char_length(p_terms_version) = 0
    or p_privacy_version is null or char_length(p_privacy_version) > 40
    or char_length(p_privacy_version) = 0 then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;

  if p_guest_id is not null then
    select presence.guest_name into guest_name_value
      from public.guest_presence as presence
      where presence.room_id = room_row.id and presence.guest_id = p_guest_id
        and presence.last_seen_at > now() - interval '90 seconds';
    if guest_name_value is null then
      return jsonb_build_object('error', 'guest_presence_required');
    end if;
  end if;

  ip_fingerprint := encode(extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ip_fingerprint));
  delete from public.guest_api_rate_limits where occurred_at < now() - interval '48 hours';
  insert into public.guest_api_rate_limits(fingerprint, action)
    values (ip_fingerprint, 'request');
  if (select count(*) from public.guest_api_rate_limits as limits
      where limits.fingerprint = ip_fingerprint and limits.action = 'request'
        and limits.occurred_at > now() - interval '10 minutes') > 5 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  kind_value := p_request->>'kind';
  if kind_value = 'youtube' then
    video_value := p_request->>'videoId';
    if video_value !~ '^[A-Za-z0-9_-]{11}$' then
      return jsonb_build_object('error', 'invalid_request');
    end if;
    select item->>'title', item->>'channel' into title_value, artist_value
      from public.youtube_search_cache as cache,
        jsonb_array_elements(cache.videos) as video(item)
      where item->>'videoId' = video_value and cache.expires_at > now()
      limit 1;
    if title_value is null or artist_value is null then
      return jsonb_build_object('error', 'video_not_found');
    end if;
  elsif kind_value = 'manual' then
    title_value := btrim(p_request->>'title');
    artist_value := btrim(p_request->>'artist');
    url_value := nullif(btrim(p_request->>'url'), '');
    if title_value is null or char_length(title_value) not between 1 and 120
      or artist_value is null or char_length(artist_value) not between 1 and 120
      or (url_value is not null and (char_length(url_value) > 500
        or url_value !~* '^https://(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)(/|$)')) then
      return jsonb_build_object('error', 'invalid_request');
    end if;
  else
    return jsonb_build_object('error', 'invalid_request');
  end if;

  if title_value is null or char_length(title_value) not between 1 and 120
    or artist_value is null or char_length(artist_value) not between 1 and 120 then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  private_hash := encode(extensions.digest(p_private_code, 'sha256'), 'hex');
  insert into public.guest_requests (
    room_id, dj_id, request_kind, title, artist, video_id, submitted_url,
    private_code_hash, terms_version, privacy_version, accepted_at, guest_id, guest_name
  ) values (
    room_row.id, room_row.dj_id, kind_value, title_value, artist_value,
    video_value, url_value, private_hash, p_terms_version, p_privacy_version, now(),
    p_guest_id, guest_name_value
  );

  return jsonb_build_object('received', true, 'private_code', p_private_code);
end;
$$;
revoke all on function public.submit_guest_request_with_identity(text, text, jsonb, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_guest_request_with_identity(text, text, jsonb, text, text, text, uuid)
  to service_role;

-- Preserve the six-argument contract used by the production Pages Function
-- until it is replaced by a deployment that sends guest_id. Legacy requests
-- remain valid but intentionally have no verified nickname association.
create or replace function public.submit_guest_request(
  p_code text,
  p_ip text,
  p_request jsonb,
  p_private_code text,
  p_terms_version text,
  p_privacy_version text
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.submit_guest_request_with_identity(
    p_code, p_ip, p_request, p_private_code,
    p_terms_version, p_privacy_version, null
  );
$$;
revoke all on function public.submit_guest_request(text, text, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_request(text, text, jsonb, text, text, text)
  to service_role;

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
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_room_id is null or not exists (
    select 1 from public.rooms as room
    where room.id = p_room_id and room.dj_id = auth.uid()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select request.id, room.name, request.title, request.artist,
      request.video_id, request.submitted_url,
      coalesce(request.guest_name, 'Convidado sem apelido (pedido antigo)'),
      request.status, request.created_at
    from public.guest_requests as request
    join public.rooms as room on room.id = request.room_id
    where request.room_id = p_room_id and request.dj_id = auth.uid()
      and request.created_at > now() - interval '30 days'
      and request.status in ('pending', 'approved', 'rejected')
    order by request.created_at desc
    limit 500;
end;
$$;

create or replace function public.dj_guest_request_summary()
returns table (pending_count bigint, approved_count bigint, rejected_count bigint)
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
    select count(*) filter (where request.status = 'pending'),
      count(*) filter (where request.status = 'approved'),
      count(*) filter (where request.status = 'rejected')
    from public.guest_requests as request
    where request.dj_id = auth.uid()
      and request.created_at > now() - interval '30 days';
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
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_room_id is null or not exists (
    select 1 from public.rooms as room
    where room.id = p_room_id and room.dj_id = auth.uid()
  ) then
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

revoke all on function public.dj_list_room_guest_requests(uuid)
  from public, anon, authenticated;
revoke all on function public.dj_guest_request_summary()
  from public, anon, authenticated;
revoke all on function public.dj_room_online_guests(uuid)
  from public, anon, authenticated;
grant execute on function public.dj_list_room_guest_requests(uuid) to authenticated;
grant execute on function public.dj_guest_request_summary() to authenticated;
grant execute on function public.dj_room_online_guests(uuid) to authenticated;

-- Preserve existing retention periods and add physical cleanup for presence.
create or replace function public.purge_expired_guest_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed_requests bigint;
  removed_rate_limits bigint;
  removed_cache bigint;
  removed_budgets bigint;
  removed_search_usage bigint;
  removed_guest_presence bigint;
begin
  delete from public.guest_requests
    where created_at < now() - interval '30 days';
  get diagnostics removed_requests = row_count;

  delete from public.guest_api_rate_limits
    where occurred_at < now() - interval '48 hours';
  get diagnostics removed_rate_limits = row_count;

  delete from public.youtube_search_cache where expires_at <= now();
  get diagnostics removed_cache = row_count;

  delete from public.youtube_search_budget
    where budget_day < ((now() at time zone 'America/Los_Angeles')::date - 31);
  get diagnostics removed_budgets = row_count;

  delete from public.youtube_search_usage
    where quota_day < ((now() at time zone 'America/Los_Angeles')::date - 31);
  get diagnostics removed_search_usage = row_count;

  delete from public.guest_presence where last_seen_at < now() - interval '24 hours';
  get diagnostics removed_guest_presence = row_count;

  return jsonb_build_object(
    'guest_requests', removed_requests,
    'guest_api_rate_limits', removed_rate_limits,
    'youtube_search_cache', removed_cache,
    'youtube_search_budget', removed_budgets,
    'youtube_search_usage', removed_search_usage,
    'guest_presence', removed_guest_presence
  );
end;
$$;
revoke all on function public.purge_expired_guest_data()
  from public, anon, authenticated, service_role;
