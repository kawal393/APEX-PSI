ALTER TABLE public.ots_proofs
  ADD COLUMN IF NOT EXISTS confirmations integer,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_polled_at timestamptz;

UPDATE public.ots_proofs SET submitted_at = COALESCE(submitted_at, created_at);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('btc-anchor-poller') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'btc-anchor-poller');

SELECT cron.schedule(
  'btc-anchor-poller',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qhtntebpcribjiwrdtdd.supabase.co/functions/v1/btc-anchor-poller',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);