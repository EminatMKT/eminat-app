-- Preserve ANNIE origin-contact lineage and guard completed conversions.
ALTER TABLE public.sales_leads ADD COLUMN origin_contact_id uuid;
ALTER TABLE public.sales_leads ADD CONSTRAINT sales_leads_origin_contact_fk
  FOREIGN KEY (organization_id, origin_contact_id)
  REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT;

CREATE FUNCTION public.native_sales_guard_converted_lead() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.converted_at IS NOT NULL AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'CONVERTED_LEAD_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_leads_converted_immutable BEFORE UPDATE ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.native_sales_guard_converted_lead();

CREATE FUNCTION public.native_sales_convert_lead(
  p_organization_id uuid, p_actor_member_id uuid, p_lead_id uuid,
  p_expected_version integer, p_account_id uuid, p_account_name text,
  p_contact_id uuid, p_opportunity jsonb,
  p_idempotency_key text, p_payload_hash text, p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_origin public.sales_contacts%ROWTYPE;
DECLARE v_existing public.sales_lead_conversions%ROWTYPE;
DECLARE v_account_id uuid;
DECLARE v_contact_id uuid;
DECLARE v_opportunity_id uuid;
DECLARE v_stage public.sales_stages%ROWTYPE;
DECLARE v_allowed boolean;
DECLARE v_name text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1 OR p_request_id IS NULL
    OR p_lead_id IS NULL OR p_idempotency_key IS NULL
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$'
    OR (p_account_name IS NOT NULL AND length(btrim(p_account_name)) NOT BETWEEN 1 AND 500)
    OR (p_opportunity IS NOT NULL AND jsonb_typeof(p_opportunity) <> 'object') THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_lead FROM public.sales_leads
    WHERE organization_id=p_organization_id AND id=p_lead_id AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  v_allowed := v_actor.role IN ('ADMINISTRATOR','SUPERADMIN')
    OR v_lead.owner_member_id=p_actor_member_id
    OR (v_actor.role='SALES_MANAGER' AND EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_lead.team_id))
    OR EXISTS (SELECT 1 FROM public.sales_record_grants g
      WHERE g.organization_id=p_organization_id AND g.entity_type='lead'
        AND g.record_id=p_lead_id AND g.member_id=p_actor_member_id
        AND g.can_write AND g.revoked_at IS NULL);
  IF NOT v_allowed THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_existing FROM public.sales_lead_conversions
    WHERE organization_id=p_organization_id AND lead_id=p_lead_id;
  IF FOUND THEN
    IF v_existing.idempotency_key<>p_idempotency_key OR v_existing.payload_hash<>p_payload_hash THEN
      RAISE EXCEPTION 'LEAD_ALREADY_CONVERTED' USING ERRCODE='23505';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'accounts',1,0,NULL,v_existing.account_id))
      OR NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'contacts',1,0,NULL,v_existing.contact_id))
      OR (v_existing.opportunity_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.native_sales_visible_crm(
          p_organization_id,p_actor_member_id,'opportunities',1,0,NULL,v_existing.opportunity_id))) THEN
      RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
    END IF;
    RETURN jsonb_build_object('id',v_existing.id,'leadId',v_existing.lead_id,
      'accountId',v_existing.account_id,'contactId',v_existing.contact_id,
      'opportunityId',v_existing.opportunity_id,'replayed',true);
  END IF;
  IF v_lead.version<>p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF v_lead.converted_at IS NOT NULL OR v_lead.status IN ('LOST','NOT_INTERESTED','WON','CONVERTED') THEN
    RAISE EXCEPTION 'LEAD_NOT_CONVERTIBLE' USING ERRCODE='22023';
  END IF;
  IF v_lead.origin_contact_id IS NOT NULL AND p_contact_id IS NOT NULL
    AND p_contact_id<>v_lead.origin_contact_id THEN
    RAISE EXCEPTION 'ORIGIN_CONTACT_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF v_lead.origin_contact_id IS NOT NULL THEN
    SELECT * INTO v_origin FROM public.sales_contacts
      WHERE organization_id=p_organization_id AND id=v_lead.origin_contact_id AND archived_at IS NULL;
    IF NOT FOUND OR NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'contacts',1,0,NULL,v_lead.origin_contact_id)) THEN
      RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE='42501';
    END IF;
  END IF;
  v_account_id := coalesce(p_account_id,v_origin.primary_account_id);
  IF v_account_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'accounts',1,0,NULL,v_account_id)) THEN
      RAISE EXCEPTION 'ACCOUNT_NOT_AVAILABLE' USING ERRCODE='42501';
    END IF;
  ELSE
    v_name := coalesce(nullif(btrim(p_account_name),''),nullif(btrim(v_lead.company_name),''),v_lead.display_name);
    INSERT INTO public.sales_accounts
      (organization_id,owner_member_id,team_id,name,type,created_by,updated_by)
      VALUES (p_organization_id,v_lead.owner_member_id,v_lead.team_id,v_name,'prospect',
        p_actor_member_id,p_actor_member_id) RETURNING id INTO v_account_id;
    IF p_actor_member_id<>v_lead.owner_member_id THEN
      INSERT INTO public.sales_record_grants
        (organization_id,entity_type,record_id,member_id,can_write,granted_by)
        VALUES (p_organization_id,'account',v_account_id,p_actor_member_id,true,p_actor_member_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  v_contact_id := coalesce(v_lead.origin_contact_id,p_contact_id);
  IF v_contact_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.native_sales_visible_crm(
      p_organization_id,p_actor_member_id,'contacts',1,0,NULL,v_contact_id)) THEN
      RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE='42501';
    END IF;
  ELSE
    INSERT INTO public.sales_contacts
      (organization_id,owner_member_id,team_id,display_name,first_name,last_name,
       title,email,phone,address,description,date_of_birth,insurance,corazon_salud,
       plan,product,next_action,do_not_call,do_not_email,primary_account_id,created_by,updated_by)
      VALUES (p_organization_id,v_lead.owner_member_id,v_lead.team_id,v_lead.display_name,
        v_lead.first_name,v_lead.last_name,v_lead.title,v_lead.email,v_lead.phone,
        v_lead.address,v_lead.description,v_lead.date_of_birth,v_lead.insurance,
        v_lead.corazon_salud,v_lead.plan,v_lead.product,v_lead.next_action,
        v_lead.do_not_call,v_lead.do_not_email,v_account_id,p_actor_member_id,p_actor_member_id)
      RETURNING id INTO v_contact_id;
    IF p_actor_member_id<>v_lead.owner_member_id THEN
      INSERT INTO public.sales_record_grants
        (organization_id,entity_type,record_id,member_id,can_write,granted_by)
        VALUES (p_organization_id,'contact',v_contact_id,p_actor_member_id,true,p_actor_member_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  INSERT INTO public.sales_account_contacts(organization_id,account_id,contact_id,is_primary)
    VALUES (p_organization_id,v_account_id,v_contact_id,true)
    ON CONFLICT (organization_id,account_id,contact_id) DO UPDATE SET active=true;
  IF p_opportunity IS NOT NULL THEN
    IF NOT (p_opportunity ? 'name' AND p_opportunity ? 'currency' AND p_opportunity ? 'expectedCloseDate')
      OR length(btrim(coalesce(p_opportunity->>'name',''))) NOT BETWEEN 1 AND 500
      OR (p_opportunity->>'currency') !~ '^[A-Z]{3}$'
      OR (p_opportunity->>'expectedCloseDate') !~ '^\d{4}-\d{2}-\d{2}$'
      OR (p_opportunity ? 'amount' AND (p_opportunity->>'amount') !~ '^\d{1,16}(\.\d{1,2})?$') THEN
      RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
    END IF;
    SELECT s.* INTO v_stage FROM public.sales_stages s
      JOIN public.sales_pipelines p ON p.organization_id=s.organization_id AND p.id=s.pipeline_id
      WHERE s.organization_id=p_organization_id AND s.code='QUALIFIED' AND p.active
      ORDER BY p.created_at,p.id LIMIT 1;
    IF NOT FOUND THEN RAISE EXCEPTION 'PIPELINE_NOT_INITIALIZED' USING ERRCODE='P0001'; END IF;
    INSERT INTO public.sales_opportunities
      (organization_id,owner_member_id,team_id,name,account_id,primary_contact_id,
       stage_id,probability,currency,amount,expected_close_date,source,product,created_by,updated_by)
      VALUES (p_organization_id,v_lead.owner_member_id,v_lead.team_id,btrim(p_opportunity->>'name'),
        v_account_id,v_contact_id,v_stage.id,v_stage.probability,p_opportunity->>'currency',
        (p_opportunity->>'amount')::numeric,(p_opportunity->>'expectedCloseDate')::date,
        v_lead.source,v_lead.product,p_actor_member_id,p_actor_member_id)
      RETURNING id INTO v_opportunity_id;
    INSERT INTO public.sales_opportunity_contacts(organization_id,opportunity_id,contact_id)
      VALUES (p_organization_id,v_opportunity_id,v_contact_id);
    IF p_actor_member_id<>v_lead.owner_member_id THEN
      INSERT INTO public.sales_record_grants
        (organization_id,entity_type,record_id,member_id,can_write,granted_by)
        VALUES (p_organization_id,'opportunity',v_opportunity_id,p_actor_member_id,true,p_actor_member_id)
        ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  INSERT INTO public.sales_lead_conversions
    (organization_id,lead_id,account_id,contact_id,opportunity_id,idempotency_key,payload_hash)
    VALUES (p_organization_id,p_lead_id,v_account_id,v_contact_id,v_opportunity_id,
      p_idempotency_key,p_payload_hash) RETURNING * INTO v_existing;
  UPDATE public.sales_leads SET status='CONVERTED',converted_at=now(),
    converted_account_id=v_account_id,converted_contact_id=v_contact_id,
    converted_opportunity_id=v_opportunity_id,version=version+1,
    updated_by=p_actor_member_id,updated_at=now()
    WHERE organization_id=p_organization_id AND id=p_lead_id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'lead',p_lead_id,p_actor_member_id,'converted',p_request_id,
      jsonb_build_object('conversionId',v_existing.id,'accountId',v_account_id,
        'contactId',v_contact_id,'opportunityId',v_opportunity_id));
  RETURN jsonb_build_object('id',v_existing.id,'leadId',p_lead_id,
    'accountId',v_account_id,'contactId',v_contact_id,
    'opportunityId',v_opportunity_id,'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_convert_lead(uuid,uuid,uuid,integer,uuid,text,uuid,jsonb,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_convert_lead(uuid,uuid,uuid,integer,uuid,text,uuid,jsonb,text,text,uuid)
  TO service_role;
