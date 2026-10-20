-- Read-only Production gate for 20261020120000_patient_emc_sales_operations.sql.
-- Every boolean must be true before applying the migration.
SELECT
  EXISTS (SELECT 1 FROM public.sales_organizations WHERE
    id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND code='emc'
    AND name='Eminat Medical Center' AND status='active') AS emc_ready,
  EXISTS (SELECT 1 FROM public.sales_members WHERE
    id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad' AND
    organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND
    user_id='2344e112-76ef-42a8-ac56-7c488084e0f5' AND
    role='SUPERADMIN' AND status='pending') AS freddy_fallback_intact,
  EXISTS (SELECT 1 FROM public.sales_members WHERE
    organization_id='00b69cc1-d6f1-4972-9fab-d6aa02d611d7' AND
    user_id='2344e112-76ef-42a8-ac56-7c488084e0f5' AND
    role='SUPERADMIN' AND status='active') AS freddy_stratix_intact,
  (SELECT count(*) FROM public.usuarios WHERE activo AND
    (id,auth_id,lower(email)) IN (
      ('23dd1362-5648-49ab-853d-e08d123a1e00'::uuid,
       '23dd1362-5648-49ab-853d-e08d123a1e00'::uuid,'guisella@eminat.net'),
      ('fc914ab6-822f-457b-b9c0-315e2a7074fc'::uuid,
       'fc914ab6-822f-457b-b9c0-315e2a7074fc'::uuid,'gnegrete@eminat.net')))=2
    AS approved_sellers_match_auth,
  NOT EXISTS (SELECT 1 FROM public.sales_members WHERE
    organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND
    user_id IN ('23dd1362-5648-49ab-853d-e08d123a1e00',
                'fc914ab6-822f-457b-b9c0-315e2a7074fc')) AS seller_members_absent,
  NOT EXISTS (SELECT 1 FROM public.sales_teams WHERE
    organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND
    name='Corazón Salud Sales') AS team_name_available,
  NOT EXISTS (SELECT 1 FROM public.sales_pipelines WHERE
    organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND
    code='PATIENT_ENROLLMENT') AS pipeline_code_available,
  to_regclass('public.sales_patient_assignment_order') IS NULL AS assignment_table_absent,
  to_regclass('public.sales_patient_assignment_state') IS NULL AS assignment_state_absent,
  to_regprocedure('public.native_sales_patient_ensure_lead(uuid)') IS NULL
    AS lead_function_absent,
  NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
    AND ((table_name='sales_patient_identities' AND column_name='lead_id') OR
         (table_name='sales_patient_enrollment_intents' AND
          column_name IN ('opportunity_id','payment_link_reference'))))
    AS new_columns_absent;
