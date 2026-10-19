-- Atomic, idempotent native Lead creation. No ANNIE runtime dependency.
CREATE TABLE public.sales_write_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  actor_member_id uuid NOT NULL,
  operation text NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 8 AND 128),
  payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, actor_member_id) REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (organization_id, actor_member_id, operation, idempotency_key)
);
ALTER TABLE public.sales_write_operations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_write_operations FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON public.sales_write_operations TO service_role;

CREATE OR REPLACE FUNCTION public.native_sales_create_lead(
  p_organization_id uuid, p_actor_member_id uuid,
  p_display_name text, p_source text, p_email text, p_phone text,
  p_company_name text, p_owner_member_id uuid, p_team_id uuid,
  p_idempotency_key text, p_payload_hash text, p_request_id uuid
) RETURNS public.sales_leads
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_target public.sales_members%ROWTYPE;
DECLARE v_operation public.sales_write_operations%ROWTYPE;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_team_count integer;
DECLARE v_lead public.sales_leads%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  IF p_request_id IS NULL OR p_display_name IS NULL OR length(btrim(p_display_name)) NOT BETWEEN 1 AND 500
    OR p_source IS NULL OR length(btrim(p_source)) NOT BETWEEN 1 AND 500
    OR length(coalesce(p_email,'')) > 320 OR length(coalesce(p_phone,'')) > 80
    OR length(coalesce(p_company_name,'')) > 500
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE = '22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id = m.organization_id
    WHERE m.id = p_actor_member_id AND m.organization_id = p_organization_id
      AND m.status = 'active' AND o.status = 'active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE = '42501';
  END IF;
  v_owner := coalesce(p_owner_member_id, p_actor_member_id);
  IF v_owner <> p_actor_member_id AND v_actor.role NOT IN ('SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'REASSIGN_FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.sales_members
    WHERE id = v_owner AND organization_id = p_organization_id AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_NOT_ELIGIBLE' USING ERRCODE = '22023'; END IF;
  v_team := p_team_id;
  IF v_team IS NULL THEN
    SELECT count(*), (array_agg(team_id))[1] INTO v_team_count, v_team
      FROM public.sales_team_members WHERE organization_id = p_organization_id AND member_id = v_owner;
    IF v_team_count <> 1 THEN v_team := NULL; END IF;
  END IF;
  IF v_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    JOIN public.sales_teams t ON t.organization_id = tm.organization_id AND t.id = tm.team_id
    WHERE tm.organization_id = p_organization_id AND tm.member_id = v_owner
      AND tm.team_id = v_team AND t.active
  ) THEN RAISE EXCEPTION 'OWNER_TEAM_MISMATCH' USING ERRCODE = '22023'; END IF;
  IF v_actor.role IN ('SELLER','SALES_MANAGER') AND v_team IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id = p_organization_id AND tm.member_id = p_actor_member_id
      AND tm.team_id = v_team
  ) THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE = '42501'; END IF;
  IF v_actor.role = 'SALES_MANAGER' AND v_owner <> p_actor_member_id AND v_team IS NULL THEN
    RAISE EXCEPTION 'OWNER_OUT_OF_SCOPE' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.sales_write_operations (
    organization_id, actor_member_id, operation, idempotency_key, payload_hash)
    VALUES (p_organization_id, p_actor_member_id, 'lead.create', p_idempotency_key, p_payload_hash)
    ON CONFLICT (organization_id, actor_member_id, operation, idempotency_key) DO NOTHING;
  SELECT * INTO v_operation FROM public.sales_write_operations
    WHERE organization_id = p_organization_id AND actor_member_id = p_actor_member_id
      AND operation = 'lead.create' AND idempotency_key = p_idempotency_key FOR UPDATE;
  IF v_operation.payload_hash <> p_payload_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE = '23505';
  END IF;
  IF v_operation.record_id IS NOT NULL THEN
    SELECT * INTO v_lead FROM public.sales_leads
      WHERE organization_id = p_organization_id AND id = v_operation.record_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'OPERATION_INCOMPLETE' USING ERRCODE = 'P0001'; END IF;
    RETURN v_lead;
  END IF;
  INSERT INTO public.sales_leads (
    organization_id, owner_member_id, team_id, display_name, email, phone,
    company_name, source, created_by, updated_by)
    VALUES (p_organization_id, v_owner, v_team, btrim(p_display_name),
      nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''),
      nullif(btrim(p_company_name), ''), btrim(p_source),
      p_actor_member_id, p_actor_member_id)
    RETURNING * INTO v_lead;
  UPDATE public.sales_write_operations SET record_id = v_lead.id WHERE id = v_operation.id;
  INSERT INTO public.sales_history (organization_id, entity_type, record_id, actor_member_id,
    action, request_id, changes)
    VALUES (p_organization_id, 'lead', v_lead.id, p_actor_member_id,
      'created', p_request_id,
      jsonb_build_object('status', jsonb_build_object('to','NEW'),
        'ownerMemberId', jsonb_build_object('to',v_owner)));
  RETURN v_lead;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_create_lead(uuid,uuid,text,text,text,text,text,uuid,uuid,text,text,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_create_lead(uuid,uuid,text,text,text,text,text,uuid,uuid,text,text,uuid)
  TO service_role;
