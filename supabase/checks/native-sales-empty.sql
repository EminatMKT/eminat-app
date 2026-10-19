-- New native Sales schema must be empty until a reviewed ANNIE migration and
-- explicit organization/identity bindings are approved. Browser roles cannot
-- access these tables or call privileged functions.
WITH native_tables AS (
  SELECT unnest(ARRAY[
    'sales_organizations','sales_teams','sales_members','sales_team_members',
    'sales_record_grants','sales_pipelines','sales_stages','sales_leads',
    'sales_contacts','sales_accounts','sales_account_contacts',
    'sales_opportunities','sales_opportunity_contacts','sales_lead_conversions',
    'sales_history','sales_activities','sales_meetings','sales_payments',
    'sales_memberships','sales_membership_periods','sales_household_members',
    'sales_family_requests','sales_renewal_requests','sales_report_schedules',
    'sales_report_deliveries','sales_lead_transition_rules',
    'sales_social_providers','sales_social_integrations','sales_social_accounts',
    'sales_social_assets','sales_social_conversations','sales_social_messages',
    'sales_social_comments','sales_social_webhook_receipts','sales_social_leads'
  ]) AS name
)
SELECT
  (SELECT count(*) = 0 FROM public.sales_organizations)
  AND (SELECT count(*) = 0 FROM public.sales_members)
  AND (SELECT count(*) = 0 FROM public.sales_leads)
  AND (SELECT count(*) = 0 FROM public.sales_memberships)
  AND (SELECT count(*) = 0 FROM public.sales_social_integrations)
  AND (SELECT count(*) = 1 FROM public.sales_social_providers WHERE code = 'META' AND NOT enabled)
  AND (SELECT bool_and(c.relrowsecurity AND
       NOT has_table_privilege('anon', c.oid, 'SELECT') AND
       NOT has_table_privilege('authenticated', c.oid, 'SELECT') AND
       NOT has_table_privilege('authenticated', c.oid, 'INSERT') AND
       NOT has_table_privilege('authenticated', c.oid, 'UPDATE') AND
       has_table_privilege('service_role', c.oid, 'SELECT'))
    FROM native_tables t JOIN pg_class c ON c.oid = format('public.%I', t.name)::regclass)
  AND NOT has_function_privilege('anon', 'public.native_sales_visible_leads(uuid,uuid,integer,integer,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.native_sales_visible_leads(uuid,uuid,integer,integer,text,text)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.native_sales_visible_leads(uuid,uuid,integer,integer,text,text)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.native_sales_transition_lead(uuid,uuid,uuid,integer,text,uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.native_sales_transition_lead(uuid,uuid,uuid,integer,text,uuid)', 'EXECUTE')
  AND NOT has_function_privilege('authenticated', 'public.native_sales_visible_crm(uuid,uuid,text,integer,integer,text,uuid)', 'EXECUTE')
  AND has_function_privilege('service_role', 'public.native_sales_visible_crm(uuid,uuid,text,integer,integer,text,uuid)', 'EXECUTE')
  AS safe_native_sales_schema;
