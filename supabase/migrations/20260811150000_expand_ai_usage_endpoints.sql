-- AI-03: persist the isolated rate-limit namespace in ai_usage_log.
-- Preserve existing rows and RLS; only widen the endpoint CHECK constraint.
ALTER TABLE public.ai_usage_log
  DROP CONSTRAINT IF EXISTS ai_usage_log_endpoint_check;

ALTER TABLE public.ai_usage_log
  ADD CONSTRAINT ai_usage_log_endpoint_check
  CHECK (
    endpoint = ANY (
      ARRAY[
        'ask'::text,
        'recommend'::text,
        'insight'::text,
        'adaptive_practice'::text
      ]
    )
  );
