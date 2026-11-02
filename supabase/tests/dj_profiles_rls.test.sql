-- pgTAP security tests for public.dj_profiles.
-- Run with: supabase test db
--
-- The tests set request.jwt.claims and switch to the anon/authenticated roles
-- so RLS is evaluated with representative JWT contexts.

begin;

select plan(28);

-- Fixtures: DJs, one anonymous guest, and users without profiles.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'dj-a@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'dj-b@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    null,
    null,
    '{"provider":"anonymous","providers":[]}'::jsonb,
    '{}'::jsonb,
    true
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'dj-c@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-5555-5555-5555-555555555555',
    'authenticated',
    'authenticated',
    'dj-d@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'dj-e@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '77777777-7777-7777-7777-777777777777',
    'authenticated',
    'authenticated',
    'dj-f@example.test',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    false
  );

-- Profiles used for read/update/cascade tests.
insert into public.dj_profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'DJ Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'DJ Beta'),
  ('55555555-5555-5555-5555-555555555555', 'DJ Delta');

-- Structural and privilege checks.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.dj_profiles'::regclass),
  'RLS is enabled on dj_profiles'
);

select ok(
  not has_table_privilege('anon', 'public.dj_profiles', 'SELECT')
  and not has_table_privilege('anon', 'public.dj_profiles', 'INSERT')
  and not has_table_privilege('anon', 'public.dj_profiles', 'UPDATE')
  and not has_table_privilege('anon', 'public.dj_profiles', 'DELETE'),
  'anon has no table privileges on dj_profiles'
);

select ok(
  not has_table_privilege('authenticated', 'public.dj_profiles', 'DELETE'),
  'authenticated has no DELETE privilege on dj_profiles'
);

select ok(
  has_column_privilege('authenticated', 'public.dj_profiles', 'display_name', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.dj_profiles', 'id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.dj_profiles', 'created_at', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.dj_profiles', 'updated_at', 'UPDATE'),
  'authenticated can only update display_name'
);

select ok(
  has_column_privilege('authenticated', 'public.dj_profiles', 'id', 'INSERT')
  and has_column_privilege('authenticated', 'public.dj_profiles', 'display_name', 'INSERT')
  and not has_column_privilege('authenticated', 'public.dj_profiles', 'created_at', 'INSERT')
  and not has_column_privilege('authenticated', 'public.dj_profiles', 'updated_at', 'INSERT'),
  'authenticated can only insert id and display_name'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.dj_profiles'::regclass
      and tgname = 'set_dj_profiles_updated_at'
      and not tgisinternal
  ),
  'updated_at trigger is installed'
);

-- DJ A can read only their own profile.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select id, display_name from public.dj_profiles order by id$$,
  $$select '11111111-1111-1111-1111-111111111111'::uuid, 'DJ Alpha'::text$$,
  'DJ can read own profile'
);

select is_empty(
  $$select id from public.dj_profiles where id = '22222222-2222-2222-2222-222222222222'$$,
  'DJ cannot read another DJ profile'
);

reset role;

-- DJ C can create only their own profile.
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('44444444-4444-4444-4444-444444444444', 'DJ Gamma')$$,
  'DJ can create own profile'
);

select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('77777777-7777-7777-7777-777777777777', 'Impostor')$$,
  '42501',
  null,
  'DJ cannot create a profile for another user'
);

reset role;

-- DJ A can update only the allowed field of their own profile.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select lives_ok(
  $$update public.dj_profiles
    set display_name = 'DJ Alpha Updated'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  'DJ can update own display_name'
);

select results_eq(
  $$select display_name from public.dj_profiles
    where id = '11111111-1111-1111-1111-111111111111'$$,
  $$select 'DJ Alpha Updated'::text$$,
  'DJ update is persisted'
);

select is_empty(
  $$with updated as (
      update public.dj_profiles
      set display_name = 'Hacked'
      where id = '22222222-2222-2222-2222-222222222222'
      returning id
    )
    select id from updated$$,
  'DJ cannot update another DJ profile'
);

select throws_ok(
  $$update public.dj_profiles
    set id = '22222222-2222-2222-2222-222222222222'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'DJ cannot transfer profile ownership'
);

select throws_ok(
  $$delete from public.dj_profiles
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'DJ cannot delete profile through the API'
);

reset role;

-- Anonymous guests use the authenticated role but must be blocked by is_anonymous.
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated","is_anonymous":true}',
  true
);
set local role authenticated;

select is_empty(
  $$select id from public.dj_profiles$$,
  'anonymous guest cannot read DJ profiles'
);

select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('33333333-3333-3333-3333-333333333333', 'Guest')$$,
  '42501',
  null,
  'anonymous guest cannot create a DJ profile'
);

select is_empty(
  $$with updated as (
      update public.dj_profiles
      set display_name = 'Guest'
      where id = '11111111-1111-1111-1111-111111111111'
      returning id
    )
    select id from updated$$,
  'anonymous guest cannot update a DJ profile'
);

select throws_ok(
  $$delete from public.dj_profiles
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'anonymous guest cannot delete a DJ profile'
);

reset role;

-- Unauthenticated requests must have no access at all.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$select id from public.dj_profiles$$,
  '42501',
  null,
  'unauthenticated user cannot read DJ profiles'
);

select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('33333333-3333-3333-3333-333333333333', 'Guest')$$,
  '42501',
  null,
  'unauthenticated user cannot create a DJ profile'
);

select throws_ok(
  $$update public.dj_profiles
    set display_name = 'Guest'
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'unauthenticated user cannot update a DJ profile'
);

select throws_ok(
  $$delete from public.dj_profiles
    where id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'unauthenticated user cannot delete a DJ profile'
);

reset role;

-- Referential integrity and cascade behavior.
select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('99999999-9999-9999-9999-999999999999', 'Orphan')$$,
  '23503',
  null,
  'profile requires an auth.users row'
);

delete from auth.users
where id = '55555555-5555-5555-5555-555555555555';

select is_empty(
  $$select id from public.dj_profiles
    where id = '55555555-5555-5555-5555-555555555555'$$,
  'profile is deleted when auth user is deleted'
);

-- Display name constraints and generated timestamps.
select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('66666666-6666-6666-6666-666666666666', ' ')$$,
  '23514',
  null,
  'blank display_name is rejected'
);

select throws_ok(
  $$insert into public.dj_profiles (id, display_name)
    values ('66666666-6666-6666-6666-666666666666', repeat('a', 81))$$,
  '23514',
  null,
  'display_name longer than 80 characters is rejected'
);

select results_eq(
  $$select created_at is not null, updated_at is not null
    from public.dj_profiles
    where id = '44444444-4444-4444-4444-444444444444'$$,
  $$select true, true$$,
  'created_at and updated_at are generated by the database'
);

select * from finish();

rollback;
