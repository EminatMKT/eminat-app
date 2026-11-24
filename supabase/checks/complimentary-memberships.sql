-- Read-only deployed-schema checks. Functional synthetic checks live in scripts/qa.
DO $$ BEGIN
 IF has_table_privilege('authenticated','public.sales_complimentary_benefits','SELECT')
 OR has_table_privilege('anon','public.sales_complimentary_benefits','SELECT')
 OR has_table_privilege('service_role','public.sales_complimentary_events','DELETE')
 OR has_function_privilege('service_role','public.native_sales_complimentary_activate(uuid,uuid,uuid)','EXECUTE')
 OR has_function_privilege('authenticated','public.native_sales_complimentary_redeem(uuid,uuid,text,boolean)','EXECUTE') THEN RAISE EXCEPTION 'COMPLIMENTARY_ACL_UNSAFE'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_memberships m WHERE funding_type='COMPLIMENTARY' AND
 (sales_payment_id IS NOT NULL OR amount<>0 OR payment_confirmed_at IS NOT NULL OR complimentary_benefit_id IS NULL)) THEN
 RAISE EXCEPTION 'COMPLIMENTARY_FINANCIAL_INVARIANT'; END IF;
END $$;
SELECT funding_type,count(*),sum(amount) FROM public.sales_memberships GROUP BY funding_type;
