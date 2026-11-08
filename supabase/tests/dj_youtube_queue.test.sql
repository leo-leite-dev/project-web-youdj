begin;
select plan(23);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_anonymous) values
('00000000-0000-0000-0000-000000000000', '71111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'dj-queue-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false),
('00000000-0000-0000-0000-000000000000', '72222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'dj-queue-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false),
('00000000-0000-0000-0000-000000000000', '75555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'dj-queue-mod@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false),
('00000000-0000-0000-0000-000000000000', '73333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', null, now(), '{"provider":"anonymous","providers":["anonymous"]}', '{}', true);
insert into public.dj_profiles (id, display_name) values
('71111111-1111-4111-8111-111111111111', 'DJ Queue A'),
('72222222-2222-4222-8222-222222222222', 'DJ Queue B');
insert into public.rooms (dj_id, name, code, status) values
('71111111-1111-4111-8111-111111111111', 'Direct queue A', 'DIRECT0001', 'active'),
('72222222-2222-4222-8222-222222222222', 'Direct queue B', 'DIRECT0002', 'active');
insert into public.room_moderators (room_id, moderator_id, granted_by)
select room.id, '75555555-5555-4555-8555-555555555555', room.dj_id from public.rooms room where room.code = 'DIRECT0001';
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id, status)
select '74444444-4444-4444-8444-444444444444', id, dj_id, 'youtube', 'Guest request', 'Guest artist', 'guestvideo1', 'pending'
from public.rooms where code = 'DIRECT0001';
insert into public.youtube_search_cache (normalized_query, videos, expires_at) values
('dj queue search', '[{"videoId":"abcdefghijk","title":"DJ selected song","channel":"DJ channel","thumbnail":"https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg"},{"videoId":"abcdefghijl","title":"Moderator selected song","channel":"Moderator channel","thumbnail":"https://i.ytimg.com/vi/abcdefghijl/mqdefault.jpg"}]'::jsonb, now() + interval '6 hours');

select throws_ok($$insert into public.room_music_queue (room_id, request_id, "position", source, dj_video_id, dj_title, dj_artist)
  values ((select id from public.rooms where code = 'DIRECT0001'), null, 90001, 'dj', null, 'Missing video ID', 'Channel')$$,
  '23514', null, 'DJ-originated queue rows require a valid video ID');
select ok(not has_table_privilege('authenticated', 'public.room_music_queue', 'SELECT'), 'authenticated cannot read queue storage directly');
select ok(has_function_privilege('authenticated', 'public.dj_add_youtube_track_to_queue(uuid,text)', 'EXECUTE'), 'authenticated can execute the scoped DJ add RPC');
select ok(not has_function_privilege('anon', 'public.dj_add_youtube_track_to_queue(uuid,text)', 'EXECUTE'), 'anon cannot execute the DJ add RPC');

select set_config('request.jwt.claims', '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_set_guest_request_status('74444444-4444-4444-8444-444444444444', 'approved'), true, 'existing guest approval still queues a request');
select set_config('test.direct_queue_item', public.dj_add_youtube_track_to_queue(
  (select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijk'
)::text, true);
select ok(current_setting('test.direct_queue_item') ~ '^[0-9a-f-]{36}$', 'DJ addition returns a stable queue item ID');
select is(public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijk')::text,
  current_setting('test.direct_queue_item'), 'repeated add of the same video is idempotent');
select is((select count(*)::integer from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001'))), 2, 'guest and direct DJ tracks share the room queue');
select is((select source from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) where request_id = current_setting('test.direct_queue_item')::uuid), 'dj', 'direct selection is identified as DJ-originated');
select is((select guest_name from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) where request_id = current_setting('test.direct_queue_item')::uuid), 'DJ', 'direct selection is not represented as a guest');
select is((select "position" from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) where request_id = current_setting('test.direct_queue_item')::uuid), 2::bigint, 'direct selection appends after existing queue tracks');
select is((select video_id from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) where request_id = current_setting('test.direct_queue_item')::uuid), 'abcdefghijk', 'video ID metadata is persisted');

reset role;
select is((select count(*)::integer from public.guest_requests where room_id = (select id from public.rooms where code = 'DIRECT0001')), 1, 'direct selection does not manufacture a guest request');
select set_config('request.jwt.claims', '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_reorder_room_music_queue((select id from public.rooms where code = 'DIRECT0001'), array[
  current_setting('test.direct_queue_item')::uuid, '74444444-4444-4444-8444-444444444444'::uuid
]), true, 'queue reorder accepts both direct item IDs and guest request IDs');
select is((select request_id from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) order by "position" limit 1),
  current_setting('test.direct_queue_item')::uuid, 'direct track position updates correctly');
select is(public.dj_remove_room_music_queue_item((select id from public.rooms where code = 'DIRECT0001'), current_setting('test.direct_queue_item')::uuid), true, 'direct item can be removed by its queue identity');
select is((select status from public.dj_list_room_guest_requests((select id from public.rooms where code = 'DIRECT0001')) where id = '74444444-4444-4444-8444-444444444444'), 'approved', 'removing a direct item does not change guest request status');
select throws_ok($$select public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'invalid')$$,
  '22023', 'invalid_youtube_track', 'invalid YouTube IDs are rejected');
reset role;
select set_config('request.jwt.claims', '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijm')$$,
  '22023', 'youtube_video_not_in_recent_search', 'tracks outside validated recent search results are rejected');
select throws_ok($$select public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0002'), 'abcdefghijl')$$,
  '42501', 'not_authorized', 'DJ cannot add to a different room');

reset role;
select set_config('request.jwt.claims', '{"sub":"75555555-5555-4555-8555-555555555555","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select set_config('test.moderator_queue_item', public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijl')::text, true);
select is((select source from public.dj_list_room_music_queue((select id from public.rooms where code = 'DIRECT0001')) where request_id = current_setting('test.moderator_queue_item')::uuid), 'dj', 'assigned moderator can add a direct DJ track');
reset role;
select set_config('request.jwt.claims', '{"sub":"72222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select throws_ok($$select public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijm')$$,
  '42501', 'not_authorized', 'another DJ cannot add tracks to this room');
reset role;
select set_config('request.jwt.claims', '{"sub":"73333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":true}', true);
set local role authenticated;
select throws_ok($$select public.dj_add_youtube_track_to_queue((select id from public.rooms where code = 'DIRECT0001'), 'abcdefghijn')$$,
  '42501', 'not_authorized', 'anonymous authenticated guest cannot add DJ tracks');

reset role;
select * from finish();
rollback;
