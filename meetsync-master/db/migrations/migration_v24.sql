-- migration_v24: webhook_logs TTL cleanup
--
-- Creates a function that deletes webhook_logs rows older than 90 days and
-- a pg_cron job that runs it nightly.  If pg_cron is not available the
-- function can be called manually or via an external scheduler.

-- Function: purge_old_webhook_logs
CREATE OR REPLACE FUNCTION purge_old_webhook_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Schedule nightly cleanup at 03:00 UTC if pg_cron extension is available.
-- Wrapped in a DO block so the migration succeeds even when pg_cron is absent.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Remove any pre-existing job with the same name before (re)scheduling.
        PERFORM cron.unschedule('purge_webhook_logs')
        WHERE EXISTS (
            SELECT 1 FROM cron.job WHERE jobname = 'purge_webhook_logs'
        );

        PERFORM cron.schedule(
            'purge_webhook_logs',
            '0 3 * * *',
            'SELECT purge_old_webhook_logs(90)'
        );
    END IF;
END;
$$;
