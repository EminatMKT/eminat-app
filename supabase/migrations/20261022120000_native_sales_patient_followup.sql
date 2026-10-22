-- Portal commercial follow-up in the existing Native Sales model.
-- Additive DDL only: no historical patient, invoice, payment or membership writes.
ALTER TABLE public.sales_patient_assignment_state
  ADD COLUMN registration_follow_up_hours integer NOT NULL DEFAULT 24
  CHECK (registration_follow_up_hours BETWEEN 1 AND 168);

CREATE OR REPLACE FUNCTION public.native_sales_patient_ensure_lead(p_identity_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_contact public.sales_contacts%ROWTYPE;
DECLARE v_lead uuid;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_position smallint;
DECLARE v_last smallint;
DECLARE v_hours integer;
DECLARE v_assigned boolean := false;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE id=p_identity_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_IDENTITY_NOT_FOUND'; END IF;
  IF v_identity.lead_id IS NOT NULL THEN RETURN v_identity.lead_id; END IF;
  SELECT * INTO v_contact FROM public.sales_contacts
    WHERE organization_id=v_identity.organization_id AND id=v_identity.contact_id
      AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PATIENT_CONTACT_NOT_FOUND'; END IF;
  SELECT id INTO v_lead FROM public.sales_leads
    WHERE organization_id=v_identity.organization_id AND origin_contact_id=v_contact.id
      AND archived_at IS NULL ORDER BY created_at,id LIMIT 1;
  IF v_lead IS NOT NULL THEN
    UPDATE public.sales_patient_identities SET lead_id=v_lead WHERE id=v_identity.id;
    RETURN v_lead;
  END IF;
  INSERT INTO public.sales_patient_assignment_state(organization_id)
    VALUES (v_identity.organization_id) ON CONFLICT DO NOTHING;
  SELECT last_position,registration_follow_up_hours INTO v_last,v_hours
    FROM public.sales_patient_assignment_state
    WHERE organization_id=v_identity.organization_id FOR UPDATE;
  SELECT a.member_id,a.position INTO v_owner,v_position
    FROM public.sales_patient_assignment_order a
    JOIN public.sales_members m ON m.organization_id=a.organization_id AND m.id=a.member_id
    JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id
    JOIN public.sales_team_members tm ON tm.organization_id=a.organization_id AND tm.member_id=m.id
    JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
    WHERE a.organization_id=v_identity.organization_id AND a.enabled
      AND m.status='active' AND m.role='SELLER' AND u.activo
      AND t.active AND t.name='Corazón Salud Sales'
    ORDER BY CASE WHEN a.position>v_last THEN 0 ELSE 1 END,a.position LIMIT 1;
  v_assigned := v_owner IS NOT NULL;
  IF v_assigned THEN
    SELECT tm.team_id INTO v_team FROM public.sales_team_members tm
      JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
      WHERE tm.organization_id=v_identity.organization_id AND tm.member_id=v_owner
        AND t.active AND t.name='Corazón Salud Sales'
      ORDER BY tm.team_id LIMIT 1;
    UPDATE public.sales_patient_assignment_state SET last_position=v_position
      WHERE organization_id=v_identity.organization_id;
    UPDATE public.sales_contacts SET owner_member_id=v_owner,team_id=v_team,
      updated_by=v_owner,updated_at=now(),version=version+1
      WHERE organization_id=v_identity.organization_id AND id=v_contact.id;
  ELSE
    -- The bound contact's approved administrative owner is the FK-safe
    -- holding owner. It has no active Seller access and is shown as unassigned.
    v_owner := v_contact.owner_member_id;
    v_team := NULL;
  END IF;
  INSERT INTO public.sales_leads
    (organization_id,owner_member_id,team_id,display_name,first_name,last_name,
     email,phone,status,source,source_detail,corazon_salud,origin_contact_id,
     next_action,next_follow_up_at,created_by,updated_by)
  VALUES (v_identity.organization_id,v_owner,v_team,v_contact.display_name,
    v_contact.first_name,v_contact.last_name,v_contact.email,v_contact.phone,
    CASE WHEN v_assigned THEN 'ASSIGNED' ELSE 'NEW' END,
    'Patient Portal',CASE WHEN v_assigned THEN 'Portal Registration' ELSE 'Needs Assignment' END,
    true,v_contact.id,
    CASE WHEN v_assigned THEN 'Contact patient about membership selection'
      ELSE 'Assign an active EMC seller' END,
    CASE WHEN v_assigned THEN now()+make_interval(hours=>v_hours) ELSE NULL END,
    v_owner,v_owner)
  RETURNING id INTO v_lead;
  UPDATE public.sales_patient_identities SET lead_id=v_lead WHERE id=v_identity.id;
  INSERT INTO public.sales_activities
    (organization_id,kind,title,status,actor_member_id,assignee_member_id,
     lead_id,contact_id,due_at,idempotency_key)
  VALUES (v_identity.organization_id,'TASK',
    CASE WHEN v_assigned THEN 'Follow up on Portal registration'
      ELSE 'Assign Portal lead to EMC seller' END,
    'PENDING',v_owner,CASE WHEN v_assigned THEN v_owner ELSE NULL END,
    v_lead,v_contact.id,
    CASE WHEN v_assigned THEN now()+make_interval(hours=>v_hours) ELSE NULL END,
    'patient-registration-'||v_identity.id::text)
  ON CONFLICT (organization_id,idempotency_key) DO NOTHING;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (v_identity.organization_id,'lead',v_lead,v_owner,'patient_portal_registered',
    gen_random_uuid(),jsonb_build_object('contactId',v_contact.id,
      'assignmentSource',CASE WHEN v_assigned THEN 'configured_round_robin'
        ELSE 'needs_assignment' END,'assignedMemberId',
      CASE WHEN v_assigned THEN v_owner ELSE NULL END));
  RETURN v_lead;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_ensure_lead(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_ensure_lead(uuid) TO service_role;

-- The opportunity trigger runs first and binds the new intent. This trigger
-- creates one existing Sales activity per intent, never a parallel task record.
CREATE FUNCTION public.native_sales_patient_follow_up_intent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_identity public.sales_patient_identities%ROWTYPE;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_hours integer;
DECLARE v_action text;
BEGIN
  SELECT * INTO v_identity FROM public.sales_patient_identities
    WHERE organization_id=NEW.organization_id AND id=NEW.patient_identity_id;
  IF NOT FOUND OR v_identity.lead_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_lead FROM public.sales_leads
    WHERE organization_id=NEW.organization_id AND id=v_identity.lead_id FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;
  IF NEW.status='FULFILLED' THEN
    UPDATE public.sales_activities SET status='COMPLETED',completed_at=now(),updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-intent-'||NEW.id::text AND status='PENDING';
    UPDATE public.sales_leads SET next_action=NULL,next_follow_up_at=NULL,
      updated_at=now(),version=version+1 WHERE id=v_lead.id;
    RETURN NEW;
  END IF;
  IF NEW.status='CANCELLED' THEN
    UPDATE public.sales_activities SET status='CANCELLED',updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-intent-'||NEW.id::text AND status='PENDING';
    v_action:='Contact patient about cancelled selection';
  ELSE
    v_action:=CASE WHEN NEW.membership_type='FAMILY'
      THEN 'Follow up on Family setup and pending payment'
      ELSE 'Follow up on pending invoice or payment' END;
    SELECT registration_follow_up_hours INTO v_hours
      FROM public.sales_patient_assignment_state WHERE organization_id=NEW.organization_id;
    INSERT INTO public.sales_activities
      (organization_id,kind,title,status,actor_member_id,assignee_member_id,
       lead_id,contact_id,opportunity_id,due_at,idempotency_key)
    VALUES (NEW.organization_id,'FOLLOW_UP','Follow up on Portal enrollment','PENDING',
      v_lead.owner_member_id,
      CASE WHEN EXISTS (SELECT 1 FROM public.sales_members m
        WHERE m.organization_id=NEW.organization_id AND m.id=v_lead.owner_member_id
          AND m.status='active' AND m.role='SELLER') THEN v_lead.owner_member_id ELSE NULL END,
      v_lead.id,v_identity.contact_id,
      (SELECT opportunity_id FROM public.sales_patient_enrollment_intents WHERE id=NEW.id),
      now()+make_interval(hours=>coalesce(v_hours,24)),
      'patient-intent-'||NEW.id::text)
    ON CONFLICT (organization_id,idempotency_key) DO NOTHING;
    UPDATE public.sales_activities SET status='COMPLETED',completed_at=now(),updated_at=now()
      WHERE organization_id=NEW.organization_id
        AND idempotency_key='patient-registration-'||v_identity.id::text AND status='PENDING';
  END IF;
  UPDATE public.sales_leads SET plan=NEW.plan,next_action=v_action,
    next_follow_up_at=CASE WHEN NEW.status='CANCELLED' THEN NULL
      ELSE coalesce(next_follow_up_at,now()+make_interval(hours=>coalesce(v_hours,24))) END,
    updated_at=now(),version=version+1 WHERE id=v_lead.id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER zz_sales_patient_intent_follow_up
  AFTER INSERT OR UPDATE OF plan,membership_type,duration,status,amount_cents
  ON public.sales_patient_enrollment_intents FOR EACH ROW
  EXECUTE FUNCTION public.native_sales_patient_follow_up_intent();
REVOKE ALL ON FUNCTION public.native_sales_patient_follow_up_intent()
  FROM PUBLIC,anon,authenticated;

-- A scoped commercial view for the existing Sales screen. The caller is a
-- validated LILLY Sales member; no Portal auth identifiers or family PII leave
-- this function. Filtering occurs before pagination.
CREATE FUNCTION public.native_sales_portal_leads(
  p_organization_id uuid,p_actor_member_id uuid,p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0,p_search text DEFAULT NULL,p_owner uuid DEFAULT NULL,
  p_assignment text DEFAULT NULL,
  p_plan text DEFAULT NULL,p_type text DEFAULT NULL,p_stage text DEFAULT NULL,
  p_invoice text DEFAULT NULL,p_payment text DEFAULT NULL,p_membership text DEFAULT NULL,
  p_follow_up boolean DEFAULT NULL,p_registered_from date DEFAULT NULL,
  p_registered_to date DEFAULT NULL
) RETURNS SETOF jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_role text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_limit NOT BETWEEN 1 AND 100 OR p_offset NOT BETWEEN 0 AND 100000
    OR length(coalesce(p_search,''))>200 THEN
    RAISE EXCEPTION 'INVALID_FILTER' USING ERRCODE='22023';
  END IF;
  SELECT m.role INTO v_role FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id
    WHERE m.id=p_actor_member_id AND m.organization_id=p_organization_id
      AND m.status='active' AND o.status='active' AND u.activo;
  IF v_role IS NULL OR v_role='FINANCE' THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  WITH scoped AS MATERIALIZED (
    SELECT l.id,l.display_name,l.email,l.phone,l.source,l.created_at,
      l.owner_member_id,l.team_id,l.status AS lead_status,l.source_detail,
      l.next_action,l.next_follow_up_at,l.origin_contact_id,
      i.id AS identity_id,i.created_at AS registered_at,
      c.first_name,c.last_name,c.phone AS contact_phone,
      owner_member.status AS owner_status,owner_member.role AS owner_role,
      intent.id AS intent_id,intent.plan,intent.membership_type,intent.duration,
      intent.amount_cents,intent.status AS intent_status,
      intent.opportunity_id,stage.code AS opportunity_stage,
      q.qbo_invoice_number,q.qbo_invoice_status,q.qbo_payment_status,
      q.verification_state,q.membership_activation_status,
      mb.status AS membership_status,
      coalesce(family.draft_count,0) AS draft_dependants,
      activity.last_at,activity.last_title,
      assignment.occurred_at AS assignment_at,
      CASE WHEN owner_member.status='active' AND owner_member.role='SELLER'
        THEN 'ASSIGNED' ELSE 'NEEDS_ASSIGNMENT' END AS assignment_status,
      CASE WHEN mb.status='ACTIVE' THEN 'MEMBERSHIP_ACTIVE'
        WHEN q.verification_state='PAYMENT_VERIFIED' THEN 'PAYMENT_CONFIRMED'
        WHEN q.verification_state='PAYMENT_REPORTED' THEN 'PAYMENT_REPORTED'
        WHEN q.qbo_invoice_number IS NOT NULL THEN 'INVOICE_ISSUED'
        WHEN intent.status='CANCELLED' THEN 'CANCELLED'
        WHEN intent.id IS NOT NULL THEN 'INVOICE_PENDING'
        ELSE 'MEMBERSHIP_NOT_SELECTED' END AS commercial_status
    FROM public.sales_leads l
    JOIN public.sales_patient_identities i
      ON i.organization_id=l.organization_id AND i.lead_id=l.id
    JOIN public.sales_contacts c
      ON c.organization_id=l.organization_id AND c.id=i.contact_id
    JOIN public.sales_members owner_member
      ON owner_member.organization_id=l.organization_id AND owner_member.id=l.owner_member_id
    LEFT JOIN LATERAL (
      SELECT pi.* FROM public.sales_patient_enrollment_intents pi
      WHERE pi.organization_id=l.organization_id AND pi.patient_identity_id=i.id
      ORDER BY pi.created_at DESC,pi.id DESC LIMIT 1
    ) intent ON true
    LEFT JOIN public.sales_opportunities o
      ON o.organization_id=l.organization_id AND o.id=intent.opportunity_id
    LEFT JOIN public.sales_stages stage
      ON stage.organization_id=l.organization_id AND stage.id=o.stage_id
    LEFT JOIN public.sales_patient_qbo_manual q
      ON q.organization_id=l.organization_id AND q.enrollment_intent_id=intent.id
    LEFT JOIN LATERAL (
      SELECT m.status FROM public.sales_memberships m
      WHERE m.organization_id=l.organization_id AND m.primary_contact_id=i.contact_id
      ORDER BY CASE WHEN m.status='ACTIVE' THEN 0 ELSE 1 END,m.created_at DESC,m.id DESC
      LIMIT 1
    ) mb ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS draft_count FROM public.sales_patient_family_draft_members fm
      WHERE fm.organization_id=l.organization_id AND fm.enrollment_intent_id=intent.id
        AND fm.status='DRAFT'
    ) family ON true
    LEFT JOIN LATERAL (
      SELECT a.created_at AS last_at,a.title AS last_title
      FROM public.sales_activities a
      WHERE a.organization_id=l.organization_id AND a.lead_id=l.id
      ORDER BY a.created_at DESC,a.id DESC LIMIT 1
    ) activity ON true
    LEFT JOIN LATERAL (
      SELECT h.occurred_at FROM public.sales_history h
      WHERE h.organization_id=l.organization_id AND h.entity_type='lead'
        AND h.record_id=l.id AND h.action IN ('patient_portal_registered','reassign')
      ORDER BY h.occurred_at DESC,h.id DESC LIMIT 1
    ) assignment ON true
    WHERE l.organization_id=p_organization_id AND l.archived_at IS NULL
      AND l.source='Patient Portal'
      AND (v_role IN ('SUPERADMIN','ADMINISTRATOR','AUDITOR')
        OR l.owner_member_id=p_actor_member_id
        OR (v_role='SALES_MANAGER' AND (
          (l.team_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.sales_team_members tm
            WHERE tm.organization_id=p_organization_id
              AND tm.member_id=p_actor_member_id AND tm.team_id=l.team_id))
          OR owner_member.status<>'active' OR owner_member.role<>'SELLER'))
        OR EXISTS (SELECT 1 FROM public.sales_record_grants g
          WHERE g.organization_id=p_organization_id AND g.member_id=p_actor_member_id
            AND g.entity_type='lead' AND g.record_id=l.id AND g.revoked_at IS NULL))
  )
  SELECT jsonb_build_object(
    'id',s.id,'contactId',s.origin_contact_id,'displayName',s.display_name,
    'email',s.email,'phone',coalesce(s.contact_phone,s.phone),
    'source',s.source,'registeredAt',s.registered_at,
    'profileComplete',s.first_name IS NOT NULL AND s.last_name IS NOT NULL,
    'ownerMemberId',CASE WHEN s.assignment_status='ASSIGNED' THEN s.owner_member_id ELSE NULL END,
    'assignmentStatus',s.assignment_status,'assignmentAt',
      CASE WHEN s.assignment_status='ASSIGNED' THEN s.assignment_at ELSE NULL END,
    'assignmentSource',CASE WHEN s.assignment_status='NEEDS_ASSIGNMENT'
      THEN 'pending_manager_review' ELSE 'configured_sales_rule' END,
    'leadStatus',s.lead_status,'plan',s.plan,'membershipType',s.membership_type,
    'modality',s.duration,'amountCents',s.amount_cents,'intentStatus',s.intent_status,
    'opportunityId',s.opportunity_id,'opportunityStage',s.opportunity_stage,
    'invoiceNumber',s.qbo_invoice_number,
    'invoiceStatus',coalesce(s.qbo_invoice_status,'NOT_CREATED'),
    'paymentStatus',coalesce(s.qbo_payment_status,'UNPAID'),
    'verificationState',coalesce(s.verification_state,'PENDING_INVOICE'),
    'membershipStatus',coalesce(s.membership_status,'NOT_ACTIVE'),
    'commercialStatus',s.commercial_status,'familyCount',
      CASE WHEN s.membership_type='FAMILY' THEN 1+s.draft_dependants ELSE NULL END,
    'followUpRequired',s.commercial_status<>'MEMBERSHIP_ACTIVE',
    'nextAction',s.next_action,'nextFollowUpAt',s.next_follow_up_at,
    'lastActivityAt',s.last_at,'lastActivity',s.last_title)
  FROM scoped s
  WHERE (p_search IS NULL OR position(lower(p_search) in lower(s.display_name))>0
    OR position(lower(p_search) in lower(coalesce(s.email,'')))>0)
    AND (p_owner IS NULL OR s.owner_member_id=p_owner)
    AND (p_assignment IS NULL OR s.assignment_status=p_assignment)
    AND (p_plan IS NULL OR s.plan=p_plan)
    AND (p_type IS NULL OR s.membership_type=p_type)
    AND (p_stage IS NULL OR s.opportunity_stage=p_stage)
    AND (p_invoice IS NULL OR coalesce(s.qbo_invoice_status,'NOT_CREATED')=p_invoice)
    AND (p_payment IS NULL OR coalesce(s.qbo_payment_status,'UNPAID')=p_payment)
    AND (p_membership IS NULL OR coalesce(s.membership_status,'NOT_ACTIVE')=p_membership)
    AND (p_follow_up IS NULL OR (s.commercial_status<>'MEMBERSHIP_ACTIVE')=p_follow_up)
    AND (p_registered_from IS NULL OR s.registered_at::date>=p_registered_from)
    AND (p_registered_to IS NULL OR s.registered_at::date<=p_registered_to)
  ORDER BY s.registered_at DESC,s.id DESC LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_portal_leads(
  uuid,uuid,integer,integer,text,uuid,text,text,text,text,text,text,text,boolean,date,date)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_portal_leads(
  uuid,uuid,integer,integer,text,uuid,text,text,text,text,text,text,text,boolean,date,date)
  TO service_role;

-- A manager may claim a Portal registration held by a pending administrative
-- owner, but still must assign it into one of their active teams. Sellers retain
-- the existing reassignment denial for every Lead.
CREATE OR REPLACE FUNCTION public.native_sales_reassign_lead(
  p_organization_id uuid,p_actor_member_id uuid,p_lead_id uuid,
  p_expected_version integer,p_owner_member_id uuid,p_team_id uuid,p_request_id uuid
) RETURNS public.sales_leads LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_target public.sales_members%ROWTYPE;
DECLARE v_before public.sales_leads%ROWTYPE;
DECLARE v_after public.sales_leads%ROWTYPE;
DECLARE v_unassigned_portal boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_expected_version<1 OR p_request_id IS NULL OR p_owner_member_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023';
  END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.id=p_actor_member_id AND m.organization_id=p_organization_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501'; END IF;
  IF v_actor.role NOT IN ('SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'REASSIGN_FORBIDDEN' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_before FROM public.sales_leads
    WHERE id=p_lead_id AND organization_id=p_organization_id
      AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'LEAD_NOT_FOUND' USING ERRCODE='P0002'; END IF;
  IF v_before.version<>p_expected_version THEN
    RAISE EXCEPTION 'VERSION_CONFLICT' USING ERRCODE='40001';
  END IF;
  v_unassigned_portal:=v_before.source='Patient Portal' AND v_before.team_id IS NULL
    AND EXISTS (SELECT 1 FROM public.sales_members m
      WHERE m.organization_id=p_organization_id AND m.id=v_before.owner_member_id
        AND (m.status<>'active' OR m.role<>'SELLER'));
  IF v_actor.role='SALES_MANAGER' AND v_before.owner_member_id<>p_actor_member_id
    AND NOT v_unassigned_portal AND NOT EXISTS (
      SELECT 1 FROM public.sales_team_members tm
      WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
        AND tm.team_id=v_before.team_id)
  THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_target FROM public.sales_members
    WHERE id=p_owner_member_id AND organization_id=p_organization_id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'OWNER_NOT_ELIGIBLE' USING ERRCODE='22023'; END IF;
  IF v_unassigned_portal AND v_target.role<>'SELLER' THEN
    RAISE EXCEPTION 'PORTAL_SELLER_REQUIRED' USING ERRCODE='22023';
  END IF;
  IF p_team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
      JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
    WHERE tm.organization_id=p_organization_id AND tm.member_id=p_owner_member_id
      AND tm.team_id=p_team_id AND t.active)
  THEN RAISE EXCEPTION 'OWNER_TEAM_MISMATCH' USING ERRCODE='22023'; END IF;
  IF v_actor.role='SALES_MANAGER' AND (p_team_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.sales_team_members tm
    WHERE tm.organization_id=p_organization_id AND tm.member_id=p_actor_member_id
      AND tm.team_id=p_team_id))
  THEN RAISE EXCEPTION 'TEAM_FORBIDDEN' USING ERRCODE='42501'; END IF;
  IF v_before.owner_member_id=p_owner_member_id
    AND v_before.team_id IS NOT DISTINCT FROM p_team_id THEN RETURN v_before; END IF;
  UPDATE public.sales_leads SET owner_member_id=p_owner_member_id,team_id=p_team_id,
    version=version+1,updated_by=p_actor_member_id,updated_at=now(),
    source_detail=CASE WHEN v_unassigned_portal THEN 'Portal Registration'
      ELSE source_detail END,
    next_action=CASE WHEN v_unassigned_portal AND EXISTS (
      SELECT 1 FROM public.sales_patient_identities i
      JOIN public.sales_patient_enrollment_intents pi
        ON pi.organization_id=i.organization_id AND pi.patient_identity_id=i.id
      WHERE i.organization_id=p_organization_id AND i.lead_id=p_lead_id
        AND pi.status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING'))
      THEN 'Follow up on pending invoice or payment'
      WHEN v_unassigned_portal THEN 'Contact patient about membership selection'
      ELSE next_action END,
    next_follow_up_at=CASE WHEN v_unassigned_portal THEN coalesce(next_follow_up_at,
      now()+make_interval(hours=>(SELECT registration_follow_up_hours
        FROM public.sales_patient_assignment_state WHERE organization_id=p_organization_id)))
      ELSE next_follow_up_at END
    WHERE id=p_lead_id AND organization_id=p_organization_id RETURNING * INTO v_after;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
  VALUES (p_organization_id,'lead',p_lead_id,p_actor_member_id,'owner.assigned',
    p_request_id,jsonb_build_object(
      'ownerMemberId',jsonb_build_object('from',v_before.owner_member_id,'to',p_owner_member_id),
      'teamId',jsonb_build_object('from',v_before.team_id,'to',p_team_id)));
  RETURN v_after;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_reassign_lead(uuid,uuid,uuid,integer,uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_reassign_lead(uuid,uuid,uuid,integer,uuid,uuid,uuid)
  TO service_role;

CREATE FUNCTION public.native_sales_patient_sync_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF NEW.source<>'Patient Portal' OR NEW.origin_contact_id IS NULL
    OR (NEW.owner_member_id=OLD.owner_member_id
      AND NEW.team_id IS NOT DISTINCT FROM OLD.team_id) THEN RETURN NEW; END IF;
  UPDATE public.sales_contacts SET owner_member_id=NEW.owner_member_id,
    team_id=NEW.team_id,updated_by=NEW.updated_by,updated_at=now(),version=version+1
    WHERE organization_id=NEW.organization_id AND id=NEW.origin_contact_id
      AND (owner_member_id<>NEW.owner_member_id OR team_id IS DISTINCT FROM NEW.team_id);
  UPDATE public.sales_opportunities o SET owner_member_id=NEW.owner_member_id,
    team_id=NEW.team_id,updated_by=NEW.updated_by,updated_at=now(),version=version+1
    FROM public.sales_stages st
    WHERE o.organization_id=NEW.organization_id AND o.primary_contact_id=NEW.origin_contact_id
      AND o.stage_id=st.id AND st.organization_id=o.organization_id AND st.outcome='OPEN'
      AND o.source='Patient Portal' AND o.product='Corazón Salud'
      AND (o.owner_member_id<>NEW.owner_member_id OR o.team_id IS DISTINCT FROM NEW.team_id);
  UPDATE public.sales_activities SET assignee_member_id=NEW.owner_member_id,
    due_at=coalesce(due_at,NEW.next_follow_up_at),updated_at=now()
    WHERE organization_id=NEW.organization_id AND lead_id=NEW.id AND status='PENDING'
      AND idempotency_key LIKE 'patient-%'
      AND assignee_member_id IS DISTINCT FROM NEW.owner_member_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sales_patient_lead_assignment_sync
  AFTER UPDATE OF owner_member_id,team_id ON public.sales_leads
  FOR EACH ROW EXECUTE FUNCTION public.native_sales_patient_sync_assignment();
REVOKE ALL ON FUNCTION public.native_sales_patient_sync_assignment()
  FROM PUBLIC,anon,authenticated;

