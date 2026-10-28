-- Run only on the isolated restored project; never on Production with write privileges.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
SELECT current_database() AS database_name,current_setting('transaction_read_only') AS read_only;
SELECT relname,relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'sales_%' ORDER BY relname;
SELECT 'patient_identities' AS resource,count(*) AS row_count FROM public.sales_patient_identities
UNION ALL SELECT 'contacts',count(*) FROM public.sales_contacts
UNION ALL SELECT 'memberships',count(*) FROM public.sales_memberships
UNION ALL SELECT 'agreements',count(*) FROM public.sales_patient_agreement_acceptances
UNION ALL SELECT 'audit_events',count(*) FROM public.sales_history;
SELECT count(*) AS invalid_indexes FROM pg_index WHERE NOT indisvalid;
SELECT count(*) AS unvalidated_constraints FROM pg_constraint WHERE contype IN ('f','c') AND NOT convalidated;
SELECT count(*) AS browser_sales_table_grants FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname LIKE 'sales_%'
AND (has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE') OR has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE'));
ROLLBACK;
