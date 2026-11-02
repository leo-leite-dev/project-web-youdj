-- Migration: create public.dj_profiles
-- Scope: initial DJ profile table with RLS and minimum privileges.
-- This migration is prepared locally and must not be applied remotely without authorization.

create table public.dj_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dj_profiles_display_name_check
    check (
      display_name = btrim(display_name, E' \t\n\r')
      and char_length(display_name) between 2 and 80
    )
);

comment on table public.dj_profiles is
  'Perfis de DJs vinculados a auth.users.';

comment on column public.dj_profiles.id is
  'Identificador do DJ; corresponde a auth.users.id.';

comment on column public.dj_profiles.display_name is
  'Nome público do DJ, com 2 a 80 caracteres e sem espaços em branco nas extremidades.';

comment on column public.dj_profiles.created_at is
  'Data de criação do perfil, gerada pelo banco.';

comment on column public.dj_profiles.updated_at is
  'Data da última atualização do perfil, mantida por trigger.';

create or replace function public.set_dj_profiles_updated_at()
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

comment on function public.set_dj_profiles_updated_at() is
  'Atualiza updated_at antes de cada alteração em public.dj_profiles.';

create trigger set_dj_profiles_updated_at
before update on public.dj_profiles
for each row
execute function public.set_dj_profiles_updated_at();

alter table public.dj_profiles enable row level security;

-- Remove os privilégios amplos do Supabase e concede apenas o necessário.
revoke all on table public.dj_profiles from anon, authenticated;

grant select (id, display_name, created_at, updated_at)
  on table public.dj_profiles
  to authenticated;

grant insert (id, display_name)
  on table public.dj_profiles
  to authenticated;

grant update (display_name)
  on table public.dj_profiles
  to authenticated;

create policy "DJs can read their own profile"
on public.dj_profiles
for select
to authenticated
using (
  auth.uid() = id
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);

create policy "DJs can create their own profile"
on public.dj_profiles
for insert
to authenticated
with check (
  auth.uid() = id
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);

create policy "DJs can update their own profile"
on public.dj_profiles
for update
to authenticated
using (
  auth.uid() = id
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
)
with check (
  auth.uid() = id
  and (auth.jwt() ->> 'is_anonymous')::boolean is false
);
