-- pgTAP security tests for public.rooms.
-- Run with: supabase test db
--
-- The tests set request.jwt.claims and switch to the anon/authenticated roles
-- so RLS is evaluated with representative JWT contexts.

begin;

select plan(33);

-- Fixtures: two DJs with profiles, one anonymous guest and one DJ without a profile.
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
  );

insert into public.dj_profiles (id, display_name)
values
  ('11111111-1111-1111-1111-111111111111', 'DJ Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'DJ Beta');

-- Rooms seeded as superuser so each DJ already owns data.
insert into public.rooms (dj_id, name)
values
  ('11111111-1111-1111-1111-111111111111', 'Festa Alpha'),
  ('22222222-2222-2222-2222-222222222222', 'Festa Beta');

-- Structural and privilege checks.
select ok(
  (select relrowsecurity from pg_class where oid = 'public.rooms'::regclass),
  'RLS is enabled on rooms'
);

select ok(
  not has_table_privilege('anon', 'public.rooms', 'SELECT')
  and not has_table_privilege('anon', 'public.rooms', 'INSERT')
  and not has_table_privilege('anon', 'public.rooms', 'UPDATE')
  and not has_table_privilege('anon', 'public.rooms', 'DELETE'),
  'anon has no table privileges on rooms'
);

select ok(
  not has_table_privilege('authenticated', 'public.rooms', 'DELETE'),
  'authenticated has no DELETE privilege on rooms'
);

select ok(
  has_column_privilege('authenticated', 'public.rooms', 'name', 'UPDATE')
  and has_column_privilege('authenticated', 'public.rooms', 'status', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.rooms', 'dj_id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.rooms', 'id', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.rooms', 'created_at', 'UPDATE')
  and not has_column_privilege('authenticated', 'public.rooms', 'updated_at', 'UPDATE'),
  'authenticated can only update name and status'
);

select ok(
  has_column_privilege('authenticated', 'public.rooms', 'dj_id', 'INSERT')
  and has_column_privilege('authenticated', 'public.rooms', 'name', 'INSERT')
  and not has_column_privilege('authenticated', 'public.rooms', 'status', 'INSERT')
  and not has_column_privilege('authenticated', 'public.rooms', 'id', 'INSERT')
  and not has_column_privilege('authenticated', 'public.rooms', 'created_at', 'INSERT')
  and not has_column_privilege('authenticated', 'public.rooms', 'updated_at', 'INSERT'),
  'authenticated can only insert dj_id and name'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.rooms'::regclass
      and tgname = 'set_rooms_updated_at'
      and not tgisinternal
  ),
  'updated_at trigger is installed'
);

select ok(
  exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'rooms'
      and indexname = 'rooms_dj_id_created_at_idx'
  ),
  'owner listing index is installed'
);

-- DJ A can manage only their own rooms.
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","is_anonymous":false}',
  true
);
set local role authenticated;

select results_eq(
  $$select name from public.rooms order by name$$,
  $$select 'Festa Alpha'::text$$,
  'DJ can read only their own rooms'
);

select is_empty(
  $$select id from public.rooms where dj_id = '22222222-2222-2222-2222-222222222222'$$,
  'DJ cannot read another DJ room'
);

select lives_ok(
  $$insert into public.rooms (dj_id, name)
    values ('11111111-1111-1111-1111-111111111111', 'Festa Nova')$$,
  'DJ can create their own room'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('22222222-2222-2222-2222-222222222222', 'Invasao')$$,
  '42501',
  null,
  'DJ cannot create a room for another DJ'
);

select lives_ok(
  $$update public.rooms
    set name = 'Festa Alpha Renomeada'
    where dj_id = '11111111-1111-1111-1111-111111111111' and name = 'Festa Alpha'$$,
  'DJ can rename their own room'
);

select is_empty(
  $$with updated as (
      update public.rooms
      set name = 'Hacked'
      where dj_id = '22222222-2222-2222-2222-222222222222'
      returning id
    )
    select id from updated$$,
  'DJ cannot update another DJ room'
);

select throws_ok(
  $$update public.rooms
    set dj_id = '22222222-2222-2222-2222-222222222222'
    where dj_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'DJ cannot transfer room ownership'
);

select throws_ok(
  $$delete from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111' and name = 'Festa Nova'$$,
  '42501',
  null,
  'DJ cannot delete rooms through the API'
);

select lives_ok(
  $$update public.rooms
    set status = 'paused'
    where dj_id = '11111111-1111-1111-1111-111111111111'
      and name = 'Festa Alpha Renomeada'$$,
  'DJ can change the status of their own room'
);

select results_eq(
  $$select status from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111'
      and name = 'Festa Alpha Renomeada'$$,
  $$select 'paused'::text$$,
  'status change is persisted'
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
  $$select id from public.rooms$$,
  'anonymous guest cannot read rooms'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('33333333-3333-3333-3333-333333333333', 'Guest Room')$$,
  '42501',
  null,
  'anonymous guest cannot create a room'
);

select is_empty(
  $$with updated as (
      update public.rooms
      set name = 'Hacked'
      where dj_id = '11111111-1111-1111-1111-111111111111'
      returning id
    )
    select id from updated$$,
  'anonymous guest cannot update a room'
);

select throws_ok(
  $$delete from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'anonymous guest cannot delete a room'
);

reset role;

-- Unauthenticated requests must have no access at all.
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;

select throws_ok(
  $$select id from public.rooms$$,
  '42501',
  null,
  'unauthenticated user cannot read rooms'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('33333333-3333-3333-3333-333333333333', 'Guest Room')$$,
  '42501',
  null,
  'unauthenticated user cannot create a room'
);

select throws_ok(
  $$update public.rooms
    set name = 'Hacked'
    where dj_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'unauthenticated user cannot update a room'
);

select throws_ok(
  $$delete from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'unauthenticated user cannot delete a room'
);

reset role;

-- Referential integrity, constraints and generated values.
select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('44444444-4444-4444-4444-444444444444', 'Sem Perfil')$$,
  '23503',
  null,
  'room requires a dj_profiles row'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('22222222-2222-2222-2222-222222222222', ' ')$$,
  '23514',
  null,
  'blank name is rejected'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name)
    values ('22222222-2222-2222-2222-222222222222', repeat('a', 61))$$,
  '23514',
  null,
  'name longer than 60 characters is rejected'
);

select throws_ok(
  $$insert into public.rooms (dj_id, name, status)
    values ('22222222-2222-2222-2222-222222222222', 'Festa Arquivada', 'archived')$$,
  '23514',
  null,
  'unknown status is rejected'
);

insert into public.rooms (dj_id, name)
values ('22222222-2222-2222-2222-222222222222', 'Festa Default');

select results_eq(
  $$select status from public.rooms where name = 'Festa Default'$$,
  $$select 'active'::text$$,
  'status defaults to active'
);

select results_eq(
  $$select created_at is not null, updated_at is not null
    from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111'
      and name = 'Festa Alpha Renomeada'$$,
  $$select true, true$$,
  'created_at and updated_at are generated by the database'
);

select throws_ok(
  $$insert into public.rooms (id, dj_id, name)
    values (
      (select id from public.rooms limit 1),
      '22222222-2222-2222-2222-222222222222',
      'Duplicada'
    )$$,
  '23505',
  null,
  'room id is unique'
);

delete from auth.users
where id = '11111111-1111-1111-1111-111111111111';

select is_empty(
  $$select id from public.rooms
    where dj_id = '11111111-1111-1111-1111-111111111111'$$,
  'rooms are deleted when the DJ account is deleted'
);

select * from finish();

rollback;
