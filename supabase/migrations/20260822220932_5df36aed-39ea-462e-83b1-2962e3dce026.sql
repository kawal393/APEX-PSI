SELECT cron.unschedule('crypto-watcher') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crypto-watcher');

SELECT cron.schedule(
  'crypto-watcher',
  '*/3 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/crypto-watcher',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);