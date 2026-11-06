-- Receipt capability lookup is room-scoped, backend-only and retention-bounded.
begin;
select plan(13);

insert into auth.users (
  instance_id, id, aud, role, email, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, is_anonymous
) values (
  '00000000-0000-0000-0000-000000000000',
  'a1111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'receipt-owner@example.test', now(),
  '{"provider":"email","providers":["email"]}', '{}'::jsonb, false
);
insert into public.dj_profiles (id, display_name)
values ('a1111111-1111-4111-8111-111111111111', 'DJ Receipt');
insert into public.rooms (id, dj_id, name, code, status) values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'Receipt A', 'MINE000001', 'active'),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'Receipt B', 'MINE000002', 'active');

insert into public.guest_requests (
  room_id, dj_id, request_kind, title, artist, status, created_at, private_code_hash
) values
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'manual', 'Pending Song', 'Artist A', 'pending', now() - interval '1 day', encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex')),
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'manual', 'Approved Song', 'Artist B', 'approved', now() - interval '2 days', encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex')),
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'manual', 'Rejected Song', 'Artist C', 'rejected', now() - interval '3 days', encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex')),
  ('b2222222-2222-4222-8222-222222222222', 'a1111111-1111-4111-8111-111111111111', 'manual', 'Other Room Song', 'Artist D', 'pending', now() - interval '1 day', encode(extensions.digest(repeat('d', 64), 'sha256'), 'hex')),
  ('b1111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111', 'manual', 'Expired Song', 'Artist E', 'approved', now() - interval '31 days', encode(extensions.digest(repeat('e', 64), 'sha256'), 'hex'));

select ok(not has_table_privilege('anon', 'public.guest_requests', 'SELECT'), 'guests still have no direct table read access');
select ok(has_function_privilege('service_role', 'public.guest_list_requests_by_receipt_hashes(text,text[])', 'EXECUTE'), 'backend can execute the private receipt lookup');
select ok(not has_function_privilege('anon', 'public.guest_list_requests_by_receipt_hashes(text,text[])', 'EXECUTE'), 'anon cannot execute the private receipt lookup');
select ok(not has_function_privilege('authenticated', 'public.guest_list_requests_by_receipt_hashes(text,text[])', 'EXECUTE'), 'authenticated clients cannot execute the private receipt lookup');

set local role service_role;
select is((
  select count(*)::integer
  from public.guest_list_requests_by_receipt_hashes(
    'MINE000001', array[
      encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'),
      encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex'),
      encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex'),
      encode(extensions.digest(repeat('d', 64), 'sha256'), 'hex'),
      encode(extensions.digest(repeat('e', 64), 'sha256'), 'hex')
    ]
  )
), 3, 'only matching receipt capabilities from this room and the last 30 days are returned');
select is((select status from public.guest_list_requests_by_receipt_hashes('MINE000001', array[encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex')])),'pending','pending status is reused from the request row');
select is((select status from public.guest_list_requests_by_receipt_hashes('MINE000001', array[encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex')])),'approved','approved status is reused from the request row');
select is((select status from public.guest_list_requests_by_receipt_hashes('MINE000001', array[encode(extensions.digest(repeat('c', 64), 'sha256'), 'hex')])),'rejected','rejected status is reused from the request row');
select is((select count(*)::integer from public.guest_list_requests_by_receipt_hashes('MINE000001', array[encode(extensions.digest(repeat('d', 64), 'sha256'), 'hex')])),0,'a receipt from another room cannot reveal that room request');
select is((select count(*)::integer from public.guest_list_requests_by_receipt_hashes('MINE000001', array[encode(extensions.digest(repeat('e', 64), 'sha256'), 'hex')])),0,'requests older than 30 days are not returned');
select is((select count(*)::integer from public.guest_list_requests_by_receipt_hashes('MINE000001', array[repeat('f', 64)])),0,'a guessed or unrelated receipt returns no request');
select throws_ok($$select * from public.guest_list_requests_by_receipt_hashes('bad', array[repeat('a', 64)])$$, '22023', null, 'invalid room codes are rejected');
select throws_ok($$select * from public.guest_list_requests_by_receipt_hashes('MINE000001', array['not-a-hash'])$$, '22023', null, 'malformed receipt hashes are rejected');
reset role;

select * from finish();
rollback;
