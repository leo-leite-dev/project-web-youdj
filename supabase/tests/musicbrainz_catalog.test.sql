begin;
select plan(15);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  '73333333-3333-3333-3333-333333333333',
  'authenticated', 'authenticated', 'catalog-owner@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}'::jsonb, false
);
insert into public.dj_profiles (id, display_name)
values ('73333333-3333-3333-3333-333333333333', 'Catalog owner');
insert into public.rooms (dj_id, name, code, status)
values ('73333333-3333-3333-3333-333333333333', 'Catalog test', 'CATLG00001', 'active');
insert into public.youtube_search_cache (normalized_query, videos, expires_at)
values ('legacy catalog compatibility', '[{"videoId":"abcdefghijk","title":"Legacy song","channel":"Legacy artist"}]'::jsonb, now() + interval '1 hour');

select ok(not has_table_privilege('anon', 'public.music_catalog_recordings', 'SELECT'), 'anon cannot read catalog rows directly');
select ok(not has_table_privilege('authenticated', 'public.music_catalog_recordings', 'SELECT'), 'authenticated cannot read catalog rows directly');
select ok(not has_table_privilege('service_role', 'public.music_catalog_recordings', 'SELECT'), 'server role uses RPCs rather than direct catalog table reads');
select ok(not has_function_privilege('anon', 'public.guest_music_catalog_search(text,text,text,integer,integer)', 'EXECUTE'), 'anon cannot call catalog search RPC directly');
select ok(has_function_privilege('service_role', 'public.guest_music_catalog_search(text,text,text,integer,integer)', 'EXECUTE'), 'server role can call catalog search RPC');
select ok(not has_function_privilege('authenticated', 'public.music_catalog_import_batch(uuid,jsonb,integer)', 'EXECUTE'), 'DJ sessions cannot import catalog data');
select ok(has_function_privilege('service_role', 'public.music_catalog_import_batch(uuid,jsonb,integer)', 'EXECUTE'), 'only server role is granted catalog import RPC');
select ok(not has_function_privilege('anon', 'public.submit_guest_request(text,text,jsonb,text,text,text)', 'EXECUTE'), 'guests cannot call order submission RPC directly');

set local role service_role;
select public.music_catalog_import_batch(
  '5dcdb5eb-cb72-4e6e-9e63-b7bace604965',
  '[{"mbid":"5a6b7c8d-1234-4abc-8def-0123456789ab","title":"Livin’ on a Prayer","artist_credit":"Bon Jovi"}]'::jsonb,
  0
);
select public.music_catalog_import_batch(
  '5dcdb5eb-cb72-4e6e-9e63-b7bace604965',
  '[{"mbid":"5a6b7c8d-1234-4abc-8def-0123456789ab","title":"Livin’ on a Prayer","artist_credit":"Bon Jovi"}]'::jsonb,
  0
);
select is(
  (select count(*)::integer
   from jsonb_array_elements(
     public.guest_music_catalog_search('CATLG00001', 'Bon Jovi', '203.0.113.8', 10, 0)->'results'
   ) as result(value)
   where value->>'recordingMbid' = '5a6b7c8d-1234-4abc-8def-0123456789ab'),
  1,
  'active-room catalog search returns the matching metadata row'
);
select public.submit_guest_request(
  'CATLG00001', '203.0.113.7',
  '{"kind":"catalog","recordingMbid":"5a6b7c8d-1234-4abc-8def-0123456789ab"}'::jsonb,
  repeat('a', 64), '2026-11-04', '2026-11-04'
);
select public.submit_guest_request(
  'CATLG00001', '203.0.113.7',
  '{"kind":"manual","title":"Livin’ on a Prayer","artist":"Bon Jovi","url":"https://youtu.be/abcdefghijk"}'::jsonb,
  repeat('b', 64), '2026-11-04', '2026-11-04'
);
select public.submit_guest_request(
  'CATLG00001', '203.0.113.7',
  '{"kind":"youtube","videoId":"abcdefghijk"}'::jsonb,
  repeat('c', 64), '2026-11-04', '2026-11-04'
);
select public.submit_guest_request(
  'CATLG00001', '203.0.113.7',
  '{"kind":"manual","title":"Local manual song","artist":"Local artist","url":""}'::jsonb,
  repeat('d', 64), '2026-11-04', '2026-11-04'
);
reset role;

select is((select count(*)::integer from public.music_catalog_recordings where recording_mbid = '5a6b7c8d-1234-4abc-8def-0123456789ab'), 1, 're-importing an MBID does not create a duplicate catalog row');
select is((select count(*)::integer from public.guest_requests where request_source = 'musicbrainz' and recording_mbid = '5a6b7c8d-1234-4abc-8def-0123456789ab' and status = 'pending'), 1, 'catalog request stores its MBID and remains pending');
select is((select count(*)::integer from public.guest_requests where request_source = 'youtube' and submitted_url = 'https://youtu.be/abcdefghijk' and status = 'pending'), 1, 'manual YouTube URL is recorded as a reference, not an audio file');
select is((select count(*)::integer from public.guest_requests where request_source = 'youtube' and video_id = 'abcdefghijk' and status = 'pending'), 1, 'legacy cached YouTube-video requests remain compatible');
select is((select count(*)::integer from public.guest_requests where request_source = 'manual' and title = 'Local manual song' and submitted_url is null), 1, 'manual metadata requests remain supported without a YouTube URL');
select set_config('request.jwt.claims', '{"sub":"73333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select is((select count(*)::integer from public.dj_list_guest_requests() where request_source = 'musicbrainz' and recording_mbid = '5a6b7c8d-1234-4abc-8def-0123456789ab'), 1, 'owner-scoped moderation RPC exposes catalog origin while preserving MBID');
reset role;

select * from finish();
rollback;
