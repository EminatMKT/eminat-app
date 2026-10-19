-- Corazón Salud commercial price catalog, sourced from the verified ANNIE
-- Kit de Ventas v3. Historical 2M remains in membership records but is absent
-- from this new-sale quote function.
CREATE TABLE public.sales_membership_price_catalog (
  plan text PRIMARY KEY CHECK (plan IN ('ESSENTIAL','PLUS','MAX')),
  individual_monthly_cents integer NOT NULL CHECK (individual_monthly_cents >= 0),
  family_monthly_cents integer NOT NULL CHECK (family_monthly_cents >= 0),
  visit_fee_cents integer NOT NULL CHECK (visit_fee_cents >= 0),
  visits_2m integer NOT NULL CHECK (visits_2m >= 0),
  visits_3m integer NOT NULL CHECK (visits_3m >= 0),
  visits_6m integer NOT NULL CHECK (visits_6m >= 0),
  visits_12m integer NOT NULL CHECK (visits_12m >= 0),
  source_ref text NOT NULL
);
INSERT INTO public.sales_membership_price_catalog VALUES
 ('ESSENTIAL',4999,8999,2500,2,2,3,4,'Corazón Salud Kit de Ventas v3'),
 ('PLUS',6999,10999,1500,2,2,4,6,'Corazón Salud Kit de Ventas v3'),
 ('MAX',8999,13999,0,2,2,4,8,'Corazón Salud Kit de Ventas v3');
ALTER TABLE public.sales_membership_price_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_membership_price_catalog FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.sales_membership_price_catalog TO service_role;

CREATE FUNCTION public.native_sales_membership_quote(
  p_plan text, p_type text, p_duration text
) RETURNS TABLE (
  monthly_cents integer, total_cents integer, visit_fee_cents integer,
  included_visits integer, initial_months integer
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_rule public.sales_membership_price_catalog%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_type IS NULL OR p_duration IS NULL OR
    p_type NOT IN ('INDIVIDUAL','FAMILY') OR p_duration NOT IN ('MONTHLY','3M','6M','12M') THEN
    RAISE EXCEPTION 'INVALID_MEMBERSHIP_QUOTE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_rule FROM public.sales_membership_price_catalog WHERE plan=p_plan;
  IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_MEMBERSHIP_QUOTE' USING ERRCODE='22023'; END IF;
  initial_months := CASE p_duration WHEN 'MONTHLY' THEN 2 WHEN '3M' THEN 3 WHEN '6M' THEN 6 ELSE 12 END;
  monthly_cents := CASE p_type WHEN 'FAMILY' THEN v_rule.family_monthly_cents
    ELSE v_rule.individual_monthly_cents END + CASE WHEN p_duration='MONTHLY' THEN 1000 ELSE 0 END;
  total_cents := monthly_cents * initial_months;
  visit_fee_cents := v_rule.visit_fee_cents;
  included_visits := CASE p_duration WHEN 'MONTHLY' THEN v_rule.visits_2m
    WHEN '3M' THEN v_rule.visits_3m WHEN '6M' THEN v_rule.visits_6m ELSE v_rule.visits_12m END;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_membership_quote(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_membership_quote(text,text,text) TO service_role;
