-- Commercial email uses the existing activity timeline. A claimed send is
-- never automatically retried after an ambiguous provider outcome.
ALTER TABLE public.sales_activities ADD COLUMN email_payload_hash text;

CREATE FUNCTION public.native_sales_queue_email(
  p_organization_id uuid,p_actor_member_id uuid,p_resource text,p_record_id uuid,
  p_subject text,p_body text,p_idempotency_key text,p_payload_hash text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_parent jsonb;
DECLARE v_recipient text;
DECLARE v_suppressed boolean;
DECLARE v_existing public.sales_activities%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_resource NOT IN ('leads','contacts','accounts')
    OR p_record_id IS NULL OR p_subject IS NULL OR length(btrim(p_subject)) NOT BETWEEN 1 AND 240
    OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 20000
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_actor FROM public.sales_members
    WHERE organization_id=p_organization_id AND id=p_actor_member_id AND status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  SELECT row INTO v_parent FROM public.native_sales_visible_crm(
    p_organization_id,p_actor_member_id,p_resource,1,0,NULL,p_record_id) AS row;
  IF v_parent IS NULL THEN RAISE EXCEPTION 'PARENT_NOT_AVAILABLE' USING ERRCODE='42501'; END IF;
  IF v_actor.role='SELLER' AND (v_parent->>'owner_member_id')::uuid<>p_actor_member_id THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  IF v_actor.role='SALES_MANAGER' AND (v_parent->>'owner_member_id')::uuid<>p_actor_member_id
    AND NOT EXISTS (SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
        AND tm.team_id=(v_parent->>'team_id')::uuid) THEN
    RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  IF p_resource='leads' THEN
    SELECT email,do_not_email INTO v_recipient,v_suppressed FROM public.sales_leads
      WHERE organization_id=p_organization_id AND id=p_record_id AND archived_at IS NULL;
  ELSIF p_resource='contacts' THEN
    SELECT email,do_not_email INTO v_recipient,v_suppressed FROM public.sales_contacts
      WHERE organization_id=p_organization_id AND id=p_record_id AND archived_at IS NULL;
  ELSE
    SELECT email,false INTO v_recipient,v_suppressed FROM public.sales_accounts
      WHERE organization_id=p_organization_id AND id=p_record_id AND archived_at IS NULL;
  END IF;
  IF v_suppressed OR v_recipient IS NULL OR v_recipient !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'EMAIL_RECIPIENT_UNAVAILABLE' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_existing FROM public.sales_activities
    WHERE organization_id=p_organization_id AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF v_existing.kind<>'EMAIL' OR v_existing.actor_member_id<>p_actor_member_id
      OR v_existing.email_payload_hash<>p_payload_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
    END IF;
    RETURN to_jsonb(v_existing) || jsonb_build_object('replayed',true);
  END IF;
  INSERT INTO public.sales_activities
    (organization_id,kind,title,body,status,actor_member_id,assignee_member_id,
     lead_id,contact_id,account_id,email_to,email_delivery_status,idempotency_key,email_payload_hash)
    VALUES (p_organization_id,'EMAIL',btrim(p_subject),btrim(p_body),'PENDING',
      p_actor_member_id,p_actor_member_id,
      CASE WHEN p_resource='leads' THEN p_record_id END,
      CASE WHEN p_resource='contacts' THEN p_record_id END,
      CASE WHEN p_resource='accounts' THEN p_record_id END,
      lower(btrim(v_recipient)),'QUEUED',p_idempotency_key,p_payload_hash)
    RETURNING * INTO v_existing;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'activity',v_existing.id,p_actor_member_id,'email.queued',p_request_id,
      jsonb_build_object('resource',p_resource,'parentId',p_record_id));
  RETURN to_jsonb(v_existing) || jsonb_build_object('replayed',false);
END;
$$;

CREATE FUNCTION public.native_sales_claim_email(
  p_organization_id uuid,p_actor_member_id uuid,p_activity_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_activity public.sales_activities%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  UPDATE public.sales_activities SET email_delivery_status='SENDING',updated_at=now(),version=version+1
    WHERE organization_id=p_organization_id AND id=p_activity_id AND actor_member_id=p_actor_member_id
      AND kind='EMAIL' AND email_delivery_status='QUEUED'
    RETURNING * INTO v_activity;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(v_activity);
END;
$$;

CREATE FUNCTION public.native_sales_finish_email(
  p_organization_id uuid,p_actor_member_id uuid,p_activity_id uuid,
  p_outcome text,p_provider_id text,p_request_id uuid
) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_request_id IS NULL OR p_outcome IS NULL OR p_outcome NOT IN ('SENT','FAILED','UNKNOWN')
    OR length(coalesce(p_provider_id,''))>240 THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  UPDATE public.sales_activities SET
    email_delivery_status=p_outcome,email_provider_id=p_provider_id,
    status=CASE WHEN p_outcome='SENT' THEN 'COMPLETED' ELSE 'FAILED' END,
    completed_at=CASE WHEN p_outcome='SENT' THEN now() ELSE completed_at END,
    updated_at=now(),version=version+1
    WHERE organization_id=p_organization_id AND id=p_activity_id AND actor_member_id=p_actor_member_id
      AND kind='EMAIL' AND email_delivery_status='SENDING';
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'activity',p_activity_id,p_actor_member_id,'email.delivery',p_request_id,
      jsonb_build_object('outcome',p_outcome));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.native_sales_queue_email(uuid,uuid,text,uuid,text,text,text,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_claim_email(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.native_sales_finish_email(uuid,uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_queue_email(uuid,uuid,text,uuid,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_claim_email(uuid,uuid,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.native_sales_finish_email(uuid,uuid,uuid,text,text,uuid) TO service_role;
