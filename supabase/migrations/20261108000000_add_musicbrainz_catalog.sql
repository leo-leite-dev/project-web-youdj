-- MusicBrainz Core fields only: title, artist credit and MBID (CC0).
-- Guest lookups use this local table; public MusicBrainz API calls are importer-only.

create table public.music_catalog_artists (
  artist_mbid uuid primary key,
  name text not null check (char_length(name) between 1 and 120),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  source_url text not null check (source_url like 'https://musicbrainz.org/artist/%'),
  license text not null default 'CC0-1.0' check (license = 'CC0-1.0')
);

insert into public.music_catalog_artists (artist_mbid, name, country_code, source_url) values
  ('c3cceeed-3332-4cf0-8c4c-bbde425147b6', 'Scorpions', 'DE', 'https://musicbrainz.org/artist/c3cceeed-3332-4cf0-8c4c-bbde425147b6'),
  ('5dcdb5eb-cb72-4e6e-9e63-b7bace604965', 'Bon Jovi', 'US', 'https://musicbrainz.org/artist/5dcdb5eb-cb72-4e6e-9e63-b7bace604965'),
  ('47685be0-926f-4be9-b1ae-e32da47a3b99', 'Legião Urbana', 'BR', 'https://musicbrainz.org/artist/47685be0-926f-4be9-b1ae-e32da47a3b99'),
  ('29b550f2-04a3-4733-b6f5-4e347fac7e11', 'Charlie Brown Jr.', 'BR', 'https://musicbrainz.org/artist/29b550f2-04a3-4733-b6f5-4e347fac7e11'),
  ('25db5fde-2384-4baf-8e3d-d8299b4c99ef', 'Skank', 'BR', 'https://musicbrainz.org/artist/25db5fde-2384-4baf-8e3d-d8299b4c99ef'),
  ('c1a669b9-30f4-4171-a2a9-a15d9461ca04', 'Titãs', 'BR', 'https://musicbrainz.org/artist/c1a669b9-30f4-4171-a2a9-a15d9461ca04'),
  ('19499124-36d4-4ccc-b28d-04dde3d2076f', 'Jorge Ben Jor', 'BR', 'https://musicbrainz.org/artist/19499124-36d4-4ccc-b28d-04dde3d2076f')
on conflict (artist_mbid) do nothing;

create table public.music_catalog_recordings (
  recording_mbid uuid primary key,
  title text not null check (char_length(title) between 1 and 120),
  artist_credit text not null check (char_length(artist_credit) between 1 and 120),
  matched_artist_mbid uuid not null references public.music_catalog_artists(artist_mbid),
  license text not null default 'CC0-1.0' check (license = 'CC0-1.0'),
  imported_at timestamptz not null default now(),
  search_document tsvector generated always as (
    setweight(to_tsvector('simple', title), 'A') ||
    setweight(to_tsvector('simple', artist_credit), 'B')
  ) stored
);

create index music_catalog_recordings_search_idx
  on public.music_catalog_recordings using gin (search_document);
create index music_catalog_recordings_artist_idx
  on public.music_catalog_recordings (matched_artist_mbid, recording_mbid);

create table public.music_catalog_import_state (
  artist_mbid uuid primary key references public.music_catalog_artists(artist_mbid),
  last_offset integer not null default 0 check (last_offset between 0 and 200),
  imported_count integer not null default 0 check (imported_count between 0 and 250),
  last_imported_at timestamptz not null default now()
);

alter table public.music_catalog_artists enable row level security;
alter table public.music_catalog_recordings enable row level security;
alter table public.music_catalog_import_state enable row level security;
revoke all on public.music_catalog_artists, public.music_catalog_recordings,
  public.music_catalog_import_state from public, anon, authenticated, service_role;

-- A hard database cap protects the initial catalog from accidental bulk imports.
create function public.music_catalog_import_batch(
  p_artist_mbid uuid,
  p_records jsonb,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  record_count integer;
  new_count integer;
  catalog_count integer;
begin
  if not exists (
    select 1 from public.music_catalog_artists where artist_mbid = p_artist_mbid
  ) then
    return jsonb_build_object('error', 'artist_not_allowlisted');
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' then
    return jsonb_build_object('error', 'invalid_records');
  end if;
  record_count := jsonb_array_length(p_records);
  if record_count < 1 or record_count > 20 or p_offset is null or p_offset < 0 or p_offset > 200 then
    return jsonb_build_object('error', 'invalid_batch_size');
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_records) as item(value)
    where jsonb_typeof(item.value) is distinct from 'object'
      or coalesce(item.value->>'mbid', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or char_length(coalesce(item.value->>'title', '')) not between 1 and 120
      or char_length(coalesce(item.value->>'artist_credit', '')) not between 1 and 120
  ) then
    return jsonb_build_object('error', 'invalid_record');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('musicbrainz-catalog-import'));
  select count(*) into catalog_count from public.music_catalog_recordings;
  select count(*) into new_count
  from (
    select distinct (item.value->>'mbid')::uuid as recording_mbid
    from jsonb_array_elements(p_records) as item(value)
  ) as incoming
  where not exists (
    select 1 from public.music_catalog_recordings as existing
    where existing.recording_mbid = incoming.recording_mbid
  );
  if catalog_count + new_count > 250 then
    return jsonb_build_object('error', 'catalog_storage_cap_reached', 'limit', 250);
  end if;

  insert into public.music_catalog_recordings (
    recording_mbid, title, artist_credit, matched_artist_mbid, imported_at
  )
  select distinct on ((item.value->>'mbid')::uuid)
    (item.value->>'mbid')::uuid,
    btrim(item.value->>'title'),
    btrim(item.value->>'artist_credit'),
    p_artist_mbid,
    now()
  from jsonb_array_elements(p_records) as item(value)
  order by (item.value->>'mbid')::uuid
  on conflict (recording_mbid) do update set
    title = excluded.title,
    artist_credit = excluded.artist_credit,
    matched_artist_mbid = excluded.matched_artist_mbid,
    imported_at = now();

  insert into public.music_catalog_import_state as current_state (
    artist_mbid, last_offset, imported_count, last_imported_at
  ) values (
    p_artist_mbid, p_offset, record_count, now()
  )
  on conflict (artist_mbid) do update set
    last_offset = greatest(current_state.last_offset, excluded.last_offset),
    imported_count = least(250, current_state.imported_count + excluded.imported_count),
    last_imported_at = now();

  return jsonb_build_object('accepted', record_count, 'catalog_count', catalog_count + new_count);
end;
$$;

revoke all on function public.music_catalog_import_batch(uuid, jsonb, integer)
  from public, anon, authenticated;
grant execute on function public.music_catalog_import_batch(uuid, jsonb, integer)
  to service_role;

-- Catalog search has its own abuse bucket and never reserves YouTube quota.
alter table public.guest_api_rate_limits
  drop constraint if exists guest_api_rate_limits_action_check;
alter table public.guest_api_rate_limits
  add constraint guest_api_rate_limits_action_check
  check (action in ('search', 'request', 'catalog_search'));

create function public.guest_music_catalog_search(
  p_code text,
  p_query text,
  p_ip text,
  p_limit integer default 10,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ip_fingerprint text;
  search_query tsquery;
  results jsonb;
  has_more boolean;
begin
  if p_code is null or upper(btrim(p_code)) !~ '^[A-Z0-9]{10}$'
    or p_query is null or char_length(btrim(p_query)) not between 3 and 80
    or p_limit is null or p_limit not between 1 and 20
    or p_offset is null or p_offset not between 0 and 240 then
    return jsonb_build_object('error', 'invalid_search');
  end if;
  if not exists (
    select 1 from public.rooms
    where code = upper(btrim(p_code)) and status = 'active'
  ) then
    return jsonb_build_object('error', 'room_unavailable');
  end if;

  ip_fingerprint := encode(extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('catalog:' || ip_fingerprint));
  delete from public.guest_api_rate_limits where occurred_at < now() - interval '48 hours';
  insert into public.guest_api_rate_limits (fingerprint, action)
    values (ip_fingerprint, 'catalog_search');
  if (
    select count(*) from public.guest_api_rate_limits as limits
    where limits.fingerprint = ip_fingerprint
      and limits.action = 'catalog_search'
      and limits.occurred_at > now() - interval '1 hour'
  ) > 30 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  search_query := websearch_to_tsquery('simple', btrim(p_query));
  if pg_catalog.numnode(search_query) = 0 then
    return jsonb_build_object('results', '[]'::jsonb, 'has_more', false, 'next_offset', null);
  end if;

  with matches as materialized (
    select recording_mbid, title, artist_credit,
      pg_catalog.ts_rank_cd(search_document, search_query) as rank
    from public.music_catalog_recordings
    where search_document @@ search_query
    order by rank desc, title, recording_mbid
    limit (p_limit + 1) offset p_offset
  ), page as (
    select recording_mbid, title, artist_credit, rank
    from matches
    order by rank desc, title, recording_mbid
    limit p_limit
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'recordingMbid', page.recording_mbid,
      'title', page.title,
      'artist', page.artist_credit
    ) order by page.rank desc, page.title, page.recording_mbid), '[]'::jsonb),
    (select count(*) > p_limit from matches)
  into results, has_more
  from page;

  return jsonb_build_object(
    'results', results,
    'has_more', has_more,
    'next_offset', case when has_more then p_offset + p_limit else null end
  );
end;
$$;

revoke all on function public.guest_music_catalog_search(text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.guest_music_catalog_search(text, text, text, integer, integer)
  to service_role;

-- Preserve existing request rows and explicitly classify their actual origin.
alter table public.guest_requests
  add column request_source text not null default 'manual',
  add column recording_mbid uuid;

update public.guest_requests
set request_source = case
  when request_kind = 'youtube' or submitted_url is not null then 'youtube'
  else 'manual'
end;

alter table public.guest_requests
  drop constraint if exists guest_requests_request_kind_check,
  drop constraint if exists guest_requests_kind_video_check;

alter table public.guest_requests
  add constraint guest_requests_request_kind_check
    check (request_kind in ('youtube', 'manual', 'musicbrainz')),
  add constraint guest_requests_kind_video_check
    check (
      (request_kind = 'youtube' and video_id is not null and recording_mbid is null)
      or (request_kind = 'manual' and video_id is null and recording_mbid is null)
      or (request_kind = 'musicbrainz' and video_id is null and recording_mbid is not null and submitted_url is null)
    ),
  add constraint guest_requests_request_source_check
    check (
      (request_source = 'musicbrainz' and request_kind = 'musicbrainz' and recording_mbid is not null)
      or (request_source = 'youtube' and (
        (request_kind = 'youtube' and video_id is not null)
        or (request_kind = 'manual' and submitted_url is not null)
      ))
      or (request_source = 'manual' and request_kind = 'manual' and submitted_url is null)
    );

create index guest_requests_recording_mbid_idx
  on public.guest_requests (recording_mbid)
  where recording_mbid is not null;

-- Keep old YouTube-video and manual requests compatible while adding catalog IDs and URL references.
drop function public.submit_guest_request(text, text, jsonb, text, text, text);

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
  source_value text;
  recording_value uuid;
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
  insert into public.guest_api_rate_limits(fingerprint, action) values (ip_fingerprint, 'request');
  if (
    select count(*) from public.guest_api_rate_limits as limits
    where limits.fingerprint = ip_fingerprint and limits.action = 'request'
      and limits.occurred_at > now() - interval '10 minutes'
  ) > 5 then
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
    source_value := 'youtube';
  elsif kind_value = 'catalog' then
    if coalesce(p_request->>'recordingMbid', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return jsonb_build_object('error', 'invalid_request');
    end if;
    recording_value := (p_request->>'recordingMbid')::uuid;
    select recording.title, recording.artist_credit
      into title_value, artist_value
    from public.music_catalog_recordings as recording
    where recording.recording_mbid = recording_value;
    if title_value is null or artist_value is null then
      return jsonb_build_object('error', 'recording_not_found');
    end if;
    kind_value := 'musicbrainz';
    source_value := 'musicbrainz';
  elsif kind_value = 'manual' then
    title_value := btrim(p_request->>'title');
    artist_value := btrim(p_request->>'artist');
    url_value := nullif(btrim(p_request->>'url'), '');
    if title_value is null or char_length(title_value) not between 1 and 120
      or artist_value is null or char_length(artist_value) not between 1 and 120 then
      return jsonb_build_object('error', 'invalid_request');
    end if;
    if url_value is not null then
      if char_length(url_value) > 500 or not (
        url_value ~* '^https://youtu[.]be/[A-Za-z0-9_-]{11}([/?#].*)?$'
        or url_value ~* '^https://(www[.]|music[.]|m[.])?youtube[.]com/watch[?]([^#]*&)?v=[A-Za-z0-9_-]{11}([&#].*)?$'
        or url_value ~* '^https://(www[.]|music[.]|m[.])?youtube[.]com/(shorts|embed|live)/[A-Za-z0-9_-]{11}([/?#].*)?$'
      ) then
        return jsonb_build_object('error', 'invalid_request');
      end if;
      source_value := 'youtube';
    else
      source_value := 'manual';
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
    room_id, dj_id, request_kind, request_source, title, artist, video_id,
    submitted_url, recording_mbid, private_code_hash, terms_version,
    privacy_version, accepted_at
  ) values (
    room_row.id, room_row.dj_id, kind_value, source_value, title_value, artist_value,
    video_value, url_value, recording_value, private_hash, p_terms_version,
    p_privacy_version, now()
  );

  return jsonb_build_object('received', true, 'private_code', p_private_code);
end;
$$;

revoke all on function public.submit_guest_request(text, text, jsonb, text, text, text)
  from public, anon, authenticated;
grant execute on function public.submit_guest_request(text, text, jsonb, text, text, text)
  to service_role;

-- Extend the existing owner-scoped listing without changing its decision rules.
drop function public.dj_list_guest_requests();
create function public.dj_list_guest_requests()
returns table (
  id uuid,
  room_name text,
  title text,
  artist text,
  video_id text,
  submitted_url text,
  status text,
  created_at timestamptz,
  request_source text,
  recording_mbid uuid
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
      request.video_id, request.submitted_url, request.status, request.created_at,
      request.request_source, request.recording_mbid
    from public.guest_requests as request
    join public.rooms as room on room.id = request.room_id
    where request.dj_id = auth.uid()
      and request.created_at > now() - interval '30 days'
      and request.status in ('pending', 'approved')
    order by request.created_at desc
    limit 500;
end;
$$;

revoke all on function public.dj_list_guest_requests() from public, anon, authenticated;
grant execute on function public.dj_list_guest_requests() to authenticated;

notify pgrst, 'reload schema';
