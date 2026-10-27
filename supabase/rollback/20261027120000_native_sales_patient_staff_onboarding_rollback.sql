-- Restore the previous link-eligibility policy only. No identities or records are removed.
CREATE OR REPLACE FUNCTION public.native_sales_patient_registration_can_recover(p_email text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 320 THEN
    RAISE EXCEPTION 'PATIENT_REGISTRATION_INVALID' USING ERRCODE = '22023';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users AS u
    WHERE lower(u.email) = lower(btrim(p_email))
      AND u.email_confirmed_at IS NULL
      AND u.raw_user_meta_data @> '{"corazon_patient_signup": true}'::jsonb
      AND NOT EXISTS (SELECT 1 FROM public.usuarios AS staff WHERE staff.auth_id = u.id)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_registration_can_recover(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_registration_can_recover(text) TO service_role;
