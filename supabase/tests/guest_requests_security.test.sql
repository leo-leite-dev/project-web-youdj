-- Security, active-room validation, ownership, rate limits and persistent quota.
-- Run locally with: supabase test db
begin;
select plan(49);

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

select ok((select relrowsecurity from pg_class where oid = 'public.guest_requests'::regclass), 'RLS enabled on guest requests');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_search_cache'::regclass), 'RLS enabled on cache');
select ok((select relrowsecurity from pg_class where oid = 'public.youtube_search_budget'::regclass), 'RLS enabled on quota');
select ok((select relrowsecurity from pg_class where oid = 'public.guest_api_rate_limits'::regclass), 'RLS enabled on rate limits');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'SELECT'), 'anon cannot read requests');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'INSERT'), 'anon cannot insert requests directly');
select ok(not has_table_privilege('anon', 'public.guest_requests', 'UPDATE') and not has_table_privilege('anon', 'public.guest_requests', 'DELETE'), 'anon cannot update or delete requests');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'SELECT'), 'authenticated cannot read administrative requests');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'INSERT'), 'authenticated cannot insert requests directly');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'UPDATE') and not has_table_privilege('authenticated', 'public.guest_requests', 'DELETE'), 'authenticated cannot update or delete requests');
select ok(not has_function_privilege('anon', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.guest_search_gate(text,text,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.youtube_search_cache_store(text,text,jsonb)', 'EXECUTE'), 'anon cannot call any server-only RPC');
select ok(not has_function_privilege('authenticated', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.guest_search_gate(text,text,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.youtube_search_cache_store(text,text,jsonb)', 'EXECUTE'), 'authenticated cannot call any server-only RPC');
select ok(has_function_privilege('service_role', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE'), 'backend can call the write RPC');
select ok(has_function_privilege('service_role', 'public.guest_search_gate(text,text,text)', 'EXECUTE'), 'backend can call the quota gate');
select is(public.submit_guest_request('GUEST00001', 'invalid-code-ip', '{"kind":"manual","title":"Song","artist":"Artist","url":""}'::jsonb, 'predictable', '2026-11-04', '2026-11-04')->>'error', 'invalid_request', 'database rejects malformed private receipt codes');
select ok(not exists (
  select 1
  from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
  cross join (values
    ('public.guest_api_rate_limits'), ('public.youtube_search_cache'),
    ('public.youtube_search_budget'), ('public.youtube_search_budget_config'),
    ('public.guest_requests')
  ) as tables(table_name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as privileges(privilege)
  where has_table_privilege(roles.role_name, tables.table_name, privileges.privilege)
), 'API roles have no direct table privileges; writes use only the restricted RPCs');
select is((select daily_search_limit from public.youtube_search_budget_config where singleton), 10, 'default search cap is 10 calls per Pacific quota day');
select ok(not has_table_privilege('anon', 'public.youtube_search_budget_config', 'SELECT'), 'anon cannot read quota configuration');
select ok(not has_table_privilege('authenticated', 'public.youtube_search_budget_config', 'UPDATE'), 'authenticated cannot change quota configuration');

-- An operator can tune the private ceiling down; the global reservation remains DB-atomic.
update public.youtube_search_budget_config set daily_search_limit = 2 where singleton;
create temporary table gate_results (result jsonb);
insert into gate_results
select public.guest_search_gate('GUEST00001', 'quota-query-' || attempt, 'quota-ip-' || attempt)
from generate_series(1, 11) as attempts(attempt);
select is((select count(*)::integer from gate_results where result->>'cached' = 'false'), 2, 'configured daily cap permits exactly two new searches');
select is((select count(*)::integer from gate_results where result->>'error' = 'daily_budget'), 9, 'global budget rejects all searches beyond the configured cap');
select is((select searches from public.youtube_search_budget where budget_day = (now() at time zone 'America/Los_Angeles')::date), 2, 'quota reservations persist against the Pacific reset day');
select ok(exists (select 1 from public.youtube_search_cache where normalized_query like 'quota-query-%' and videos is null and expires_at > now()), 'in-flight search reservation is persisted in the database');
update public.youtube_search_budget_config set daily_search_limit = 0 where singleton;
select is(public.guest_search_gate('GUEST00001', 'disabled-search', 'disabled-search-ip')->>'error', 'daily_budget', 'zero configuration disables all new searches');
select is((select searches from public.youtube_search_budget where budget_day = (now() at time zone 'America/Los_Angeles')::date), 2, 'disabled search does not reserve quota');

select is(public.guest_search_gate('GUEST00003', 'paused-room-query', 'paused-search-ip')->>'error', 'room_unavailable', 'search rejects a paused room');
select is((select searches from public.youtube_search_budget where budget_day = (now() at time zone 'America/Los_Angeles')::date), 2, 'inactive room does not spend quota');

select ok(public.youtube_search_cache_store('GUEST00001', 'verified-query', '[{"videoId":"abcdefghijk","title":"Verified song","channel":"Verified artist","thumbnail":"https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"}]'::jsonb), 'cache store accepts bounded provider results for an active room');
create temporary table video_request_result as
  select public.submit_guest_request('GUEST00001', 'video-request-ip', '{"kind":"youtube","videoId":"abcdefghijk"}'::jsonb, repeat('a', 64), '2026-11-04', '2026-11-04') as result;
select is((select result->>'received' from video_request_result), 'true', 'selected cached video can be submitted');
select is((select result->>'private_code' from video_request_result), repeat('a', 64), 'private receipt is returned to the trusted caller for one-time delivery');
select ok(exists (select 1 from public.guest_requests r join public.rooms room on room.id = r.room_id where r.video_id = 'abcdefghijk' and r.status = 'pending' and room.code = 'GUEST00001' and r.dj_id = '11111111-1111-1111-1111-111111111111'), 'video request is pending and linked to the room owner from the database');
select is((select private_code_hash from public.guest_requests where video_id = 'abcdefghijk'), encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'), 'only the SHA-256 hash of the private receipt code is stored');
select ok(not exists (select 1 from public.guest_requests where to_jsonb(guest_requests) ? 'private_code'), 'raw private receipt code is not stored in the request row');
select is((select terms_version from public.guest_requests where video_id = 'abcdefghijk'), '2026-11-04', 'accepted terms version is associated with the request');
select is((select privacy_version from public.guest_requests where video_id = 'abcdefghijk'), '2026-11-04', 'accepted privacy version is associated with the request');
select ok((select accepted_at is not null from public.guest_requests where video_id = 'abcdefghijk'), 'database records acceptance timestamp only when request is created');

select is(public.submit_guest_request('GUEST00002', 'manual-request-ip', '{"kind":"manual","title":"Manual song","artist":"Manual artist","url":"","dj_id":"11111111-1111-1111-1111-111111111111"}'::jsonb, repeat('b', 64), '2026-11-04', '2026-11-04')->>'received', 'true', 'manual request accepts active room without trusting supplied owner');
select ok(exists (select 1 from public.guest_requests r join public.rooms room on room.id = r.room_id where r.title = 'Manual song' and room.code = 'GUEST00002' and r.dj_id = '22222222-2222-2222-2222-222222222222'), 'manual request is isolated to the actual room owner, not client-supplied dj_id');
select is(public.submit_guest_request('GUEST00003', 'paused-request-ip', '{"kind":"manual","title":"Paused song","artist":"Artist","url":""}'::jsonb, repeat('c', 64), '2026-11-04', '2026-11-04')->>'error', 'room_unavailable', 'request rejects a paused room');
select is(public.submit_guest_request('GUEST00001', 'invalid-request-ip', '{"kind":"manual","title":"Bad link","artist":"Artist","url":"https://youtube.com.evil.example/watch?v=abcdefghijk"}'::jsonb, repeat('d', 64), '2026-11-04', '2026-11-04')->>'error', 'invalid_request', 'manual request rejects non-YouTube link hosts');
select is(public.submit_guest_request('GUEST00001', 'empty-title-ip', '{"kind":"manual","title":"   ","artist":"Artist","url":""}'::jsonb, repeat('e', 64), '2026-11-04', '2026-11-04')->>'error', 'invalid_request', 'manual request rejects blank trimmed titles without database exceptions');

create temporary table spam_results (result jsonb);
insert into spam_results
select public.submit_guest_request('GUEST00001', 'spam-test-ip', jsonb_build_object('kind', 'manual', 'title', 'Spam ' || attempt, 'artist', 'Artist', 'url', ''), lpad(to_hex(attempt), 64, '0'), '2026-11-04', '2026-11-04')
from generate_series(1, 6) as attempts(attempt);
select ok((select count(*) = 5 from spam_results where result->>'received' = 'true') and (select count(*) = 1 from spam_results where result->>'error' = 'rate_limited'), 'serialized per-IP limiter accepts five requests and blocks the sixth');
select is((select count(*)::integer from public.guest_requests where title like 'Spam %'), 5, 'blocked spam attempt is not persisted');

select ok(not has_function_privilege('anon', 'public.purge_expired_guest_data()', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.purge_expired_guest_data()', 'EXECUTE')
  and not has_function_privilege('service_role', 'public.purge_expired_guest_data()', 'EXECUTE'),
  'expired-data purge is unavailable to API roles');

select public.submit_guest_request('GUEST00001', 'retention-request-ip',
  '{"kind":"manual","title":"Retention fixture","artist":"Artist","url":""}'::jsonb,
  repeat('f', 64), '2026-11-04', '2026-11-04');
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

create temporary table purge_result as select public.purge_expired_guest_data() as result;
select is((select (result->>'guest_requests')::integer from purge_result), 1, 'purge deletes requests older than 30 days');
select is((select (result->>'guest_api_rate_limits')::integer from purge_result), 1, 'purge deletes rate-limit records older than 48 hours');
select is((select (result->>'youtube_search_cache')::integer from purge_result), 1, 'purge physically removes expired cache rows');
select is((select (result->>'youtube_search_budget')::integer from purge_result), 1, 'purge deletes quota counters older than 31 days');
select ok(not exists (select 1 from public.guest_requests where title = 'Retention fixture')
  and exists (select 1 from public.guest_api_rate_limits where fingerprint = 'retention-recent')
  and exists (select 1 from public.youtube_search_cache where normalized_query = 'retention-valid')
  and exists (select 1 from public.youtube_search_budget where budget_day = (now() at time zone 'America/Los_Angeles')::date),
  'purge preserves unexpired records and the active daily quota row');

select * from finish();
rollback;
