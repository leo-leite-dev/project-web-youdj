begin;
select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '51111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'vip-owner@example.test', now(), '{"provider":"email"}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '52222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'vip-other@example.test', now(), '{"provider":"email"}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '65555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'vip-moderator@example.test', now(), '{"provider":"email"}', '{}'::jsonb, false);
insert into public.dj_profiles (id, display_name) values
  ('51111111-1111-4111-8111-111111111111', 'VIP owner'),
  ('52222222-2222-4222-8222-222222222222', 'Other owner');
insert into public.rooms (id, dj_id, name, code, status) values
  ('61111111-1111-4111-8111-111111111111', '51111111-1111-4111-8111-111111111111', 'VIP room', 'VIPRM00001', 'active'),
  ('62222222-2222-4222-8222-222222222222', '52222222-2222-4222-8222-222222222222', 'Other room', 'VIPRM00002', 'active');
insert into public.guest_presence (room_id, guest_id, guest_name, credential_hash)
values ('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', 'Lia', encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'));
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, status)
values ('64444444-4444-4444-8444-444444444444', '61111111-1111-4111-8111-111111111111', '51111111-1111-4111-8111-111111111111', 'manual', 'Already queued', 'Artist', 'approved');
insert into public.room_music_queue (room_id, request_id, "position")
values ('61111111-1111-4111-8111-111111111111', '64444444-4444-4444-8444-444444444444', 1);
insert into public.room_moderators (room_id, moderator_id, granted_by)
values ('61111111-1111-4111-8111-111111111111', '65555555-5555-4555-8555-555555555555', '51111111-1111-4111-8111-111111111111');

select ok((select relrowsecurity from pg_class where oid = 'public.room_guest_vips'::regclass), 'VIP grants have RLS enabled');
select ok(not has_table_privilege('anon', 'public.room_guest_vips', 'SELECT') and not has_table_privilege('authenticated', 'public.room_guest_vips', 'SELECT') and not has_table_privilege('authenticated', 'public.room_guest_vips', 'INSERT') and not has_table_privilege('authenticated', 'public.room_guest_vips', 'UPDATE') and not has_table_privilege('authenticated', 'public.room_guest_vips', 'DELETE') and not has_table_privilege('service_role', 'public.room_guest_vips', 'SELECT'), 'API roles cannot access VIP credential storage directly');
select ok(has_function_privilege('authenticated', 'public.dj_set_room_guest_vip(uuid,uuid,boolean)', 'EXECUTE') and has_function_privilege('authenticated', 'public.dj_list_room_guest_vips(uuid)', 'EXECUTE') and not has_function_privilege('anon', 'public.dj_set_room_guest_vip(uuid,uuid,boolean)', 'EXECUTE'), 'VIP management RPCs are callable only by authenticated clients');
select ok(has_function_privilege('service_role', 'public.register_guest_presence(text,uuid,text,text)', 'EXECUTE') and not has_function_privilege('anon', 'public.register_guest_presence(text,uuid,text,text)', 'EXECUTE') and has_function_privilege('service_role', 'public.submit_guest_request_with_identity(text,text,jsonb,text,text,text,uuid,text)', 'EXECUTE') and not has_function_privilege('authenticated', 'public.submit_guest_request_with_identity(text,text,jsonb,text,text,text,uuid,text)', 'EXECUTE'), 'private credential heartbeat and VIP submission RPCs are server-only');
select is(public.register_guest_presence('VIPRM00001', '66666666-6666-4666-8666-666666666666', 'New guest', repeat('b',64)), true, 'server registers a guest with a private room credential');
select is((select credential_hash from public.guest_presence where guest_id = '66666666-6666-4666-8666-666666666666'), encode(extensions.digest(repeat('b',64), 'sha256'), 'hex'), 'presence stores only the credential digest');
select is(public.register_guest_presence('VIPRM00001', '67777777-7777-4777-8777-777777777777', 'Invalid token', 'not-a-token'), false, 'presence rejects malformed private credentials');

select set_config('request.jwt.claims', '{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', true), true, 'room owner grants VIP to an active guest');
select is((select is_vip from public.dj_room_online_guests('61111111-1111-4111-8111-111111111111') where guest_name = 'Lia'), true, 'owner sees VIP status for room guest');
select is((select guest_id from public.dj_room_online_guests('61111111-1111-4111-8111-111111111111') where guest_name = 'Lia'), '63333333-3333-4333-8333-333333333333'::uuid, 'owner can target the individual room identity');
select is((select guest_name from public.dj_list_room_guest_vips('61111111-1111-4111-8111-111111111111')), 'Lia', 'owner can list VIP grants to revoke them after guests disconnect');
select throws_ok($$select public.dj_set_room_guest_vip('62222222-2222-4222-8222-222222222222', '63333333-3333-4333-8333-333333333333', true)$$, '42501', null, 'owner cannot grant VIP outside owned room');
select throws_ok($$select public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '64444444-4444-4444-8444-444444444444', true)$$, 'P0002', null, 'owner cannot grant VIP to an unknown or offline identity');
reset role;

select is(public.submit_guest_request_with_identity('VIPRM00001', 'vip-ip-wrong', '{"kind":"manual","title":"Wrong credential","artist":"Artist","url":""}'::jsonb, repeat('b',64), '2026-11-07', '2026-11-07', '63333333-3333-4333-8333-333333333333', repeat('c',64))->>'auto_approved', 'false', 'guest UUID and nickname alone cannot use VIP privilege');
select is((select status from public.guest_requests where title = 'Wrong credential'), 'pending', 'mismatched credential leaves request pending');
select is(public.submit_guest_request_with_identity('VIPRM00001', 'vip-ip-right', '{"kind":"manual","title":"VIP song","artist":"Artist","url":""}'::jsonb, repeat('d',64), '2026-11-07', '2026-11-07', '63333333-3333-4333-8333-333333333333', repeat('a',64))->>'auto_approved', 'true', 'matching room credential auto-approves VIP request');
select is((select "position" from public.room_music_queue where request_id = (select id from public.guest_requests where title = 'VIP song')), 2::bigint, 'VIP request is appended after existing room queue items');

select set_config('request.jwt.claims', '{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', false), true, 'owner revokes the room-scoped VIP permission');
reset role;
select is(public.submit_guest_request_with_identity('VIPRM00001', 'vip-ip-revoked', '{"kind":"manual","title":"After revocation","artist":"Artist","url":""}'::jsonb, repeat('e',64), '2026-11-07', '2026-11-07', '63333333-3333-4333-8333-333333333333', repeat('a',64))->>'auto_approved', 'false', 'revoked VIP immediately returns to manual approval');

select set_config('request.jwt.claims', '{"sub":"65555555-5555-4555-8555-555555555555","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', false)$$, '42501', null, 'moderator cannot grant or revoke VIP permissions');
select throws_ok($$select * from public.dj_list_room_guest_vips('61111111-1111-4111-8111-111111111111')$$, '42501', null, 'moderator cannot list the VIP roster');
reset role;
select set_config('request.jwt.claims', '{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select throws_ok($$select public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', false)$$, '42501', null, 'anonymous authenticated sessions cannot manage VIP permissions');
reset role;

select set_config('request.jwt.claims', '{"sub":"52222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select public.dj_set_room_guest_vip('61111111-1111-4111-8111-111111111111', '63333333-3333-4333-8333-333333333333', false)$$, '42501', null, 'another DJ cannot revoke VIP permission');
select throws_ok($$select * from public.dj_list_room_guest_vips('61111111-1111-4111-8111-111111111111')$$, '42501', null, 'another DJ cannot list VIPs from a different tenant');
reset role;

select * from finish();
rollback;
