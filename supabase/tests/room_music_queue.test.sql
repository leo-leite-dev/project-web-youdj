begin;
select plan(13);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_anonymous) values
('00000000-0000-0000-0000-000000000000', '51111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'queue-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false),
('00000000-0000-0000-0000-000000000000', '52222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'queue-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false);
insert into public.dj_profiles (id, display_name) values ('51111111-1111-1111-1111-111111111111', 'Queue A'), ('52222222-2222-2222-2222-222222222222', 'Queue B');
insert into public.rooms (dj_id, name, code, status) values
('51111111-1111-1111-1111-111111111111', 'Queue room A', 'QUEUE00001', 'active'),
('52222222-2222-2222-2222-222222222222', 'Queue room B', 'QUEUE00002', 'active');
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id, status)
select '53333333-3333-3333-3333-333333333333', id, dj_id, 'youtube', 'Queue song one', 'Artist', 'abcdefghijk', 'pending' from public.rooms where code = 'QUEUE00001';
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id, status)
select '54444444-4444-4444-4444-444444444444', id, dj_id, 'youtube', 'Queue song two', 'Artist', 'abcdefghijl', 'pending' from public.rooms where code = 'QUEUE00001';
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id, status)
select '55555555-5555-5555-5555-555555555555', id, dj_id, 'youtube', 'Other room song', 'Artist', 'abcdefghijm', 'pending' from public.rooms where code = 'QUEUE00002';

select ok(has_table_privilege('authenticated', 'public.room_music_queue', 'SELECT') = false, 'authenticated cannot directly read queue storage');
select ok(has_function_privilege('authenticated', 'public.dj_list_room_music_queue(uuid)', 'EXECUTE'), 'authenticated can invoke queue RPC');
select ok(not has_function_privilege('anon', 'public.dj_list_room_music_queue(uuid)', 'EXECUTE'), 'anon cannot invoke queue RPC');
select set_config('request.jwt.claims', '{"sub":"51111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_set_guest_request_status('53333333-3333-3333-3333-333333333333', 'approved'), true, 'DJ approves request');
select is(public.dj_set_guest_request_status('53333333-3333-3333-3333-333333333333', 'approved'), false, 'repeat approval does not create a duplicate');
select is((select count(*)::integer from public.dj_list_room_music_queue((select id from public.rooms where code='QUEUE00001'))), 1, 'approved request appears once in its room queue');
select is((select status from public.dj_list_room_guest_requests((select id from public.rooms where code='QUEUE00001')) where id='53333333-3333-3333-3333-333333333333'), 'approved', 'queue operation preserves request status');
select is(public.dj_set_guest_request_status('54444444-4444-4444-4444-444444444444', 'approved'), true, 'second request approved');
select is(public.dj_reorder_room_music_queue((select id from public.rooms where code='QUEUE00001'), array['54444444-4444-4444-4444-444444444444'::uuid, '53333333-3333-3333-3333-333333333333'::uuid]), true, 'DJ can reorder room queue');
select is((select request_id from public.dj_list_room_music_queue((select id from public.rooms where code='QUEUE00001')) limit 1), '54444444-4444-4444-4444-444444444444'::uuid, 'reordered song is first');
select is(public.dj_set_guest_request_status('55555555-5555-5555-5555-555555555555', 'approved'), false, 'DJ cannot approve another room request');
select is(public.dj_remove_room_music_queue_item((select id from public.rooms where code='QUEUE00001'), '53333333-3333-3333-3333-333333333333'), true, 'DJ can remove queue item');
select is((select status from public.dj_list_room_guest_requests((select id from public.rooms where code='QUEUE00001')) where id='53333333-3333-3333-3333-333333333333'), 'approved', 'removal does not change approved request status');
reset role;
select * from finish();
rollback;
