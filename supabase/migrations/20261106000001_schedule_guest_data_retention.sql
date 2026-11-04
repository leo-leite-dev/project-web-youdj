-- pg_cron is optional at migration/runtime boundaries. When the extension is
-- available, schedule hourly physical cleanup. The function itself is defined
-- and tested independently in the preceding migration.
do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') then
    execute 'create extension if not exists pg_cron';

    if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
      perform cron.unschedule(jobid)
        from cron.job
        where jobname = 'youdj-guest-data-retention';

      perform cron.schedule(
        'youdj-guest-data-retention',
        '0 * * * *',
        'select public.purge_expired_guest_data()'
      );
    end if;
  else
    raise notice 'pg_cron unavailable; guest data cleanup function is installed but not scheduled';
  end if;
end;
$$;
