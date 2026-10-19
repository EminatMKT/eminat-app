-- Run only after the reviewed Native Sales schema is verified in Production.
-- Replace the literal placeholder privately; never commit or log the filled copy.
-- This principal is for data import/reconciliation only, never Supabase db push.
BEGIN;
DO $$ BEGIN
  IF '<MIGRATION_PASSWORD>' = chr(60)||'MIGRATION_PASSWORD'||chr(62) THEN
    RAISE EXCEPTION 'PRIVATE_MIGRATION_PASSWORD_REQUIRED';
  END IF;
  IF to_regclass('public.sales_organizations') IS NULL OR
     to_regclass('public.sales_history') IS NULL THEN
    RAISE EXCEPTION 'NATIVE_SALES_SCHEMA_REQUIRED';
  END IF;
END $$;

CREATE ROLE lilly_sales_migrator LOGIN PASSWORD '<MIGRATION_PASSWORD>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT
  CONNECTION LIMIT 2;
GRANT CONNECT, TEMPORARY ON DATABASE postgres TO lilly_sales_migrator;
GRANT USAGE ON SCHEMA public, supabase_migrations TO lilly_sales_migrator;
GRANT SELECT ON public.usuarios,
  supabase_migrations.schema_migrations TO lilly_sales_migrator;

-- Explicit target list matches scripts/migration/sales_migration_common.py.
DO $$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'sales_organizations','sales_members','sales_teams','sales_team_members',
    'sales_pipelines','sales_stages','sales_leads','sales_accounts',
    'sales_contacts','sales_account_contacts','sales_opportunities',
    'sales_opportunity_contacts','sales_lead_conversions','sales_payments',
    'sales_memberships','sales_membership_periods','sales_household_members',
    'sales_activities','sales_meetings','sales_history'
  ] LOOP
    IF to_regclass(format('public.%I',target)) IS NULL THEN
      RAISE EXCEPTION 'NATIVE_SALES_TARGET_MISSING';
    END IF;
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.%I TO lilly_sales_migrator',target);
    IF (SELECT relrowsecurity FROM pg_class WHERE oid=format('public.%I',target)::regclass) THEN
      EXECUTE format('CREATE POLICY lilly_sales_migration_select ON public.%I FOR SELECT TO lilly_sales_migrator USING (true)',target);
      EXECUTE format('CREATE POLICY lilly_sales_migration_insert ON public.%I FOR INSERT TO lilly_sales_migrator WITH CHECK (true)',target);
      EXECUTE format('CREATE POLICY lilly_sales_migration_update ON public.%I FOR UPDATE TO lilly_sales_migrator USING (true) WITH CHECK (true)',target);
    END IF;
  END LOOP;
END $$;

-- Grant only sequences owned by one of the twenty target tables, if any.
DO $$ DECLARE seq record; BEGIN
  FOR seq IN
    SELECT DISTINCT ns.nspname AS schema_name, s.relname AS sequence_name
    FROM pg_class s JOIN pg_namespace ns ON ns.oid=s.relnamespace
    JOIN pg_depend d ON d.objid=s.oid AND d.deptype IN ('a','i')
    JOIN pg_class t ON t.oid=d.refobjid
    WHERE s.relkind='S' AND ns.nspname='public' AND t.relname = ANY(ARRAY[
      'sales_organizations','sales_members','sales_teams','sales_team_members',
      'sales_pipelines','sales_stages','sales_leads','sales_accounts',
      'sales_contacts','sales_account_contacts','sales_opportunities',
      'sales_opportunity_contacts','sales_lead_conversions','sales_payments',
      'sales_memberships','sales_membership_periods','sales_household_members',
      'sales_activities','sales_meetings','sales_history'])
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I.%I TO lilly_sales_migrator',seq.schema_name,seq.sequence_name);
  END LOOP;
END $$;
COMMIT;

-- Verification: all flags must be false except rolcanlogin; unrelated_writable=0.
SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
FROM pg_roles WHERE rolname='lilly_sales_migrator';
SELECT count(*) AS unrelated_writable
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('r','p')
  AND c.relname NOT LIKE 'sales\_%' ESCAPE '\'
  AND (has_table_privilege('lilly_sales_migrator',c.oid,'INSERT')
    OR has_table_privilege('lilly_sales_migrator',c.oid,'UPDATE')
    OR has_table_privilege('lilly_sales_migrator',c.oid,'DELETE'));
