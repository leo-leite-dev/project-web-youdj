-- Migration: add public room codes and limited public lookup
-- Scope: unique shareable code per room plus a public RPC exposing only
-- code, name and status. Table policies remain unchanged.
-- This migration is prepared locally and must not be applied remotely without authorization.

-- Random 10-character code (A-Z0-9), uniform over 36^10 (~51.7 bits), derived
-- from 52 random bits in the core CSPRNG gen_random_uuid() with rejection
-- sampling. No extensions required.
create or replace function public.generate_room_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  max_value constant bigint := 3656158440062976; -- 36^10
  uuid_text text;
  random_hex text;
  value bigint := 0;
  nibble int;
  result text := '';
  i int;
begin
  loop
    uuid_text := replace(gen_random_uuid()::text, '-', '');
    -- Skip UUID version (nibble 13) and variant (nibble 17) bits; the first
    -- twelve hex digits and digit 14 provide 52 uniformly random bits.
    random_hex := substr(uuid_text, 1, 12) || substr(uuid_text, 14, 1);
    value := 0;

    for i in 1..13 loop
      nibble := position(substr(random_hex, i, 1) in '0123456789abcdef') - 1;
      value := value * 16 + nibble;
    end loop;

    exit when value < max_value;
  end loop;

  for i in 1..10 loop
    result := result || substr(alphabet, (value % 36)::int + 1, 1);
    value := value / 36;
  end loop;

  return result;
end;
$$;

comment on function public.generate_room_code() is
  'Gera um código público de sala de 10 caracteres (A-Z0-9), com ~51.7 bits de entropia e amostragem uniforme.';

-- Fills the code on insert when absent, retrying on the (unlikely) collision.
-- SECURITY DEFINER so the uniqueness check sees rows of every owner.
create or replace function public.set_rooms_public_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.code is null or btrim(new.code) = '' then
    loop
      new.code := public.generate_room_code();

      exit when not exists (
        select 1
        from public.rooms as r
        where r.code = new.code
      );
    end loop;
  end if;

  return new;
end;
$$;

comment on function public.set_rooms_public_code() is
  'Atribui um código único em public.rooms antes da inserção quando ausente.';

alter table public.rooms add column code text;

-- Preserve existing rooms: assign a unique code to every current row.
-- Disable only the updated_at trigger during this backfill so existing
-- timestamps stay unchanged; the exception block restores trigger state.
do $$
declare
  room_id uuid;
  candidate text;
begin
  alter table public.rooms disable trigger set_rooms_updated_at;

  for room_id in
    select id from public.rooms where code is null
  loop
    loop
      candidate := public.generate_room_code();

      exit when not exists (
        select 1
        from public.rooms as r
        where r.code = candidate
      );
    end loop;

    update public.rooms as r
      set code = candidate
      where r.id = room_id;
  end loop;

  alter table public.rooms enable trigger set_rooms_updated_at;
exception
  when others then
    alter table public.rooms enable trigger set_rooms_updated_at;
    raise;
end $$;

alter table public.rooms alter column code set not null;

alter table public.rooms
  add constraint rooms_code_key unique (code);

alter table public.rooms
  add constraint rooms_code_check check (code ~ '^[A-Z0-9]{10}$');

comment on column public.rooms.code is
  'Código público único da sala (10 caracteres A-Z0-9), gerado pelo banco; usado nos links e QR Codes.';

create trigger set_rooms_public_code
before insert on public.rooms
for each row
execute function public.set_rooms_public_code();

-- The owner reads the code; anonymous clients never touch the table.
grant select (code)
  on table public.rooms
  to authenticated;

-- Public point lookup: exactly code, name and status. No dj_id, no ids,
-- no timestamps, no listing (equality filter on the unique code only).
create or replace function public.room_by_code(p_code text)
returns table (code text, name text, status text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code, r.name, r.status
  from public.rooms as r
  where r.code = upper(btrim(p_code))
  limit 1;
$$;

comment on function public.room_by_code(text) is
  'Consulta pública limitada: retorna apenas code, name e status de uma sala pelo código.';

-- Least privilege: only the public lookup is executable by clients; the
-- helpers stay internal (trigger execution does not check EXECUTE at runtime).
revoke execute on function public.room_by_code(text) from public, anon, authenticated;
revoke execute on function public.generate_room_code() from public, anon, authenticated;
revoke execute on function public.set_rooms_public_code() from public, anon, authenticated;

grant execute on function public.room_by_code(text) to anon, authenticated;
