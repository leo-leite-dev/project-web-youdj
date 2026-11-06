-- Per-room ownership, moderator authorization and public owner display.
begin;
select plan(49);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '71111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'owner-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '72222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'owner-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '73333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'moderator@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '74444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'outsider@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '75555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'anonymous@example.test', null, '{"provider":"anonymous","providers":["anonymous"]}', '{}'::jsonb, true);

insert into public.dj_profiles (id, display_name) values
  ('71111111-1111-4111-8111-111111111111', 'DJ Ana'),
  ('72222222-2222-4222-8222-222222222222', 'DJ Beto'),
  ('73333333-3333-4333-8333-333333333333', 'DJ Carla'),
  ('74444444-4444-4444-8444-444444444444', 'DJ Duda');
insert into public.rooms (id, dj_id, name, code, status) values
  ('81111111-1111-4111-8111-111111111111', '71111111-1111-4111-8111-111111111111', 'Room A', 'ROLEA00001', 'active'),
  ('82222222-2222-4222-8222-222222222222', '72222222-2222-4222-8222-222222222222', 'Room B', 'ROLEB00001', 'active');
insert into public.guest_presence (room_id, guest_id, guest_name)
values ('81111111-1111-4111-8111-111111111111', '89999999-9999-4999-8999-999999999999', 'Convidada A');
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, status, guest_name, guest_id)
values
  ('91111111-1111-4111-8111-111111111111', '81111111-1111-4111-8111-111111111111', '71111111-1111-4111-8111-111111111111', 'manual', 'Song A', 'Artist A', 'pending', 'Convidada A', '89999999-9999-4999-8999-999999999999'),
  ('92222222-2222-4222-8222-222222222222', '82222222-2222-4222-8222-222222222222', '72222222-2222-4222-8222-222222222222', 'manual', 'Song B', 'Artist B', 'pending', 'Convidado B', '89999999-9999-4999-8999-999999999998');

select ok((select relrowsecurity from pg_class where oid = 'public.room_moderators'::regclass), 'moderator membership has RLS enabled');
select ok(not exists (
  select 1 from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
  cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE')) as actions(action_name)
  where has_table_privilege(roles.role_name, 'public.room_moderators', actions.action_name)
), 'API roles have no direct membership table privileges');
select ok(has_function_privilege('authenticated', 'public.dj_get_room_management_context(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_list_room_moderators(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_invite_room_moderator(uuid,text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_revoke_room_moderator(uuid,uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_list_room_guest_requests(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_room_online_guests(uuid)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.dj_set_guest_request_status(uuid,text)', 'EXECUTE'), 'authenticated clients can call scoped room RPCs');
select ok(not has_function_privilege('anon', 'public.dj_get_room_management_context(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_list_room_moderators(uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_invite_room_moderator(uuid,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_revoke_room_moderator(uuid,uuid)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.dj_set_guest_request_status(uuid,text)', 'EXECUTE'), 'anonymous guests cannot call authenticated administration RPCs');
select ok(has_function_privilege('anon', 'public.room_by_code(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.room_by_code(text)', 'EXECUTE')
  and has_function_privilege('anon', 'public.room_by_code_with_membership(text)', 'EXECUTE')
  and has_function_privilege('authenticated', 'public.room_by_code_with_membership(text)', 'EXECUTE'), 'legacy and membership lookups remain available to intended room viewers');
select ok(not has_function_privilege('anon', 'private.current_room_role(uuid)', 'EXECUTE')
  and not has_function_privilege('authenticated', 'private.current_room_role(uuid)', 'EXECUTE'), 'internal room-role helper is not callable by API roles');

select set_config('request.jwt.claims', '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select access_role from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')), 'owner', 'authenticated room creator is automatically the owner');
select is((select dj_name from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')), 'DJ Ana', 'owner display name is read from dj_profiles');
select is((select count(*)::integer from public.dj_list_room_moderators('81111111-1111-4111-8111-111111111111')), 0, 'owner can list an empty moderator roster');
select is(public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'MODERATOR@example.test'), true, 'owner invites an existing authenticated account by email');
select is(public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'moderator@example.test'), false, 'duplicate invite is idempotent');
select is((select email from public.dj_list_room_moderators('81111111-1111-4111-8111-111111111111')), 'moderator@example.test', 'owner sees the invited account in this room');
select throws_ok($$select public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'missing@example.test')$$, 'P0002', null, 'owner cannot invite an account that does not exist');
select throws_ok($$select public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'invalid-email')$$, '22023', null, 'invite validates email format');
select throws_ok($$select public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'owner-a@example.test')$$, '22023', null, 'owner cannot grant a moderator role to themself');
select is((select count(*)::integer from public.dj_list_room_guest_requests('81111111-1111-4111-8111-111111111111')), 1, 'owner reads requests in the owned room');
select is((select max(online_count)::integer from public.dj_room_online_guests('81111111-1111-4111-8111-111111111111')), 1, 'owner reads guest presence in the owned room');
select is(public.dj_set_guest_request_status('91111111-1111-4111-8111-111111111111', 'approved'), true, 'owner can moderate an owned-room request');
select is((select viewer_role from public.room_by_code_with_membership('ROLEA00001')), 'owner', 'membership lookup recognizes the authenticated room owner');
select is((select dj_name from public.room_by_code_with_membership('ROLEA00001')), 'DJ Ana', 'membership lookup exposes only the profile display name');
select is((select room_id from public.room_by_code_with_membership('ROLEA00001')), '81111111-1111-4111-8111-111111111111'::uuid, 'room UUID is returned only to the owner');
reset role;

select set_config('request.jwt.claims', '{"sub":"73333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select access_role from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')), 'moderator', 'moderator role is scoped to the invited room');
select is((select dj_name from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')), 'DJ Ana', 'moderator sees the owner name for the assigned room');
select is((select viewer_role from public.room_by_code_with_membership('ROLEA00001')), 'moderator', 'membership lookup identifies the authenticated moderator');
select is((select room_id from public.room_by_code_with_membership('ROLEA00001')), '81111111-1111-4111-8111-111111111111'::uuid, 'moderator receives the assigned room route ID only');
select is((select count(*)::integer from public.dj_list_room_guest_requests('81111111-1111-4111-8111-111111111111')), 1, 'moderator reads requests only in the assigned room');
select is((select max(online_count)::integer from public.dj_room_online_guests('81111111-1111-4111-8111-111111111111')), 1, 'moderator reads guest presence only in the assigned room');
select is(public.dj_set_guest_request_status('92222222-2222-4222-8222-222222222222', 'approved'), false, 'moderator cannot change a request from another room');
select throws_ok($$select * from public.dj_list_room_guest_requests('82222222-2222-4222-8222-222222222222')$$, '42501', null, 'moderator cannot list another room requests');
select throws_ok($$select * from public.dj_room_online_guests('82222222-2222-4222-8222-222222222222')$$, '42501', null, 'moderator cannot inspect another room presence');
select throws_ok($$select * from public.dj_list_room_moderators('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'moderator cannot list room permissions');
select throws_ok($$select public.dj_invite_room_moderator('81111111-1111-4111-8111-111111111111', 'outsider@example.test')$$, '42501', null, 'moderator cannot grant permissions');
select throws_ok($$select public.dj_revoke_room_moderator('81111111-1111-4111-8111-111111111111', '73333333-3333-4333-8333-333333333333')$$, '42501', null, 'moderator cannot revoke permissions');
select throws_ok($$select * from public.room_moderators$$, '42501', null, 'moderator cannot read membership table directly');
select throws_ok($$update public.rooms set dj_id = '73333333-3333-4333-8333-333333333333' where id = '81111111-1111-4111-8111-111111111111'$$, '42501', null, 'moderator cannot alter or assume room ownership');
select is((select count(*)::integer from public.rooms where id = '81111111-1111-4111-8111-111111111111'), 0, 'room RLS hides the owner room from its moderator');
reset role;

select set_config('request.jwt.claims', '{"sub":"72222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select * from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'another owner cannot open this room management context');
select throws_ok($$select * from public.dj_list_room_moderators('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'another owner cannot list this room moderators');
select is((select access_role from public.dj_get_room_management_context('82222222-2222-4222-8222-222222222222')), 'owner', 'second DJ automatically owns only their own room');
select is((select viewer_role from public.room_by_code_with_membership('ROLEA00001')), 'unauthorized', 'registered DJ without a room role is not presented as an unregistered guest');
reset role;

select set_config('request.jwt.claims', '{"sub":"75555555-5555-4555-8555-555555555555","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select is((select viewer_role from public.room_by_code_with_membership('ROLEA00001')), 'guest', 'anonymous authenticated sessions are still treated as guests');
select is((select room_id from public.room_by_code_with_membership('ROLEA00001')), null::uuid, 'guest lookup does not expose the internal room ID');
select throws_ok($$select * from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'anonymous session cannot access DJ room management');
reset role;

select set_config('request.jwt.claims', '{}', true);
set local role anon;
select is((select viewer_role from public.room_by_code_with_membership('ROLEA00001')), 'guest', 'anonymous visitor sees public guest role');
select is((select dj_name from public.room_by_code_with_membership('ROLEA00001')), 'DJ Ana', 'public guest sees the DJ profile display name');
select is((select room_id from public.room_by_code_with_membership('ROLEA00001')), null::uuid, 'public guest cannot retrieve the room UUID');
reset role;

select set_config('request.jwt.claims', '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_revoke_room_moderator('81111111-1111-4111-8111-111111111111', '73333333-3333-4333-8333-333333333333'), true, 'owner revokes the room-scoped moderator role');
reset role;
select set_config('request.jwt.claims', '{"sub":"73333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select * from public.dj_get_room_management_context('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'revoked moderator immediately loses room access');
select throws_ok($$select * from public.dj_list_room_guest_requests('81111111-1111-4111-8111-111111111111')$$, '42501', null, 'revoked moderator immediately loses request access');
reset role;

select * from finish();
rollback;
