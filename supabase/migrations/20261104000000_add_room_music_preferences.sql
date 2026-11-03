-- Preferências musicais por sala. A tabela rooms permanece privada; a RPC
-- pública retorna somente os quatro booleanos de apresentação.
alter table public.rooms
  add column surprise_mode boolean not null default true,
  add column show_playlist boolean not null default false,
  add column show_now_playing boolean not null default true,
  add column show_guest_requests boolean not null default false;

grant select (surprise_mode, show_playlist, show_now_playing, show_guest_requests)
  on table public.rooms to authenticated;
grant update (surprise_mode, show_playlist, show_now_playing, show_guest_requests)
  on table public.rooms to authenticated;

-- PostgreSQL does not allow changing a function's OUT columns with
-- CREATE OR REPLACE; recreate it with the intentionally expanded return set.
drop function public.room_by_code(text);

create or replace function public.room_by_code(p_code text)
returns table (
  code text, name text, status text,
  surprise_mode boolean, show_playlist boolean,
  show_now_playing boolean, show_guest_requests boolean
)
language sql stable security definer set search_path = ''
as $$
  select r.code, r.name, r.status, r.surprise_mode, r.show_playlist,
         r.show_now_playing, r.show_guest_requests
  from public.rooms as r
  where r.code = upper(btrim(p_code))
  limit 1;
$$;

comment on function public.room_by_code(text) is
  'Consulta pública limitada: retorna dados de sala e somente preferências de visibilidade do convidado.';
revoke execute on function public.room_by_code(text) from public, anon, authenticated;
grant execute on function public.room_by_code(text) to anon, authenticated;
