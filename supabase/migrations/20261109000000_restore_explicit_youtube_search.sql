-- Use the documented default YouTube search.list allowance (100/day), not the
-- earlier application-imposed 10/day ceiling. Keep the one global reservation
-- gate; do not impose individual search limits by IP or user.
alter table public.youtube_search_budget
  drop constraint if exists youtube_search_budget_searches_check;
alter table public.youtube_search_budget
  add constraint youtube_search_budget_searches_check
  check (searches between 0 and 100);

alter table public.youtube_search_budget_config
  drop constraint if exists youtube_search_budget_config_daily_search_limit_check;
alter table public.youtube_search_budget_config
  add constraint youtube_search_budget_config_daily_search_limit_check
  check (daily_search_limit between 0 and 100);
alter table public.youtube_search_budget_config
  alter column daily_search_limit set default 100;

-- Raise the legacy 10/day ceiling to the documented default. Operators must
-- lower it before enabling search if the project's effective quota is smaller.
update public.youtube_search_budget_config
set daily_search_limit = 100
where singleton and daily_search_limit = 10;

create or replace function public.guest_search_gate(p_code text, p_query text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.rooms%rowtype;
  cached jsonb;
  used integer;
  daily_limit integer;
  quota_day date := (now() at time zone 'America/Los_Angeles')::date;
begin
  if p_code is null or p_query is null or char_length(p_query) not between 1 and 100 then
    return jsonb_build_object('error', 'invalid_search');
  end if;

  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;

  -- p_ip remains in the RPC signature for compatibility and is deliberately unused.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_query));
  delete from public.guest_api_rate_limits
    where occurred_at < now() - interval '48 hours';
  delete from public.youtube_search_cache where expires_at <= now();

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

  insert into public.youtube_search_budget as budget (budget_day, searches)
    values (quota_day, 1)
    on conflict (budget_day) do update set searches = budget.searches + 1
    where budget.searches < daily_limit
    returning searches into used;
  if used is null then return jsonb_build_object('error', 'daily_budget'); end if;

  insert into public.youtube_search_cache (normalized_query, videos, expires_at)
    values (p_query, null, now() + interval '1 minute')
    on conflict (normalized_query) do update
      set videos = null, expires_at = excluded.expires_at;
  return jsonb_build_object('cached', false);
end;
$$;

revoke all on function public.guest_search_gate(text, text, text)
  from public, anon, authenticated;
grant execute on function public.guest_search_gate(text, text, text)
  to service_role;
