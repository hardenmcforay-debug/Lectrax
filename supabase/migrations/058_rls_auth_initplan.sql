-- RLS initplan: evaluate auth.uid() / auth.role() / is_platform_admin() /
-- get_my_role() once per statement instead of once per row.
-- Same permissions. Idempotent (already-wrapped calls are left alone).

CREATE OR REPLACE FUNCTION public._wrap_rls_auth_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  out text := expr;
BEGIN
  IF out IS NULL THEN
    RETURN NULL;
  END IF;

  -- Protect already-wrapped calls so a second run does not nest them.
  out := replace(out, '(select auth.uid())', '{{AUTH_UID}}');
  out := replace(out, '(SELECT auth.uid())', '{{AUTH_UID}}');
  out := replace(out, '(select auth.role())', '{{AUTH_ROLE}}');
  out := replace(out, '(SELECT auth.role())', '{{AUTH_ROLE}}');
  out := replace(out, '(select auth.jwt())', '{{AUTH_JWT}}');
  out := replace(out, '(SELECT auth.jwt())', '{{AUTH_JWT}}');
  out := replace(out, '(select auth.email())', '{{AUTH_EMAIL}}');
  out := replace(out, '(SELECT auth.email())', '{{AUTH_EMAIL}}');
  out := replace(out, '(select public.is_platform_admin())', '{{IS_ADMIN}}');
  out := replace(out, '(SELECT public.is_platform_admin())', '{{IS_ADMIN}}');
  out := replace(out, '(select is_platform_admin())', '{{IS_ADMIN_BARE}}');
  out := replace(out, '(select public.get_my_role())', '{{GET_ROLE}}');
  out := replace(out, '(SELECT public.get_my_role())', '{{GET_ROLE}}');
  out := replace(out, '(select get_my_role())', '{{GET_ROLE_BARE}}');

  out := replace(out, 'auth.uid()', '(select auth.uid())');
  out := replace(out, 'auth.role()', '(select auth.role())');
  out := replace(out, 'auth.jwt()', '(select auth.jwt())');
  out := replace(out, 'auth.email()', '(select auth.email())');
  out := replace(out, 'public.is_platform_admin()', '(select public.is_platform_admin())');
  out := replace(out, 'public.get_my_role()', '(select public.get_my_role())');

  -- Bare helper names only when not already schema-qualified / wrapped.
  out := replace(out, '{{IS_ADMIN}}', '(select public.is_platform_admin())');
  out := replace(out, '{{IS_ADMIN_BARE}}', '(select is_platform_admin())');
  out := replace(out, '{{GET_ROLE}}', '(select public.get_my_role())');
  out := replace(out, '{{GET_ROLE_BARE}}', '(select get_my_role())');
  out := replace(out, '{{AUTH_UID}}', '(select auth.uid())');
  out := replace(out, '{{AUTH_ROLE}}', '(select auth.role())');
  out := replace(out, '{{AUTH_JWT}}', '(select auth.jwt())');
  out := replace(out, '{{AUTH_EMAIL}}', '(select auth.email())');

  RETURN out;
END;
$$;

DO $$
DECLARE
  pol record;
  new_using text;
  new_check text;
  sql text;
BEGIN
  FOR pol IN
    SELECT
      n.nspname AS schemaname,
      c.relname AS tablename,
      p.polname AS policyname,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'storage')
  LOOP
    new_using := public._wrap_rls_auth_initplan(pol.qual);
    new_check := public._wrap_rls_auth_initplan(pol.with_check);

    IF new_using IS NOT DISTINCT FROM pol.qual
       AND new_check IS NOT DISTINCT FROM pol.with_check THEN
      CONTINUE;
    END IF;

    sql := format(
      'ALTER POLICY %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );

    IF new_using IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_using);
    END IF;

    IF new_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql;
  END LOOP;
END $$;

DROP FUNCTION public._wrap_rls_auth_initplan(text);
