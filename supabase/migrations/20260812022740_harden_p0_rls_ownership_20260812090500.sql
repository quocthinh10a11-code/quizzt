-- P0 security hardening: lock profile updates and enforce quiz/question ownership.
-- No learning schema, data, or unrelated RLS policies are changed.

-- P0-1: authenticated clients must not update profiles.
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- P0-2: quiz ownership is enforced by the database.
DROP POLICY IF EXISTS "Authenticated can insert quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Users can insert own quizzes" ON public.quizzes;

CREATE POLICY "Users can insert own quizzes"
ON public.quizzes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- P0-3: questions may only be inserted into quizzes owned by the caller.
DROP POLICY IF EXISTS "Authenticated can insert questions" ON public.questions;
DROP POLICY IF EXISTS "Users can insert questions into own quizzes" ON public.questions;

CREATE POLICY "Users can insert questions into own quizzes"
ON public.questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quizzes
    WHERE public.quizzes.id = public.questions.quiz_id
      AND public.quizzes.user_id = auth.uid()
  )
);
