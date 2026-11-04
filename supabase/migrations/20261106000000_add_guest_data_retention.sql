-- Expurgo físico separado do agendamento para que a lógica possa ser testada
-- independentemente da disponibilidade da extensão pg_cron.
create index if not exists guest_requests_created_at_cleanup_idx
  on public.guest_requests (created_at);
create index if not exists youtube_search_cache_expires_at_cleanup_idx
  on public.youtube_search_cache (expires_at);

-- Keep the existing rate-limit semantics while aligning opportunistic cleanup
-- with the approved 48-hour retention period.
create or replace function public.guest_search_gate(p_code text, p_query text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.rooms%rowtype;
  cached jsonb;
  ip_fingerprint text;
  used integer;
  daily_limit integer;
  quota_day date := (now() at time zone 'America/Los_Angeles')::date;
begin
  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_query));
  delete from public.guest_api_rate_limits
    where occurred_at < now() - interval '48 hours';
  delete from public.youtube_search_cache where expires_at <= now();

  ip_fingerprint := encode(extensions.digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(ip_fingerprint));
  insert into public.guest_api_rate_limits(fingerprint, action)
    values (ip_fingerprint, 'search');
  if (select count(*) from public.guest_api_rate_limits as limits
      where limits.fingerprint = ip_fingerprint and limits.action = 'search'
        and limits.occurred_at > now() - interval '1 hour') > 10 then
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

  insert into public.youtube_search_budget as budget(budget_day, searches)
    values (quota_day, 1)
    on conflict (budget_day) do update set searches = budget.searches + 1
    where budget.searches < daily_limit returning searches into used;
  if used is null then return jsonb_build_object('error', 'daily_budget'); end if;

  insert into public.youtube_search_cache(normalized_query, videos, expires_at)
    values (p_query, null, now() + interval '1 minute')
    on conflict (normalized_query) do update
      set videos = null, expires_at = excluded.expires_at;
  return jsonb_build_object('cached', false);
end;
$$;

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
begin
  delete from public.guest_requests
    where created_at < now() - interval '30 days';
  get diagnostics removed_requests = row_count;

  delete from public.guest_api_rate_limits
    where occurred_at < now() - interval '48 hours';
  get diagnostics removed_rate_limits = row_count;

  delete from public.youtube_search_cache
    where expires_at <= now();
  get diagnostics removed_cache = row_count;

  delete from public.youtube_search_budget
    where budget_day < ((now() at time zone 'America/Los_Angeles')::date - 31);
  get diagnostics removed_budgets = row_count;

  return jsonb_build_object(
    'guest_requests', removed_requests,
    'guest_api_rate_limits', removed_rate_limits,
    'youtube_search_cache', removed_cache,
    'youtube_search_budget', removed_budgets
  );
end;
$$;

revoke all on function public.purge_expired_guest_data() from public, anon, authenticated, service_role;
