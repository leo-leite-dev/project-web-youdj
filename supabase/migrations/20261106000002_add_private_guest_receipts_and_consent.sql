-- Historical requests remain without a receipt/consent record; do not fabricate
-- values for requests created before these fields existed.
alter table public.guest_requests
  add column private_code_hash text,
  add column terms_version text,
  add column privacy_version text,
  add column accepted_at timestamptz,
  add constraint guest_requests_private_code_hash_check
    check (private_code_hash is null or private_code_hash ~ '^[a-f0-9]{64}$'),
  add constraint guest_requests_consent_fields_check
    check (
      (terms_version is null and privacy_version is null and accepted_at is null)
      or
      (terms_version is not null and privacy_version is not null and accepted_at is not null)
    );

create unique index guest_requests_private_code_hash_unique_idx
  on public.guest_requests (private_code_hash)
  where private_code_hash is not null;

drop function public.submit_guest_request(text, text, jsonb);

create function public.submit_guest_request(
  p_code text,
  p_ip text,
  p_request jsonb,
  p_private_code text,
  p_terms_version text,
  p_privacy_version text
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
begin
  if p_private_code is null or p_private_code !~ '^[a-f0-9]{64}$'
    or p_terms_version is null or char_length(p_terms_version) > 40
    or p_privacy_version is null or char_length(p_privacy_version) > 40 then
    return jsonb_build_object('error', 'invalid_request');
  end if;

  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;

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
      from public.youtube_search_cache c, jsonb_array_elements(c.videos) as video(item)
      where item->>'videoId' = video_value and c.expires_at > now()
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
    private_code_hash, terms_version, privacy_version, accepted_at
  ) values (
    room_row.id, room_row.dj_id, kind_value, title_value, artist_value,
    video_value, url_value, private_hash, p_terms_version, p_privacy_version, now()
  );

  -- The private code is returned once to the trusted server function. Only its
  -- SHA-256 digest is persisted; no client-facing lookup RPC is provided.
  return jsonb_build_object('received', true, 'private_code', p_private_code);
end;
$$;

revoke all on function public.submit_guest_request(text, text, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_request(text, text, jsonb, text, text, text)
  to service_role;
