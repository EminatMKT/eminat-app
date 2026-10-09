-- pnpm supabase migration new patient_birthday_months  →  supabase/migrations/<timestamp>_patient_birthday_months.sql
--
-- IDEMPOTENT: this repo's workaround when the CLI's migration history drifts is to re-apply a
-- .sql file by hand via psql, so every object here is CREATE OR REPLACE.
--
-- Birthdays-by-month for the patient-registry dashboard. Month-of-birth can't be expressed as a
-- `.gte()/.lte()` range filter the way every other dashboard count is, since patients born in
-- different years share a month — so this is one aggregate query instead. No `SECURITY DEFINER`:
-- it runs as the calling user, same as the dashboard's other COUNT queries, so `pacientes`' own
-- RLS policy still decides who sees any rows at all.
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

-- `authenticated` only — same gating as every other RPC the browser client calls directly.
-- Both PUBLIC and anon are revoked explicitly: PUBLIC covers every role by default, but this
-- local dev database has shown anon with a stray direct grant before, so anon is named too.
REVOKE ALL ON FUNCTION public.patient_birthday_months() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.patient_birthday_months() FROM anon;
GRANT EXECUTE ON FUNCTION public.patient_birthday_months() TO authenticated;
