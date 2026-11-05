-- The Google API is authoritative for quota enforcement. Keep the configured
-- quota only as the denominator shown in the public usage estimate.
alter table public.youtube_search_budget_config
  rename column daily_search_limit to daily_search_quota;
alter table public.youtube_search_budget_config
  drop constraint if exists youtube_search_budget_config_daily_search_limit_check;
alter table public.youtube_search_budget_config
  add constraint youtube_search_budget_config_daily_search_quota_check
  check (daily_search_quota between 0 and 2147483647);
alter table public.youtube_search_budget_config
  alter column daily_search_quota set default 100;

create table public.youtube_search_usage (
  quota_day date primary key,
  calls bigint not null default 0 check (calls >= 0)
);
alter table public.youtube_search_usage enable row level security;
revoke all on public.youtube_search_usage from public, anon, authenticated, service_role;

-- Carry forward today's old reservations as an estimate. The previous gate
-- reserved before the upstream request, so this historical value is not exact.
insert into public.youtube_search_usage (quota_day, calls)
select budget.budget_day, budget.searches::bigint
from public.youtube_search_budget as budget
where budget.budget_day = (now() at time zone 'America/Los_Angeles')::date
on conflict (quota_day) do nothing;

create or replace function public.guest_search_gate(p_code text, p_query text, p_ip text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  room_row public.rooms%rowtype;
  cached jsonb;
begin
  if p_code is null or p_query is null or char_length(p_query) not between 3 and 100 then
    return jsonb_build_object('error', 'invalid_search');
  end if;

  select * into room_row from public.rooms
    where code = upper(btrim(p_code)) and status = 'active';
  if not found then return jsonb_build_object('error', 'room_unavailable'); end if;

  -- p_ip remains in the signature for compatibility and is deliberately unused.
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

create or replace function public.youtube_search_usage_snapshot(p_record_call boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_quota_day date := (now() at time zone 'America/Los_Angeles')::date;
  configured_quota integer;
  current_calls bigint;
  next_reset_at timestamptz;
begin
  select daily_search_quota into configured_quota
    from public.youtube_search_budget_config where singleton;
  if configured_quota is null then
    return jsonb_build_object('error', 'quota_not_configured');
  end if;

  if p_record_call then
    insert into public.youtube_search_usage as current_usage (quota_day, calls)
      values (current_quota_day, 1)
      on conflict (quota_day) do update set calls = current_usage.calls + 1
      returning calls into current_calls;
  else
    select calls into current_calls from public.youtube_search_usage
      where quota_day = current_quota_day;
    current_calls := coalesce(current_calls, 0);
  end if;

  next_reset_at := ((current_quota_day + 1)::timestamp at time zone 'America/Los_Angeles');
  return jsonb_build_object(
    'callsToday', current_calls,
    'dailyQuota', configured_quota,
    'quotaDay', current_quota_day,
    'nextResetAt', next_reset_at
  );
end;
$$;

revoke all on function public.youtube_search_usage_snapshot(boolean)
  from public, anon, authenticated;
grant execute on function public.youtube_search_usage_snapshot(boolean)
  to service_role;

-- Keep existing retention behavior and expire the new aggregate after 31 days.
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

  delete from public.youtube_search_usage
    where quota_day < ((now() at time zone 'America/Los_Angeles')::date - 31);
  get diagnostics removed_search_usage = row_count;

  return jsonb_build_object(
    'guest_requests', removed_requests,
    'guest_api_rate_limits', removed_rate_limits,
    'youtube_search_cache', removed_cache,
    'youtube_search_budget', removed_budgets,
    'youtube_search_usage', removed_search_usage
  );
end;
$$;

revoke all on function public.purge_expired_guest_data()
  from public, anon, authenticated, service_role;
