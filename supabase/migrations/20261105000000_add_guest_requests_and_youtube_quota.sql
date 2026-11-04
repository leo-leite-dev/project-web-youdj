-- Etapa 4A: requests remain private; guest traffic is mediated by Pages Functions.
create table public.guest_requests (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  dj_id uuid not null references public.dj_profiles(id) on delete cascade,
  request_kind text not null check (request_kind in ('youtube', 'manual')),
  title text not null check (char_length(title) between 1 and 120),
  artist text not null check (char_length(artist) between 1 and 120),
  video_id text check (video_id is null or video_id ~ '^[A-Za-z0-9_-]{11}$'),
  submitted_url text check (submitted_url is null or char_length(submitted_url) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint guest_requests_kind_video_check check
    ((request_kind = 'youtube' and video_id is not null) or (request_kind = 'manual' and video_id is null))
);

create index guest_requests_owner_created_idx on public.guest_requests (dj_id, created_at desc);
create index guest_requests_room_created_idx on public.guest_requests (room_id, created_at desc);
alter table public.guest_requests enable row level security;
revoke all on public.guest_requests from public, anon, authenticated, service_role;
-- RLS is enabled; no direct API grants or policies are intentionally provided.

create table public.guest_api_rate_limits (
  fingerprint text not null,
  action text not null check (action in ('search', 'request')),
  occurred_at timestamptz not null default now()
);
create index guest_api_rate_limits_lookup_idx on public.guest_api_rate_limits (fingerprint, action, occurred_at desc);
create index guest_api_rate_limits_cleanup_idx on public.guest_api_rate_limits (occurred_at);
create table public.youtube_search_cache (
  normalized_query text primary key,
  videos jsonb,
  expires_at timestamptz not null
);
create table public.youtube_search_budget (
  budget_day date primary key,
  searches integer not null default 0 check (searches between 0 and 10)
);
-- Configurable global ceiling. The application can only be tuned downward from
-- 10 searches/day (10% of YouTube's documented default 100 search.list calls/day).
create table public.youtube_search_budget_config (
  singleton boolean primary key default true check (singleton),
  daily_search_limit integer not null default 10 check (daily_search_limit between 0 and 10)
);
insert into public.youtube_search_budget_config (singleton, daily_search_limit) values (true, 10);

revoke all on public.guest_api_rate_limits, public.youtube_search_cache, public.youtube_search_budget,
  public.youtube_search_budget_config from public, anon, authenticated, service_role;
alter table public.guest_api_rate_limits enable row level security;
alter table public.youtube_search_cache enable row level security;
alter table public.youtube_search_budget enable row level security;
alter table public.youtube_search_budget_config enable row level security;

create or replace function public.guest_search_gate(p_code text, p_query text, p_ip text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  cached jsonb;
  ip_fingerprint text;
  used integer;
  daily_limit integer;
  quota_day date := (now() at time zone 'America/Los_Angeles')::date;
begin
  select * into room_row from public.rooms where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_query));
  delete from public.guest_api_rate_limits where occurred_at < now() - interval '1 day';
  delete from public.youtube_search_cache where expires_at <= now();
  ip_fingerprint := encode(extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ip_fingerprint));
  insert into public.guest_api_rate_limits(fingerprint, action) values (ip_fingerprint, 'search');
  if (select count(*) from public.guest_api_rate_limits as limits where limits.fingerprint = ip_fingerprint and limits.action = 'search' and limits.occurred_at > now() - interval '1 hour') > 10 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  select videos into cached from public.youtube_search_cache
    where normalized_query = p_query and expires_at > now();
  if found and cached is null then return jsonb_build_object('pending', true); end if;
  if cached is not null then
    return jsonb_build_object('cached', true, 'videos', cached);
  end if;
  select daily_search_limit into daily_limit
    from public.youtube_search_budget_config where singleton for share;
  if daily_limit is null then return jsonb_build_object('error', 'budget_not_configured'); end if;
  if daily_limit = 0 then return jsonb_build_object('error', 'daily_budget'); end if;

  insert into public.youtube_search_budget as budget(budget_day, searches) values (quota_day, 1)
    on conflict (budget_day) do update set searches = budget.searches + 1
    where budget.searches < daily_limit returning searches into used;
  if used is null then return jsonb_build_object('error', 'daily_budget'); end if;
  insert into public.youtube_search_cache(normalized_query, videos, expires_at)
    values (p_query, null, now() + interval '1 minute')
    on conflict (normalized_query) do update set videos = null, expires_at = excluded.expires_at;
  return jsonb_build_object('cached', false);
end $$;

create or replace function public.youtube_search_cache_store(p_code text, p_query text, p_videos jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_videos) <> 'array' or jsonb_array_length(p_videos) > 5 then return false; end if;
  if not exists (select 1 from public.rooms where code = upper(btrim(p_code)) and status = 'active') then return false; end if;
  insert into public.youtube_search_cache(normalized_query, videos, expires_at)
    values (p_query, p_videos, now() + interval '6 hours')
    on conflict (normalized_query) do update set videos = excluded.videos, expires_at = excluded.expires_at;
  return true;
end $$;

create or replace function public.submit_guest_request(p_code text, p_ip text, p_request jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  room_row public.rooms%rowtype;
  ip_fingerprint text;
  title_value text;
  artist_value text;
  video_value text;
  url_value text;
  kind_value text;
begin
  select * into room_row from public.rooms where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;
  ip_fingerprint := encode(extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ip_fingerprint));
  delete from public.guest_api_rate_limits where occurred_at < now() - interval '1 day';
  insert into public.guest_api_rate_limits(fingerprint, action) values (ip_fingerprint, 'request');
  if (select count(*) from public.guest_api_rate_limits as limits where limits.fingerprint = ip_fingerprint and limits.action = 'request' and limits.occurred_at > now() - interval '10 minutes') > 5 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  kind_value := p_request->>'kind';
  if kind_value = 'youtube' then
    video_value := p_request->>'videoId';
    if video_value !~ '^[A-Za-z0-9_-]{11}$' then return jsonb_build_object('error', 'invalid_request'); end if;
    select item->>'title', item->>'channel' into title_value, artist_value
      from public.youtube_search_cache c, jsonb_array_elements(c.videos) as video(item)
      where item->>'videoId' = video_value and c.expires_at > now() limit 1;
    if title_value is null or artist_value is null then return jsonb_build_object('error', 'video_not_found'); end if;
  elsif kind_value = 'manual' then
    title_value := btrim(p_request->>'title'); artist_value := btrim(p_request->>'artist');
    url_value := nullif(btrim(p_request->>'url'), '');
    if title_value is null or char_length(title_value) not between 1 and 120 or artist_value is null or char_length(artist_value) not between 1 and 120 or (url_value is not null and (char_length(url_value) > 500 or url_value !~* '^https://(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com)(/|$)')) then
      return jsonb_build_object('error', 'invalid_request');
    end if;
  else return jsonb_build_object('error', 'invalid_request'); end if;
  if title_value is null or char_length(title_value) not between 1 and 120
    or artist_value is null or char_length(artist_value) not between 1 and 120 then
    return jsonb_build_object('error', 'invalid_request');
  end if;
  insert into public.guest_requests(room_id, dj_id, request_kind, title, artist, video_id, submitted_url)
    values (room_row.id, room_row.dj_id, kind_value, title_value, artist_value, video_value, url_value);
  return jsonb_build_object('received', true);
end $$;

revoke all on function public.guest_search_gate(text, text, text) from public, anon, authenticated;
revoke all on function public.youtube_search_cache_store(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.submit_guest_request(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.guest_search_gate(text, text, text) to service_role;
grant execute on function public.youtube_search_cache_store(text, text, jsonb) to service_role;
grant execute on function public.submit_guest_request(text, text, jsonb) to service_role;
