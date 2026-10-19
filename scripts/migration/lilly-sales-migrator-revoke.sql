-- Run after cutover and final reconciliation. Revokes only migration-created access.
BEGIN;
DO $$ DECLARE target text; seq record; BEGIN
  FOREACH target IN ARRAY ARRAY[
    'sales_organizations','sales_members','sales_teams','sales_team_members',
    'sales_pipelines','sales_stages','sales_leads','sales_accounts',
    'sales_contacts','sales_account_contacts','sales_opportunities',
    'sales_opportunity_contacts','sales_lead_conversions','sales_payments',
    'sales_memberships','sales_membership_periods','sales_household_members',
    'sales_activities','sales_meetings','sales_history'
  ] LOOP
    IF to_regclass(format('public.%I',target)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS lilly_sales_migration_select ON public.%I',target);
      EXECUTE format('DROP POLICY IF EXISTS lilly_sales_migration_insert ON public.%I',target);
      EXECUTE format('DROP POLICY IF EXISTS lilly_sales_migration_update ON public.%I',target);
      EXECUTE format('REVOKE SELECT, INSERT, UPDATE ON TABLE public.%I FROM lilly_sales_migrator',target);
    END IF;
  END LOOP;
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
    EXECUTE format('REVOKE USAGE, SELECT ON SEQUENCE %I.%I FROM lilly_sales_migrator',seq.schema_name,seq.sequence_name);
  END LOOP;
END $$;
REVOKE SELECT ON public.usuarios,
  supabase_migrations.schema_migrations FROM lilly_sales_migrator;
REVOKE USAGE ON SCHEMA public,supabase_migrations FROM lilly_sales_migrator;
REVOKE CONNECT,TEMPORARY ON DATABASE postgres FROM lilly_sales_migrator;
DROP ROLE lilly_sales_migrator;
COMMIT;
