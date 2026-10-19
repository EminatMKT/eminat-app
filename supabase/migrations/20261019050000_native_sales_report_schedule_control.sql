-- Report scheduling remains disabled until an explicit mail mode is configured.
ALTER TABLE public.sales_report_schedules ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version>0);
ALTER TABLE public.sales_report_deliveries ADD COLUMN claim_id uuid;
ALTER TABLE public.sales_report_deliveries ADD COLUMN claimed_at timestamptz;
CREATE INDEX sales_report_delivery_claim_idx ON public.sales_report_deliveries
  (status,created_at,id) WHERE status='PENDING' AND claim_id IS NULL;

CREATE FUNCTION public.native_sales_report_schedules(
  p_organization_id uuid,p_actor_member_id uuid
) RETURNS SETOF jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  SELECT m.role INTO v_role FROM public.sales_members m JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR') OR v_role IS NULL THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT to_jsonb(s) FROM public.sales_report_schedules s
    WHERE s.organization_id=p_organization_id ORDER BY s.created_at DESC,s.id DESC;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_report_schedules(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_report_schedules(uuid,uuid) TO service_role;

CREATE FUNCTION public.native_sales_save_report_schedule(
  p_organization_id uuid,p_actor_member_id uuid,p_schedule_id uuid,
  p_expected_version integer,p_cadence text,p_recipient_roles text[],
  p_enabled boolean,p_request_id uuid
) RETURNS public.sales_report_schedules
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_role text;
DECLARE v_before public.sales_report_schedules%ROWTYPE;
DECLARE v_after public.sales_report_schedules%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_request_id IS NULL OR p_cadence NOT IN ('DAILY','WEEKLY') OR p_enabled IS NULL
    OR cardinality(p_recipient_roles) NOT BETWEEN 1 AND 3
    OR (SELECT count(DISTINCT role) FROM unnest(p_recipient_roles) AS role)<>cardinality(p_recipient_roles)
    OR EXISTS (SELECT 1 FROM unnest(p_recipient_roles) AS role
      WHERE role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER')) THEN
    RAISE EXCEPTION 'INVALID_REPORT_SCHEDULE' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR') OR v_role IS NULL THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF p_schedule_id IS NULL THEN
    IF p_expected_version IS NOT NULL THEN RAISE EXCEPTION 'INVALID_VERSION' USING ERRCODE='22023'; END IF;
    INSERT INTO public.sales_report_schedules
      (organization_id,report_code,cadence,timezone,recipient_roles,enabled,created_by)
      VALUES (p_organization_id,'SALES_SUMMARY',p_cadence,'America/Guayaquil',p_recipient_roles,p_enabled,p_actor_member_id)
      RETURNING * INTO v_after;
  ELSE
    IF p_expected_version IS NULL OR p_expected_version<1 THEN
      RAISE EXCEPTION 'INVALID_VERSION' USING ERRCODE='22023'; END IF;
    SELECT * INTO v_before FROM public.sales_report_schedules
      WHERE organization_id=p_organization_id AND id=p_schedule_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'REPORT_SCHEDULE_NOT_FOUND' USING ERRCODE='P0002'; END IF;
    IF v_before.version<>p_expected_version THEN
      RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001'; END IF;
    UPDATE public.sales_report_schedules SET cadence=p_cadence,recipient_roles=p_recipient_roles,
      enabled=p_enabled,version=version+1,updated_at=now()
      WHERE organization_id=p_organization_id AND id=p_schedule_id RETURNING * INTO v_after;
  END IF;
  INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'report_schedule',v_after.id,p_actor_member_id,
      CASE WHEN p_schedule_id IS NULL THEN 'created' ELSE 'updated' END,p_request_id,
      jsonb_build_object('cadence',p_cadence,'recipientRoles',p_recipient_roles,'enabled',p_enabled));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_save_report_schedule(uuid,uuid,uuid,integer,text,text[],boolean,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_save_report_schedule(uuid,uuid,uuid,integer,text,text[],boolean,uuid)
  TO service_role;
