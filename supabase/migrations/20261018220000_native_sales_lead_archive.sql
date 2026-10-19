-- ANNIE-equivalent Lead archive/restore. Staff capability and scope are enforced
-- in the database; Seller requests never mutate archived state.
ALTER TABLE public.sales_leads ADD COLUMN archived_by uuid;
ALTER TABLE public.sales_leads ADD CONSTRAINT sales_leads_archived_by_fk
  FOREIGN KEY (organization_id, archived_by)
  REFERENCES public.sales_members(organization_id, id) ON DELETE RESTRICT;
CREATE INDEX sales_leads_archived_idx ON public.sales_leads
  (organization_id, archived_at DESC, id) WHERE archived_at IS NOT NULL;

CREATE FUNCTION public.native_sales_archive_lead(
  p_organization_id uuid, p_actor_member_id uuid, p_lead_id uuid,
  p_expected_version integer, p_reason text, p_restore boolean, p_request_id uuid
) RETURNS public.sales_leads
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_role text;
DECLARE v_before public.sales_leads%ROWTYPE;
DECLARE v_after public.sales_leads%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_expected_version < 1 OR p_request_id IS NULL OR p_restore IS NULL
    OR length(btrim(coalesce(p_reason,''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_organization_id AND m.id=p_actor_member_id
      AND m.status='active' AND o.status='active';
  IF v_role NOT IN ('SUPERADMIN','ADMINISTRATOR','SALES_MANAGER') OR v_role IS NULL THEN
    RAISE EXCEPTION 'ARCHIVE_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_leads
    WHERE organization_id=p_organization_id AND id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_role='SALES_MANAGER' AND v_before.owner_member_id<>p_actor_member_id AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
      AND tm.team_id=v_before.team_id
  ) THEN RAISE EXCEPTION 'ARCHIVE_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF v_before.version<>p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  IF (v_before.archived_at IS NOT NULL) IS DISTINCT FROM p_restore THEN
    RAISE EXCEPTION 'ARCHIVE_STATE_CONFLICT' USING ERRCODE='23514';
  END IF;
  UPDATE public.sales_leads SET archived_at=CASE WHEN p_restore THEN NULL ELSE now() END,
    archived_by=CASE WHEN p_restore THEN NULL ELSE p_actor_member_id END,
    version=version+1,updated_by=p_actor_member_id,updated_at=now()
    WHERE organization_id=p_organization_id AND id=p_lead_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history (organization_id,entity_type,record_id,actor_member_id,
    action,request_id,changes)
    VALUES (p_organization_id,'lead',p_lead_id,p_actor_member_id,
      CASE WHEN p_restore THEN 'restored' ELSE 'archived' END,p_request_id,
      jsonb_build_object('reason',btrim(p_reason),'archivedAt',jsonb_build_object(
        'from',v_before.archived_at,'to',v_after.archived_at)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_archive_lead(uuid,uuid,uuid,integer,text,boolean,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_archive_lead(uuid,uuid,uuid,integer,text,boolean,uuid)
  TO service_role;
