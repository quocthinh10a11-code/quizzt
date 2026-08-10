-- Quizzt P0 RLS hardening review artifact
-- STATUS: REVIEW / MANUAL EXECUTION REQUIRED
-- This file is NOT a migration and has NOT been executed against production.
-- QA authorization is required before executing these statements in Supabase SQL Editor.

-- P0-1: prevent authenticated clients from updating profiles.role or any
-- other profile columns not explicitly required by the application.
REVOKE UPDATE ON public.profiles FROM authenticated;

GRANT UPDATE (username, daily_goal_questions)
ON public.profiles
TO authenticated;

-- P0-2: a user may insert questions only into a quiz they own.
DROP POLICY "Authenticated can insert questions"
ON public.questions;

CREATE POLICY "Users can insert questions into own quizzes"
ON public.questions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id
      AND quizzes.user_id = auth.uid()
  )
);

-- P0-3: a user may create a quiz only for their own authenticated user id.
DROP POLICY "Authenticated can insert quizzes"
ON public.quizzes;

CREATE POLICY "Users can insert own quizzes"
ON public.quizzes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Verification queries (read-only; execute after the changes if QA authorizes):
-- 1) Inspect effective table privileges for authenticated.
-- SELECT grantee, table_schema, table_name, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE grantee = 'authenticated'
--   AND table_schema = 'public'
--   AND table_name IN ('profiles', 'quizzes', 'questions')
-- ORDER BY table_name, privilege_type;
--
-- 2) Inspect the resulting policies.
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('profiles', 'quizzes', 'questions')
-- ORDER BY tablename, policyname;
