# Quizzt P0 RLS Security Test Plan

## Purpose

Verify the three QA-confirmed P0 authorization findings after the SQL in `P0-RLS-hardening.sql` has been manually reviewed and executed in Supabase.

**Current status:** Database/RLS runtime verification is **NOT VERIFIED**. The SQL artifact has not been executed against production.

**Developer static status:** SQL scope matches the QA-authorized P0-1/P0-2/P0-3 changes. No application-code change is required by the inspected create-quiz/question flows.

## Preconditions

- Use two authenticated test accounts: User A and User B.
- User B owns at least one quiz containing at least one question.
- User A is a normal authenticated user, not an admin.
- An existing trusted admin account is available for the admin regression check.
- Run the negative/positive cases under the actual authenticated user contexts; do not use service-role credentials for authorization verification.

## TC-P0-01 — Prevent profile role escalation

**Actor:** Normal User A

Attempt:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE id = auth.uid();
```

**Expected:** `REJECT`

**Security property:** A normal authenticated user cannot elevate their database role by updating `profiles.role`.

## TC-P0-02 — Prevent cross-user question insertion

**Actor:** User A

Attempt to insert a question whose `quiz_id` belongs to User B:

```sql
INSERT INTO public.questions (quiz_id, content, options, correct_index)
VALUES (<quiz_id_owned_by_user_b>, 'RLS test', ARRAY['A','B'], 0);
```

**Expected:** `REJECT`

**Security property:** A user cannot insert questions into another user's quiz.

## TC-P0-03 — Prevent quiz ownership spoofing

**Actor:** User A

Attempt:

```sql
INSERT INTO public.quizzes (title, user_id)
VALUES ('RLS ownership test', <user_b_id>);
```

**Expected:** `REJECT`

**Security property:** A user cannot create a quiz owned by another user.

## TC-P0-04 — Allow own quiz creation

**Actor:** User A

Attempt to create a quiz with:

```text
user_id = auth.uid()
```

Equivalent SQL shape:

```sql
INSERT INTO public.quizzes (title, user_id)
VALUES ('RLS own quiz test', auth.uid());
```

**Expected:** `ALLOW`

**Security property:** The legitimate create-quiz workflow remains available.

## TC-P0-05 — Allow question insertion into own quiz

**Actor:** User A

Insert a question into a quiz owned by User A.

```sql
INSERT INTO public.questions (quiz_id, content, options, correct_index)
VALUES (<quiz_id_owned_by_user_a>, 'RLS own question test', ARRAY['A','B'], 0);
```

**Expected:** `ALLOW`

**Security property:** The legitimate question-creation workflow remains available.

## TC-P0-06 — Admin workflow regression

**Actor:** Existing trusted admin account

Open `/admin` and exercise the currently supported admin workflow.

**Expected:** `ALLOW`

**Security property:** Admin access continues to depend on trusted database state (`profiles.role = 'admin'`), not on client-side mutation of the role.

## P0-1 privilege inspection

After QA authorizes SQL execution, inspect the effective table privileges for `authenticated` and confirm that broad `UPDATE` on `public.profiles` is absent while the required column-level privileges remain available.

Suggested read-only query:

```sql
SELECT grantee, table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
  AND table_name IN ('profiles', 'quizzes', 'questions')
ORDER BY table_name, privilege_type;
```

Then inspect policies:

```sql
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'quizzes', 'questions')
ORDER BY tablename, policyname;
```

## Result recording

Record each test as one of:

- `PASS` — actual authenticated runtime test produced the expected result.
- `FAIL` — actual authenticated runtime test contradicted the expected result.
- `NOT VERIFIED` — the test was not executed.

Do not mark a case `PASS` from static inspection alone.
