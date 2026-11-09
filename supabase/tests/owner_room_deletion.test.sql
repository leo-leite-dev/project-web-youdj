begin;
select plan(7);

insert into auth.users (instance_id,id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,is_anonymous)
values
 ('00000000-0000-0000-0000-000000000000','11111111-1111-4111-8111-111111111111','authenticated','authenticated','owner@example.test',now(),'{}','{}',false),
 ('00000000-0000-0000-0000-000000000000','22222222-2222-4222-8222-222222222222','authenticated','authenticated','other@example.test',now(),'{}','{}',false),
 ('00000000-0000-0000-0000-000000000000','33333333-3333-4333-8333-333333333333','authenticated','authenticated',null,null,'{"provider":"anonymous","providers":[]}','{}',true);
insert into public.dj_profiles (id, display_name) values
 ('11111111-1111-4111-8111-111111111111','Owner'),
 ('22222222-2222-4222-8222-222222222222','Other DJ');

insert into public.rooms (id,dj_id,name) values
 ('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','Room to delete'),
 ('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','Other room');
insert into public.guest_requests (id,room_id,dj_id,request_kind,title,artist,video_id,status)
values ('cccccccc-3333-4333-8333-333333333333','aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','youtube','Song','Artist','abcdefghijk','approved');
insert into public.room_music_queue (room_id,request_id,"position")
values ('aaaaaaaa-1111-4111-8111-111111111111','cccccccc-3333-4333-8333-333333333333',1);
insert into public.guest_presence (room_id,guest_id,guest_name)
values ('aaaaaaaa-1111-4111-8111-111111111111','dddddddd-4444-4444-8444-444444444444','Guest');

select ok(not has_table_privilege('authenticated','public.rooms','DELETE'), 'direct DELETE grant remains unavailable');
select ok(has_function_privilege('authenticated','public.dj_delete_room(uuid)','EXECUTE'), 'authenticated can call owner-checked RPC');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","is_anonymous":false}',true);
select throws_ok($$select public.dj_delete_room('aaaaaaaa-1111-4111-8111-111111111111')$$,'42501',null,'another DJ cannot delete the owner's room');
select set_config('request.jwt.claims','{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","is_anonymous":true}',true);
select throws_ok($$select public.dj_delete_room('aaaaaaaa-1111-4111-8111-111111111111')$$,'42501',null,'anonymous guests cannot delete rooms');
select set_config('request.jwt.claims','{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","is_anonymous":false}',true);
select is(public.dj_delete_room('aaaaaaaa-1111-4111-8111-111111111111'),true,'owner can delete own room');
reset role;

select ok(not exists (select 1 from public.rooms where id='aaaaaaaa-1111-4111-8111-111111111111')
  and not exists (select 1 from public.guest_requests where id='cccccccc-3333-4333-8333-333333333333')
  and not exists (select 1 from public.room_music_queue where room_id='aaaaaaaa-1111-4111-8111-111111111111')
  and not exists (select 1 from public.guest_presence where room_id='aaaaaaaa-1111-4111-8111-111111111111'),
  'room-owned requests, queue and presence are cascaded');
select ok(exists (select 1 from public.rooms where id='bbbbbbbb-2222-4222-8222-222222222222'), 'unrelated room remains untouched');

select * from finish();
rollback;
