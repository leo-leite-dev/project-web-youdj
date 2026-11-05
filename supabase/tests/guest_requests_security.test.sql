-- Security, active-room validation, ownership, rate limits and persistent quota.
-- Run locally with: supabase test db
begin;
select plan(54);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'guest-test-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'guest-test-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false);

insert into public.dj_profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'DJ Guest A'),
  ('22222222-2222-2222-2222-222222222222', 'DJ Guest B');

insert into public.rooms (dj_id, name, code, status) values
  ('11111111-1111-1111-1111-111111111111', 'Active A', 'GUEST00001', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'Active B', 'GUEST00002', 'active'),
  ('11111111-1111-1111-1111-111111111111', 'Paused A', 'GUEST00003', 'paused');
insert into public.guest_presence (room_id, guest_id, guest_name)
select id, 'aaaaaaaa-1111-4111-8111-111111111111', 'Convidada A'
from public.rooms where code = 'GUEST00001';
insert into public.guest_presence (room_id, guest_id, guest_name)
select id, 'bbbbbbbb-2222-4222-8222-222222222222', 'Convidado B'
from public.rooms where code = 'GUEST00002';

select ok((select relrowsecurity from pg_class where oid = 'public.guest_requests'::regclass), 'RLS enabled on guest requests');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_search_cache'::regclass), 'RLS enabled on cache');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_search_budget'::regclass), 'RLS enabled on legacy reservations');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_search_usage'::regclass), 'RLS enabled on global search usage');
select ok((select relrowsecurity from pg_class where oid = 'public.guest_presence'::regclass), 'RLS enabled on guest presence');
select ok((select relrowsecurity from pg_class where oid = 'public.guest_api_rate_limits'::regclass), 'RLS enabled on rate limits');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'SELECT'), 'anon cannot read requests');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'INSERT'), 'anon cannot insert requests directly');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'UPDATE') and not has_table_privilege('anon', 'public.guest_requests', 'DELETE'), 'anon cannot update or delete requests');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'SELECT'), 'authenticated cannot read administrative requests');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'INSERT'), 'authenticated cannot insert requests directly');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'UPDATE') and not has_table_privilege('authenticated', 'public.guest_requests', 'DELETE'), 'authenticated cannot update or delete requests');
select ok(not has_function_privilege('anon', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.submit_guest_request_with_identity(text,text,jsonb,text,text,text,uuid)', 'EXECUTE') and not has_function_privilege('anon', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.guest_search_gate(text,text,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.youtube_search_cache_store(text,text,jsonb)', 'EXECUTE') and not has_function_privilege('anon', 'public.youtube_search_usage_snapshot(boolean)', 'EXECUTE'), 'anon cannot call any server-only RPC');
select ok(not has_function_privilege('authenticated', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.submit_guest_request_with_identity(text,text,jsonb,text,text,text,uuid)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.guest_search_gate(text,text,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.youtube_search_cache_store(text,text,jsonb)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.youtube_search_usage_snapshot(boolean)', 'EXECUTE'), 'authenticated cannot call any server-only RPC');
select ok(has_function_privilege('service_role', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE') and has_function_privilege('service_role', 'public.submit_guest_request_with_identity(text,text,jsonb,text,text,text,uuid)', 'EXECUTE') and has_function_privilege('service_role', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE'), 'backend can call the identity-aware write and presence RPCs');
select ok(has_function_privilege('service_role', 'public.guest_search_gate(text,text,text)', 'EXECUTE'), 'backend can call the quota gate');
select ok(has_function_privilege('service_role', 'public.youtube_search_usage_snapshot(boolean)', 'EXECUTE'), 'backend alone can read and record global usage');
select is(public.submit_guest_request('GUEST00001', 'legacy-request-ip', '{"kind":"manual","title":"Song","artist":"Artist","url":""}'::jsonb, repeat('a', 64), '2026-11-04', '2026-11-04')->>'error', 'guest_identity_required', 'legacy request RPC cannot create an unidentified request');
select ok(not exists (
  select 1
  from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
  cross join (values
    ('public.guest_api_rate_limits'), ('public.youtube_search_cache'),
    ('public.youtube_search_budget'), ('public.youtube_search_budget_config'), ('public.youtube_search_usage'), ('public.guest_presence'),
    ('public.guest_requests')
  ) as tables(table_name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(privilege)
  where has_table_privilege(roles.role_name, tables.table_name, privileges.privilege)
), 'API roles have no direct table privileges; writes use only the restricted RPCs');
select is((select daily_search_quota from public.youtube_search_budget_config where singleton), 100, 'configured estimate defaults to 100 search.list calls per Pacific quota day');
select ok(not has_table_privilege('anon', 'public.youtube_search_budget_config', 'SELECT'), 'anon cannot read quota configuration');
select ok(not has_table_privilege('authenticated', 'public.youtube_search_budget_config', 'UPDATE'), 'authenticated cannot change quota configuration');

-- The configured quota is informational only: it cannot block searches. Repeated
-- queries from the same IP also retain no individual search block.
delete from public.youtube_search_usage
  where quota_day = (now() at time zone 'America/Los_Angeles')::date;
update public.youtube_search_budget_config set daily_search_quota = 1 where singleton;
create temporary table same_ip_search_results (result jsonb);
insert into same_ip_search_results
select public.guest_search_gate('GUEST00001', 'same-ip-query-' || attempt, 'same-search-ip')
from generate_series(1, 11) as attempts(attempt);
select ok(
  (select count(*) = 11 from same_ip_search_results where result->>'cached' = 'false')
  and not exists (select 1 from same_ip_search_results where result->>'error' = 'rate_limited'),
  'searches are not blocked by the configured daily quota or an individual IP limit'
);
select is(public.youtube_search_usage_snapshot(false)->>'callsToday', '0', 'reading usage does not add a search call');
select is(public.youtube_search_usage_snapshot(true)->>'callsToday', '1', 'a real upstream call is recorded once');
select is(public.youtube_search_usage_snapshot(true)->>'callsToday', '2', 'concurrent-safe recorder increments the global total');
select is(public.youtube_search_usage_snapshot(false)->>'quotaDay', (now() at time zone 'America/Los_Angeles')::date::text, 'usage is grouped by the Google Pacific quota day');
select is(((public.youtube_search_usage_snapshot(false)->>'nextResetAt')::timestamptz at time zone 'America/Los_Angeles')::date, ((now() at time zone 'America/Los_Angeles')::date + 1), 'next reset is Pacific midnight, including daylight-saving changes');
delete from public.youtube_search_cache where normalized_query like 'same-ip-query-%';

update public.youtube_search_budget_config set daily_search_quota = 100 where singleton;

select is(public.guest_search_gate('GUEST00003', 'paused-room-query', 'paused-search-ip')->>'error', 'room_unavailable', 'search rejects a paused room');
select is(public.youtube_search_usage_snapshot(false)->>'callsToday', '2', 'rejected inactive-room queries do not increase the global call count');

select ok(public.youtube_search_cache_store('GUEST00001', 'verified-query', '[{"videoId":"abcdefghijk","title":"Verified song","channel":"Verified artist","thumbnail":"https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"}]'::jsonb), 'cache store accepts bounded provider results for an active room');
create temporary table video_request_result as
  select public.submit_guest_request_with_identity('GUEST00001', 'video-request-ip', '{"kind":"youtube","videoId":"abcdefghijk"}'::jsonb, repeat('a', 64), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111') as result;
select is((select result->>'received' from video_request_result), 'true', 'selected cached video can be submitted');
select is((select result->>'private_code' from video_request_result), repeat('a', 64), 'private receipt is returned to the trusted caller for one-time delivery');
select ok(exists (select 1 from public.guest_requests r join public.rooms room on room.id = r.room_id where r.video_id = 'abcdefghijk' and r.status = 'pending' and room.code = 'GUEST00001' and r.dj_id = '11111111-1111-1111-1111-111111111111'), 'video request is pending and linked to the room owner from the database');
select is((select guest_name from public.guest_requests where video_id = 'abcdefghijk'), 'Convidada A', 'request name is taken from the guest presence record');
select is((select private_code_hash from public.guest_requests where video_id = 'abcdefghijk'), encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'), 'only the SHA-256 hash of the private receipt code is stored');
select ok(not exists (select 1 from public.guest_requests where to_jsonb(guest_requests) ? 'private_code'), 'raw private receipt code is not stored in the request row');
select is((select terms_version from public.guest_requests where video_id = 'abcdefghijk'), '2026-11-04', 'accepted terms version is associated with the request');
select is((select privacy_version from public.guest_requests where video_id = 'abcdefghijk'), '2026-11-04', 'accepted privacy version is associated with the request');
select ok((select accepted_at is not null from public.guest_requests where video_id = 'abcdefghijk'), 'database records acceptance timestamp only when request is created');

select is(public.submit_guest_request_with_identity('GUEST00002', 'manual-request-ip', '{"kind":"manual","title":"Manual song","artist":"Manual artist","url":"","dj_id":"11111111-1111-1111-1111-111111111111"}'::jsonb, repeat('b', 64), '2026-11-04', '2026-11-04', 'bbbbbbbb-2222-4222-8222-222222222222')->>'received', 'true', 'manual request accepts active room without trusting supplied owner');
select ok(exists (select 1 from public.guest_requests r join public.rooms room on room.id = r.room_id where r.title = 'Manual song' and room.code = 'GUEST00002' and r.dj_id = '22222222-2222-2222-2222-222222222222'), 'manual request is isolated to the actual room owner, not client-supplied dj_id');
select is(public.submit_guest_request_with_identity('GUEST00003', 'paused-request-ip', '{"kind":"manual","title":"Paused song","artist":"Artist","url":""}'::jsonb, repeat('c', 64), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111')->>'error', 'room_unavailable', 'request rejects a paused room');
select is(public.submit_guest_request_with_identity('GUEST00001', 'invalid-request-ip', '{"kind":"manual","title":"Bad link","artist":"Artist","url":"https://youtube.com.evil.example/watch?v=abcdefghijk"}'::jsonb, repeat('d', 64), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111')->>'error', 'invalid_request', 'manual request rejects non-YouTube link hosts');
select is(public.submit_guest_request_with_identity('GUEST00001', 'empty-title-ip', '{"kind":"manual","title":"   ","artist":"Artist","url":""}'::jsonb, repeat('e', 64), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111')->>'error', 'invalid_request', 'manual request rejects blank trimmed titles without database exceptions');

create temporary table spam_results (result jsonb);
insert into spam_results
select public.submit_guest_request_with_identity('GUEST00001', 'spam-test-ip', jsonb_build_object('kind', 'manual', 'title', 'Spam ' || attempt, 'artist', 'Artist', 'url', ''), lpad(to_hex(attempt), 64, '0'), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111')
from generate_series(1, 6) as attempts(attempt);
select ok((select count(*) = 5 from spam_results where result->>'received' = 'true') and (select count(*) = 1 from spam_results where result->>'error' = 'rate_limited'), 'serialized per-IP limiter accepts five requests and blocks the sixth');
select is((select count(*)::integer from public.guest_requests where title like 'Spam %'), 5, 'blocked spam attempt is not persisted');

select ok(not has_function_privilege('anon', 'public.purge_expired_guest_data()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.purge_expired_guest_data()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.purge_expired_guest_data()', 'EXECUTE'),
  'expired-data purge is unavailable to API roles');

select public.submit_guest_request_with_identity('GUEST00001', 'retention-request-ip',
  '{"kind":"manual","title":"Retention fixture","artist":"Artist","url":""}'::jsonb,
  repeat('f', 64), '2026-11-04', '2026-11-04', 'aaaaaaaa-1111-4111-8111-111111111111');
update public.guest_requests set created_at = now() - interval '31 days'
  where private_code_hash = encode(extensions.digest(repeat('f', 64), 'sha256'), 'hex');
insert into public.guest_api_rate_limits(fingerprint, action, occurred_at) values
  ('retention-old', 'request', now() - interval '49 hours'),
  ('retention-recent', 'request', now() - interval '1 hour');
insert into public.youtube_search_cache(normalized_query, videos, expires_at) values
  ('retention-expired', '[]'::jsonb, now() - interval '1 second'),
  ('retention-valid', '[]'::jsonb, now() + interval '1 hour');
insert into public.youtube_search_budget(budget_day, searches) values
  ((now() at time zone 'America/Los_Angeles')::date - 32, 1);
insert into public.youtube_search_usage(quota_day, calls) values
  ((now() at time zone 'America/Los_Angeles')::date - 32, 4);

create temporary table purge_result as select public.purge_expired_guest_data() as result;
select is((select (result->>'guest_requests')::integer from purge_result), 1, 'purge deletes requests older than 30 days');
select is((select (result->>'guest_api_rate_limits')::integer from purge_result), 1, 'purge deletes rate-limit records older than 48 hours');
select is((select (result->>'youtube_search_cache')::integer from purge_result), 1, 'purge physically removes expired cache rows');
select is((select (result->>'youtube_search_budget')::integer from purge_result), 1, 'purge deletes quota counters older than 31 days');
select is((select (result->>'youtube_search_usage')::integer from purge_result), 1, 'purge deletes old aggregate usage counts');
select ok(not exists (select 1 from public.guest_requests where title = 'Retention fixture')
  and exists (select 1 from public.guest_api_rate_limits where fingerprint = 'retention-recent')
  and exists (select 1 from public.youtube_search_cache where normalized_query = 'retention-valid')
  and exists (select 1 from public.youtube_search_usage where quota_day = (now() at time zone 'America/Los_Angeles')::date),
  'purge preserves unexpired records and the active daily quota row');

select * from finish();
rollback;
