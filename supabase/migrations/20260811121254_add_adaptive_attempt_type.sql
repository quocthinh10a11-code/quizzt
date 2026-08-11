-- AI-03: make adaptive practice a first-class attempt type.
-- Existing rows are preserved; the default remains 'quiz'.
ALTER TABLE public.quiz_attempts
  DROP CONSTRAINT IF EXISTS quiz_attempts_type_check;

ALTER TABLE public.quiz_attempts
  ADD CONSTRAINT quiz_attempts_type_check
  CHECK (
    attempt_type = ANY (
      ARRAY[
        'quiz'::text,
        'bookmark'::text,
        'weak_topics'::text,
        'ai_generated'::text,
        'review_queue'::text,
        'adaptive'::text
      ]
    )
  );
