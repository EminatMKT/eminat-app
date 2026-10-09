-- This migration's version number was recorded as applied on the local dev database by an
-- earlier, interrupted attempt at this same change. Restored here (byte-for-byte same as
-- `20261008234622_patient_birthday_months.sql`, the authoritative migration) purely so
-- `supabase migration list`/`migration up` find a file for every applied version —
-- `CREATE OR REPLACE`/`REVOKE`/`GRANT` are all idempotent, so re-running this is a no-op.
CREATE OR REPLACE FUNCTION public.patient_birthday_months()
RETURNS TABLE (month int, count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT EXTRACT(MONTH FROM fecha_nacimiento)::int AS month, count(*)::bigint AS count
  FROM public.pacientes
  WHERE fecha_nacimiento IS NOT NULL
  GROUP BY 1
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.patient_birthday_months() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patient_birthday_months() FROM anon;
GRANT EXECUTE ON FUNCTION public.patient_birthday_months() TO authenticated;
