-- SELECT-only gate against isolated Supabase after all migrations.
SELECT
  (SELECT count(*) = 0 FROM public.annie_sales_tenant_mappings)
  AND (SELECT count(*) = 0 FROM public.annie_sales_user_mappings)
  AND (SELECT count(*) = 0 FROM public.role_modules WHERE module_slug = 'sales')
  AND (SELECT bool_and(relrowsecurity) FROM pg_class WHERE oid IN (
    'public.annie_sales_tenant_mappings'::regclass,
    'public.annie_sales_user_mappings'::regclass))
  AND NOT has_table_privilege('anon', 'public.annie_sales_tenant_mappings', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.annie_sales_tenant_mappings', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.annie_sales_user_mappings', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.annie_sales_user_mappings', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.annie_sales_user_mappings', 'UPDATE')
  AND has_table_privilege('service_role', 'public.annie_sales_tenant_mappings', 'SELECT')
  AND has_table_privilege('service_role', 'public.annie_sales_user_mappings', 'SELECT')
  AND NOT has_table_privilege('service_role', 'public.annie_sales_user_mappings', 'INSERT')
  AND NOT has_table_privilege('service_role', 'public.annie_sales_user_mappings', 'UPDATE')
  AS safe_empty_schema;
