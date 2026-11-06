-- Guests can read only requests for which they present the private receipt.
-- Raw receipt codes are hashed by the Pages Function and never reach this RPC.
create function public.guest_list_requests_by_receipt_hashes(
  p_room_code text,
  p_receipt_hashes text[]
)
returns table (
  title text,
  artist text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_room_code is null or upper(btrim(p_room_code)) !~ '^[A-Z0-9]{10}$'
    or p_receipt_hashes is null or cardinality(p_receipt_hashes) > 100
    or exists (
      select 1 from unnest(p_receipt_hashes) as hashes(receipt_hash)
      where receipt_hash is null or receipt_hash !~ '^[a-f0-9]{64}$'
    ) then
    raise exception 'invalid_request' using errcode = '22023';
  end if;

  return query
    select request.title, request.artist, request.status, request.created_at
    from public.guest_requests as request
    join public.rooms as room on room.id = request.room_id
    where room.code = upper(btrim(p_room_code))
      and request.private_code_hash = any(p_receipt_hashes)
      and request.created_at >= now() - interval '30 days'
      and request.status in ('pending', 'approved', 'rejected')
    order by request.created_at desc
    limit 100;
end;
$$;

revoke all on function public.guest_list_requests_by_receipt_hashes(text, text[])
  from public, anon, authenticated, service_role;
grant execute on function public.guest_list_requests_by_receipt_hashes(text, text[])
  to service_role;

comment on function public.guest_list_requests_by_receipt_hashes(text, text[]) is
  'Backend-only lookup of guest request status by room-scoped SHA-256 private receipt capabilities; limited to the 30-day retention window.';
