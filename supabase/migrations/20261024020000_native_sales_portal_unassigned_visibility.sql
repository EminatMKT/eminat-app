-- Preserve genuinely unassigned Portal leads in manager/admin scope.
-- Seller scope remains limited to owned or explicitly granted records.
CREATE OR REPLACE FUNCTION public.native_sales_portal_leads(
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
      assignment.occurred_at AS assignment_at,assignment.action AS assignment_action,
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
    LEFT JOIN public.sales_members owner_member
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
      SELECT h.occurred_at,h.action FROM public.sales_history h
      WHERE h.organization_id=l.organization_id AND h.entity_type='lead'
        AND h.record_id=l.id AND h.action IN ('patient_portal_registered','owner.assigned')
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
          OR owner_member.id IS NULL OR owner_member.status<>'active' OR owner_member.role<>'SELLER'))
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
      THEN 'pending_manager_review'
      WHEN s.assignment_action='owner.assigned' THEN 'manager_assignment'
      ELSE 'configured_sales_rule' END,
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
    'nextAction',CASE s.commercial_status
      WHEN 'MEMBERSHIP_ACTIVE' THEN NULL
      WHEN 'PAYMENT_CONFIRMED' THEN 'Confirm membership activation'
      WHEN 'PAYMENT_REPORTED' THEN 'Await finance verification'
      WHEN 'INVOICE_ISSUED' THEN 'Follow up on unpaid invoice'
      WHEN 'INVOICE_PENDING' THEN 'Issue invoice and follow up on selection'
      WHEN 'MEMBERSHIP_NOT_SELECTED' THEN coalesce(s.next_action,
        'Contact patient about membership selection')
      ELSE s.next_action END,
    'nextFollowUpAt',s.next_follow_up_at,
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

