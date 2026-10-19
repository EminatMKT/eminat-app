-- STRATIX Native Sales pipeline configuration, after the reviewed 40 migrations.
-- Contains no customer, staff, membership, payment, or ANNIE import rows.
-- Stage codes, order, probability, and outcomes mirror ANNIE's verified
-- 202610100002_pipeline_normalization migration.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $pipeline$
DECLARE
  v_organization_id uuid;
  v_pipeline_id uuid;
  v_existing_count integer;
BEGIN
  SELECT id INTO v_organization_id
  FROM public.sales_organizations
  WHERE code = 'stratix' AND status = 'active'
  FOR UPDATE;
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'STRATIX_ACTIVE_SALES_ORGANIZATION_REQUIRED';
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.sales_pipelines WHERE organization_id = v_organization_id;
  IF v_existing_count > 1 THEN
    RAISE EXCEPTION 'UNEXPECTED_STRATIX_PIPELINES';
  END IF;

  SELECT id INTO v_pipeline_id
  FROM public.sales_pipelines
  WHERE organization_id = v_organization_id
    AND code = 'default' AND name = 'Sales Pipeline'
    AND active = true AND version = 1;

  IF v_pipeline_id IS NULL THEN
    IF v_existing_count <> 0 THEN
      RAISE EXCEPTION 'UNEXPECTED_STRATIX_PIPELINE';
    END IF;
    INSERT INTO public.sales_pipelines (organization_id, code, name)
    VALUES (v_organization_id, 'default', 'Sales Pipeline')
    RETURNING id INTO v_pipeline_id;
  END IF;

  SELECT count(*) INTO v_existing_count
  FROM public.sales_stages WHERE organization_id = v_organization_id;
  IF v_existing_count = 0 THEN
    INSERT INTO public.sales_stages
      (organization_id, pipeline_id, code, name, position, probability, outcome)
    VALUES
      (v_organization_id, v_pipeline_id, 'NEW', 'New', 10, 10, 'OPEN'),
      (v_organization_id, v_pipeline_id, 'CONTACTED', 'Contacted', 20, 15, 'OPEN'),
      (v_organization_id, v_pipeline_id, 'QUALIFIED', 'Qualified', 30, 20, 'OPEN'),
      (v_organization_id, v_pipeline_id, 'PROPOSAL', 'Proposal', 40, 50, 'OPEN'),
      (v_organization_id, v_pipeline_id, 'PAYMENT_PENDING', 'Payment pending', 50, 90, 'OPEN'),
      (v_organization_id, v_pipeline_id, 'WON', 'Won', 60, 100, 'WON'),
      (v_organization_id, v_pipeline_id, 'LOST', 'Lost', 70, 0, 'LOST');
  ELSE
    IF v_existing_count <> 7 OR EXISTS (
      SELECT expected.code, expected.name, expected.position,
        expected.probability, expected.outcome
      FROM (VALUES
        ('NEW', 'New', 10, 10, 'OPEN'),
        ('CONTACTED', 'Contacted', 20, 15, 'OPEN'),
        ('QUALIFIED', 'Qualified', 30, 20, 'OPEN'),
        ('PROPOSAL', 'Proposal', 40, 50, 'OPEN'),
        ('PAYMENT_PENDING', 'Payment pending', 50, 90, 'OPEN'),
        ('WON', 'Won', 60, 100, 'WON'),
        ('LOST', 'Lost', 70, 0, 'LOST')
      ) AS expected(code, name, position, probability, outcome)
      EXCEPT
      SELECT s.code, s.name, s.position, s.probability, s.outcome
      FROM public.sales_stages s
      WHERE s.organization_id = v_organization_id
        AND s.pipeline_id = v_pipeline_id
    ) THEN
      RAISE EXCEPTION 'UNEXPECTED_STRATIX_STAGES';
    END IF;
  END IF;
END;
$pipeline$;

COMMIT;
