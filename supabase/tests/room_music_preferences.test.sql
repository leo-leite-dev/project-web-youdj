-- Focused permissions and public-field scope for room music preferences.
begin;
select plan(17);

-- Two real authenticated identities and two rooms, seeded as the test owner.
insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'pref-a@example.test', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'pref-b@example.test', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);
insert into public.dj_profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'DJ Preferências A'),
  ('22222222-2222-2222-2222-222222222222', 'DJ Preferências B');
insert into public.rooms (dj_id, name, code)
values
  ('11111111-1111-1111-1111-111111111111', 'Sala Preferências A', 'PREFS00001'),
  ('22222222-2222-2222-2222-222222222222', 'Sala Preferências B', 'PREFS00002');

select ok(
  has_column_privilege('authenticated', 'public.rooms', 'surprise_mode', 'SELECT')
  and has_column_privilege('authenticated', 'public.rooms', 'show_playlist', 'SELECT')
  and has_column_privilege('authenticated', 'public.rooms', 'show_now_playing', 'SELECT')
  and has_column_privilege('authenticated', 'public.rooms', 'show_guest_requests', 'SELECT'),
  'DJ role has SELECT privilege on all four preference columns'
);
select ok(
  has_column_privilege('authenticated', 'public.rooms', 'surprise_mode', 'UPDATE')
  and has_column_privilege('authenticated', 'public.rooms', 'show_playlist', 'UPDATE')
  and has_column_privilege('authenticated', 'public.rooms', 'show_now_playing', 'UPDATE')
  and has_column_privilege('authenticated', 'public.rooms', 'show_guest_requests', 'UPDATE'),
  'DJ role has UPDATE privilege on all four preference columns'
);
select ok(not has_column_privilege('anon','public.rooms','surprise_mode','SELECT'), 'anon cannot read rooms table settings');
select ok(has_function_privilege('anon','public.room_by_code(text)','EXECUTE'), 'anon can use limited public lookup');
select ok((select prosecdef from pg_proc where oid='public.room_by_code(text)'::regprocedure), 'public lookup is security definer');
select ok((select 'search_path=""' = any(proconfig) from pg_proc where oid='public.room_by_code(text)'::regprocedure), 'public lookup locks search_path');
select ok(
  (select array_agg(parameter_name::text order by ordinal_position) = array[
    'code', 'name', 'status', 'surprise_mode', 'show_playlist', 'show_now_playing', 'show_guest_requests'
  ]::text[]
  from information_schema.parameters
  where specific_schema = 'public'
    and specific_name like 'room_by_code%'
    and parameter_mode = 'OUT'),
  'lookup exposes exactly the approved public room fields, with no administrative columns'
);
select ok((select column_default like '%true%' from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='surprise_mode'), 'surprise mode defaults on');
select ok((select column_default like '%false%' from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='show_playlist'), 'playlist visibility defaults off');
select ok((select column_default like '%true%' from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='show_now_playing'), 'now playing visibility defaults on');
select ok((select column_default like '%false%' from information_schema.columns where table_schema='public' and table_name='rooms' and column_name='show_guest_requests'), 'guest requests visibility defaults off');

select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}', true);
set local role authenticated;
select results_eq(
  $$select surprise_mode, show_playlist, show_now_playing, show_guest_requests from public.rooms where code = 'PREFS00001'$$,
  $$select true, false, true, false$$,
  'DJ reads own room preferences with expected defaults'
);
select is_empty(
  $$select id from public.rooms where code = 'PREFS00002'$$,
  'DJ cannot read another DJ room preferences'
);
select lives_ok(
  $$update public.rooms set show_playlist = true where code = 'PREFS00001'$$,
  'DJ can update own room preferences'
);
select is_empty(
  $$with updated as (update public.rooms set show_playlist = true where code = 'PREFS00002' returning id) select id from updated$$,
  'DJ cannot update another DJ room preferences'
);
reset role;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select throws_ok(
  $$select surprise_mode from public.rooms$$,
  '42501', null,
  'anonymous guest cannot read preferences directly from rooms'
);
select results_eq(
  $$select surprise_mode, show_playlist, show_now_playing, show_guest_requests from public.room_by_code('PREFS00001')$$,
  $$select true, true, true, false$$,
  'public lookup returns only the configured guest visibility preferences'
);
reset role;

select * from finish();
rollback;
