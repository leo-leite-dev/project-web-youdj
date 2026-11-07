begin;
select plan(12);

insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_anonymous) values
('00000000-0000-0000-0000-000000000000', '61111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'play-a@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false),
('00000000-0000-0000-0000-000000000000', '62222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'play-b@example.test', now(), '{"provider":"email","providers":["email"]}', '{}', false);
insert into public.dj_profiles (id, display_name) values
('61111111-1111-1111-1111-111111111111', 'Playback A'), ('62222222-2222-2222-2222-222222222222', 'Playback B');
insert into public.rooms (dj_id, name, code, status) values
('61111111-1111-1111-1111-111111111111', 'Playback A', 'PLAYBACK001', 'active'),
('62222222-2222-2222-2222-222222222222', 'Playback B', 'PLAYBACK002', 'active');
insert into public.guest_requests (id, room_id, dj_id, request_kind, title, artist, video_id, status)
select ids.request_id, room.id, room.dj_id, 'youtube', 'Same song', 'Artist', 'abcdefghijk', ids.status
from public.rooms room cross join (values
 ('63333333-3333-3333-3333-333333333331'::uuid, 'approved'::text),
 ('63333333-3333-3333-3333-333333333332'::uuid, 'approved'::text),
 ('63333333-3333-3333-3333-333333333333'::uuid, 'pending'::text)
) ids(request_id, status) where room.code = 'PLAYBACK001';

select ok((select relrowsecurity from pg_class where oid='public.room_music_playback_history'::regclass), 'history table has RLS enabled');
select ok(not has_table_privilege('authenticated', 'public.room_music_playback_history', 'SELECT'), 'clients cannot directly read history');
select ok(not has_table_privilege('authenticated', 'public.room_music_playback_history', 'INSERT'), 'clients cannot directly write history');
select ok(not has_function_privilege('anon', 'public.dj_mark_room_request_played(uuid,uuid)', 'EXECUTE'), 'anon cannot record playback');
select set_config('request.jwt.claims', '{"sub":"61111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is(public.dj_mark_room_request_played((select id from public.rooms where code='PLAYBACK001'), '63333333-3333-3333-3333-333333333331'), true, 'authorized DJ records the exact request');
select is(public.dj_mark_room_request_played((select id from public.rooms where code='PLAYBACK001'), '63333333-3333-3333-3333-333333333331'), true, 'repeated playback event is idempotent');
select is(public.dj_mark_room_request_played((select id from public.rooms where code='PLAYBACK001'), '63333333-3333-3333-3333-333333333332'), true, 'same video from a second request has independent history');
select is((select count(*)::integer from public.dj_list_room_played_requests((select id from public.rooms where code='PLAYBACK001'))), 2, 'both individual requests are listed');
select is(public.dj_mark_room_request_played((select id from public.rooms where code='PLAYBACK001'), '63333333-3333-3333-3333-333333333333'), false, 'pending request cannot be recorded as played');
select is((select status from public.guest_requests where id='63333333-3333-3333-3333-333333333331'), 'approved', 'playback history does not alter approval');
select throws_ok($$select public.dj_list_room_played_requests((select id from public.rooms where code='PLAYBACK002'))$$, '42501', 'not_authorized', 'DJ cannot read another room history');
select throws_ok($$select public.dj_mark_room_request_played((select id from public.rooms where code='PLAYBACK002'), '63333333-3333-3333-3333-333333333331')$$, '42501', 'not_authorized', 'DJ cannot record against another room');
reset role;
select * from finish();
rollback;
