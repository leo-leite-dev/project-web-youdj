-- Migration: create public.rooms
-- Scope: DJ-owned rooms with RLS and minimum privileges.
-- This migration is prepared locally and must not be applied remotely without authorization.

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  dj_id uuid not null references public.dj_profiles (id) on delete cascade,
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rooms_name_check
    check (
      name = btrim(name, E' \t\n\r')
      and char_length(name) between 2 and 60
    ),
  constraint rooms_status_check
    check (status in ('active', 'paused'))
);

comment on table public.rooms is
  'Salas de eventos pertencentes a um DJ.';

comment on column public.rooms.id is
  'Identificador único da sala, gerado pelo banco.';

comment on column public.rooms.dj_id is
  'DJ proprietário da sala; corresponde a dj_profiles.id.';

comment on column public.rooms.name is
  'Nome da sala, com 2 a 60 caracteres e sem espaços em branco nas extremidades.';

comment on column public.rooms.status is
  'Status da sala: active ou paused.';

comment on column public.rooms.created_at is
  'Data de criação da sala, gerada pelo banco.';

comment on column public.rooms.updated_at is
  'Data da última atualização da sala, mantida por trigger.';

create or replace function public.set_rooms_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_rooms_updated_at() is
  'Atualiza updated_at antes de cada alteração em public.rooms.';

create trigger set_rooms_updated_at
before update on public.rooms
for each row
execute function public.set_rooms_updated_at();

create index rooms_dj_id_created_at_idx
  on public.rooms (dj_id, created_at desc);

alter table public.rooms enable row level security;

-- Remove os privilégios amplos do Supabase e concede apenas o necessário.
revoke all on table public.rooms from anon, authenticated;

grant select (id, dj_id, name, status, created_at, updated_at)
  on table public.rooms
  to authenticated;

grant insert (dj_id, name)
  on table public.rooms
  to authenticated;

grant update (name, status)
  on table public.rooms
  to authenticated;

create policy "DJs can read their own rooms"
on public.rooms
for select
to authenticated
using (
  dj_id = auth.uid()
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);

create policy "DJs can create their own rooms"
on public.rooms
for insert
to authenticated
with check (
  dj_id = auth.uid()
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);

create policy "DJs can update their own rooms"
on public.rooms
for update
to authenticated
using (
  dj_id = auth.uid()
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
)
with check (
  dj_id = auth.uid()
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);
