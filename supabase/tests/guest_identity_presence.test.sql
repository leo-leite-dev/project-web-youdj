-- Anonymous guest nicknames and heartbeat; DJ reads stay owner-scoped.
-- Run locally with: supabase test db
begin;
select plan(26);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '51111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'identity-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '52222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'identity-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false);
insert into public.dj_profiles (id, display_name) values
  ('51111111-1111-1111-1111-111111111111', 'Identity DJ A'),
  ('52222222-2222-2222-2222-222222222222', 'Identity DJ B');
insert into public.rooms (id, dj_id, name, code, status) values
  ('61111111-1111-4111-8111-111111111111', '51111111-1111-1111-1111-111111111111', 'Identity Room A', 'IDENA00001', 'active'),
  ('62222222-2222-4222-8222-222222222222', '52222222-2222-2222-2222-222222222222', 'Identity Room B', 'IDENB00001', 'active'),
  ('63333333-3333-4333-8333-333333333333', '51111111-1111-1111-1111-111111111111', 'Identity Paused', 'IDENP00001', 'paused');

select ok((select relrowsecurity from pg_class where oid = 'public.guest_presence'::regclass), 'guest presence has RLS enabled');
select ok(not has_table_privilege('anon', 'public.guest_presence', 'SELECT')
  and not has_table_privilege('authenticated', 'public.guest_presence', 'SELECT')
  and not has_table_privilege('service_role', 'public.guest_presence', 'SELECT'), 'no API role can read the presence table directly');
select ok(has_function_privilege('service_role', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE'), 'trusted server can register heartbeats');
select ok(not has_function_privilege('anon', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'public.register_guest_presence(text,uuid,text)', 'EXECUTE'), 'guests cannot call the presence RPC directly');
select ok(has_function_privilege('authenticated', 'public.dj_room_online_guests(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_list_room_guest_requests(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_guest_request_summary()', 'EXECUTE'), 'authenticated DJs can use owner-checked room-management RPCs');
select ok(not has_function_privilege('anon', 'public.dj_room_online_guests(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_list_room_guest_requests(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_guest_request_summary()', 'EXECUTE'), 'anonymous guests cannot call DJ room-management RPCs');

select is(public.register_guest_presence('IDENA00001', 'a1111111-1111-4111-8111-111111111111', '  Ana   Lima  '), true, 'active room accepts a guest nickname heartbeat');
select is(public.register_guest_presence('IDENA00001', 'a1111111-1111-4111-8111-111111111111', 'Ana Lima'), true, 'rapid duplicate heartbeat is accepted without duplicate presence');
select is((select count(*)::integer from public.guest_presence where guest_id = 'a1111111-1111-4111-8111-111111111111'), 1, 'one browser identity has one presence row per room');
select is((select guest_name from public.guest_presence where room_id = (select id from public.rooms where code = 'IDENA00001')), 'Ana Lima', 'presence stores a normalized nickname');
select is(public.register_guest_presence('IDENA00001', 'b2222222-2222-4222-8222-222222222222', repeat('x', 41)), false, 'presence rejects nicknames longer than 40 characters');
select is(public.register_guest_presence('IDENP00001', 'c3333333-3333-4333-8333-333333333333', 'Paused guest'), false, 'paused rooms do not accept presence');
select is(public.register_guest_presence('IDENB00001', 'a1111111-1111-4111-8111-111111111111', 'Ana Lima'), true, 'a browser identity can have separate room-scoped presence');

select is(public.submit_guest_request_with_identity(
  'IDENA00001', 'identity-request-ip',
  '{"kind":"manual","title":"Pedido da Ana","artist":"Artista","url":""}'::jsonb,
  repeat('a', 64), '2026-11-04', '2026-11-04', 'a1111111-1111-4111-8111-111111111111'
)->>'received', 'true', 'request from an active room guest is accepted');
select is((select guest_name from public.guest_requests where title = 'Pedido da Ana'), 'Ana Lima', 'request nickname is sourced from room presence, not separate client text');
select is(public.submit_guest_request_with_identity(
  'IDENA00001', 'identity-request-ip-2',
  '{"kind":"manual","title":"Wrong room","artist":"Artista","url":""}'::jsonb,
  repeat('b', 64), '2026-11-04', '2026-11-04', 'b2222222-2222-4222-8222-222222222222'
)->>'error', 'guest_presence_required', 'a guest identity present only in another room cannot submit here');

insert into public.guest_requests (room_id, dj_id, request_kind, title, artist, status, guest_id, guest_name)
select id, dj_id, 'manual', 'Approved fixture', 'Artista', 'approved', 'a1111111-1111-4111-8111-111111111111', 'Ana Lima'
from public.rooms where code = 'IDENA00001';
insert into public.guest_requests (room_id, dj_id, request_kind, title, artist, status, guest_id, guest_name)
select id, dj_id, 'manual', 'Rejected fixture', 'Artista', 'rejected', 'a1111111-1111-4111-8111-111111111111', 'Ana Lima'
from public.rooms where code = 'IDENA00001';

select set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select max(online_count)::integer from public.dj_room_online_guests('61111111-1111-4111-8111-111111111111')), 1, 'DJ A sees the active participant count for own room');
select is((select guest_name from public.dj_room_online_guests('61111111-1111-4111-8111-111111111111') where guest_name is not null), 'Ana Lima', 'DJ A sees active nicknames for own room');
select is((select count(*)::integer from public.dj_list_room_guest_requests('61111111-1111-4111-8111-111111111111')), 3, 'DJ A sees pending, approved and rejected requests for own room');
select is((select pending_count::integer from public.dj_guest_request_summary()), 1, 'overview summary counts own pending requests');
select is((select approved_count::integer from public.dj_guest_request_summary()), 1, 'overview summary counts own approved requests');
select is((select rejected_count::integer from public.dj_guest_request_summary()), 1, 'overview summary counts own rejected requests');
select throws_ok($$select * from public.dj_list_room_guest_requests('62222222-2222-4222-8222-222222222222')$$, '42501', null, 'DJ A cannot list DJ B requests');
select throws_ok($$select * from public.dj_room_online_guests('62222222-2222-4222-8222-222222222222')$$, '42501', null, 'DJ A cannot inspect DJ B presence');
reset role;

update public.guest_presence set last_seen_at = now() - interval '91 seconds'
  where room_id = '61111111-1111-4111-8111-111111111111';
select set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select max(online_count)::integer from public.dj_room_online_guests('61111111-1111-4111-8111-111111111111')), 0, 'presence expires after 90 seconds without a heartbeat');
select set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true}', true);
select throws_ok($$select * from public.dj_list_room_guest_requests('61111111-1111-4111-8111-111111111111')$$, '42501', null, 'anonymous authenticated guests cannot access DJ requests');
reset role;

select * from finish();
rollback;
