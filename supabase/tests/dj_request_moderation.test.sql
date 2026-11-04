begin;
select plan(11);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', '31111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'moderator-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '32222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'moderator-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}'::jsonb, false);
insert into public.dj_profiles (id, display_name) values
  ('31111111-1111-1111-1111-111111111111', 'Moderator A'),
  ('32222222-2222-2222-2222-222222222222', 'Moderator B');
insert into public.rooms (dj_id, name, code, status) values
  ('31111111-1111-1111-1111-111111111111', 'Room A', 'MODERA0001', 'active'),
  ('32222222-2222-2222-2222-222222222222', 'Room B', 'MODERB0001', 'active');
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id)
select '41111111-1111-1111-1111-111111111111', id, dj_id, 'youtube', 'Song A', 'Channel A', 'abcdefghijk'
from public.rooms where code = 'MODERA0001';
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id)
select '42222222-2222-2222-2222-222222222222', id, dj_id, 'youtube', 'Song B', 'Channel B', 'abcdefghijl'
from public.rooms where code = 'MODERB0001';

select ok(has_function_privilege('authenticated', 'public.dj_list_guest_requests()', 'EXECUTE'), 'authenticated can call scoped listing RPC');
select ok(has_function_privilege('authenticated', 'public.dj_set_guest_request_status(uuid,text)', 'EXECUTE'), 'authenticated can call moderation RPC');
select ok(not has_function_privilege('anon', 'public.dj_list_guest_requests()', 'EXECUTE') and not has_function_privilege('anon', 'public.dj_set_guest_request_status(uuid,text)', 'EXECUTE'), 'anon cannot call DJ moderation RPCs');
select ok(not has_table_privilege('authenticated', 'public.guest_requests', 'SELECT') and not has_table_privilege('authenticated', 'public.guest_requests', 'UPDATE'), 'authenticated has no direct table access');

select set_config('request.jwt.claims', '{"sub":"31111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select count(*)::integer from public.dj_list_guest_requests()), 1, 'DJ A sees only own-room requests');
select is((select public.dj_set_guest_request_status('41111111-1111-1111-1111-111111111111', 'approved')), true, 'owner approves pending request');
select is((select count(*)::integer from public.dj_list_guest_requests() where status = 'approved'), 1, 'approved request remains a separate status without playlist side effects');
select is((select public.dj_set_guest_request_status('42222222-2222-2222-2222-222222222222', 'approved')), false, 'DJ A cannot change DJ B request');
select is((select public.dj_set_guest_request_status('41111111-1111-1111-1111-111111111111', 'rejected')), false, 'already decided request cannot be changed again');
select throws_ok($$select public.dj_set_guest_request_status('41111111-1111-1111-1111-111111111111', 'pending')$$, '22023', null, 'invalid status is rejected');
select set_config('request.jwt.claims', '{"sub":"31111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":true}', true);
select throws_ok($$select public.dj_list_guest_requests()$$, '42501', null, 'anonymous authenticated session cannot use DJ moderation');
reset role;

select * from finish();
rollback;
