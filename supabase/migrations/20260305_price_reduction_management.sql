-- Auto price reduction + property management company columns
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS auto_reduce_enabled       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reduce_amount        INTEGER,        -- dollars per reduction
  ADD COLUMN IF NOT EXISTS auto_reduce_interval_days INTEGER,        -- days between reductions
  ADD COLUMN IF NOT EXISTS auto_reduce_max_times     INTEGER,        -- max number of reductions
  ADD COLUMN IF NOT EXISTS auto_reduce_count         INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reduced_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_rent_monthly     INTEGER,        -- original price, set on first reduction
  ADD COLUMN IF NOT EXISTS management_company        TEXT;           -- e.g. "Four Star Realty"

-- TODO: Create a Supabase pg_cron job or edge function that runs daily to apply reductions:
--
--   UPDATE listings SET
--     original_rent_monthly = COALESCE(original_rent_monthly, rent_monthly),
--     rent_monthly = rent_monthly - auto_reduce_amount,
--     auto_reduce_count = auto_reduce_count + 1,
--     last_reduced_at = now()
--   WHERE auto_reduce_enabled = true
--     AND auto_reduce_count < auto_reduce_max_times
--     AND rent_monthly - auto_reduce_amount > 0
--     AND (last_reduced_at IS NULL
--          OR last_reduced_at + (auto_reduce_interval_days || ' days')::interval <= now());
