-- EMC Lead Ads only; no table/data backfill, Portal/Medical/Auth/RLS changes.
-- Reuse Social receipts/mappings and the existing EMC assignment order AND cursor.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.sales_social_integrations WHERE provider_code='META'
    AND organization_id<>'9efab353-46a0-43d1-9901-e3f185dc5d30'
    AND status IN ('CONNECTED','DEGRADED')) THEN
    RAISE EXCEPTION 'META_UNRELATED_ACTIVE_CONNECTION'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.native_sales_receive_social_event(
  p_external_asset_id text,p_external_event_id text,p_kind text,
  p_occurred_at timestamptz,p_normalized jsonb,p_payload_hash text,
  p_correlation_id uuid,p_operation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org constant uuid := '9efab353-46a0-43d1-9901-e3f185dc5d30';
DECLARE v_asset public.sales_social_assets%ROWTYPE;
DECLARE v_receipt public.sales_social_webhook_receipts%ROWTYPE;
DECLARE v_fields jsonb;
DECLARE v_safe jsonb;
DECLARE v_email text;
DECLARE v_phone text;
DECLARE v_name text;
DECLARE v_lead uuid;
DECLARE v_contact uuid;
DECLARE v_contacts integer;
DECLARE v_leads integer;
DECLARE v_owner uuid;
DECLARE v_team uuid;
DECLARE v_last smallint;
DECLARE v_position smallint;
DECLARE v_hours integer;
DECLARE v_assigned boolean := false;
DECLARE v_created boolean := false;
DECLARE v_error text;
DECLARE v_mapping public.sales_social_leads%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_kind IS DISTINCT FROM 'leadgen' OR p_external_asset_id IS DISTINCT FROM '405695562628937'
    OR p_normalized->>'pageId' IS DISTINCT FROM p_external_asset_id
    OR p_normalized->>'formId' IS DISTINCT FROM '612660371798285'
    OR coalesce(p_normalized->>'externalLeadId','') !~ '^[0-9]{1,30}$'
    OR p_external_event_id IS DISTINCT FROM 'leadgen:'||(p_normalized->>'externalLeadId')
    OR p_occurred_at IS NULL OR p_occurred_at>now()+interval '5 minutes'
    OR p_occurred_at<now()-interval '7 days'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$'
    OR p_correlation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
  -- Never trust a client-supplied organization, form or token binding.
  SELECT a.* INTO v_asset FROM public.sales_social_assets a
    JOIN public.sales_social_accounts ac ON ac.organization_id=a.organization_id AND ac.id=a.account_id
    JOIN public.sales_social_integrations i ON i.organization_id=ac.organization_id AND i.id=ac.integration_id
    JOIN public.sales_social_providers p ON p.code=i.provider_code
    WHERE a.organization_id=v_org AND a.external_asset_id=p_external_asset_id
      AND a.asset_type='page' AND a.status='SUBSCRIBED' AND ac.status='ACTIVE'
      AND i.provider_code='META' AND i.status='CONNECTED' AND p.enabled
      AND i.app_id='919434760646769'
      AND i.external_business_id='1865633431087642';
  IF NOT FOUND THEN RAISE EXCEPTION 'META_ASSET_UNAVAILABLE' USING ERRCODE='P0002'; END IF;
  -- Serialize both duplicate deliveries and per-Page admission across server instances.
  PERFORM pg_advisory_xact_lock(hashtextextended('emc-meta:'||p_external_asset_id,0));
  SELECT * INTO v_receipt FROM public.sales_social_webhook_receipts
    WHERE organization_id=v_org AND asset_id=v_asset.id AND external_event_id=p_external_event_id FOR UPDATE;
  IF FOUND THEN
    IF v_receipt.payload_hash<>p_payload_hash THEN
      RAISE EXCEPTION 'META_REPLAY_CONFLICT' USING ERRCODE='23505'; END IF;
    IF v_receipt.status<>'PENDING' THEN
      RETURN jsonb_build_object('status',v_receipt.status,'replayed',true); END IF;
  ELSE
    IF (SELECT count(*) FROM public.sales_social_webhook_receipts
        WHERE asset_id=v_asset.id AND received_at>now()-interval '1 minute')>=120 THEN
      RAISE EXCEPTION 'META_RATE_LIMITED' USING ERRCODE='54000'; END IF;
    -- A signed webhook never supplies answers. Only the private Graph retry can.
    IF p_normalized->'fields' IS NOT NULL AND p_normalized->'fields'<>'null'::jsonb THEN
      RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
    v_safe:=jsonb_build_object('channel','page','pageId',p_external_asset_id,
      'formId',p_normalized->>'formId','externalLeadId',p_normalized->>'externalLeadId',
      'needsLeadFetch',true);
    INSERT INTO public.sales_social_webhook_receipts
      (organization_id,asset_id,external_event_id,event_kind,object_type,payload_hash,
       occurred_at,correlation_id,operation_id,normalized)
      VALUES (v_org,v_asset.id,p_external_event_id,'leadgen','page',p_payload_hash,
        p_occurred_at,p_correlation_id,p_operation_id,v_safe) RETURNING * INTO v_receipt;
  END IF;
  v_fields:=p_normalized->'fields';
  IF v_fields IS NULL OR v_fields='null'::jsonb THEN
    UPDATE public.sales_social_webhook_receipts SET status='RETRY',attempts=attempts+1,
      next_retry_at=now(),error_code='LEAD_DATA_PENDING' WHERE id=v_receipt.id;
    RETURN jsonb_build_object('status','RETRY','replayed',false);
  END IF;
  IF jsonb_typeof(v_fields)<>'object' OR v_fields->>'_form_id' IS DISTINCT FROM '612660371798285'
    OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_fields) k WHERE k NOT IN
      ('first_name','last_name','full_name','email','phone_number','preferred_language',
       '_form_id','_ad_id','_adset_id','_campaign_id','_platform','_fields_blocked'))
    OR EXISTS(SELECT 1 FROM jsonb_each(v_fields) e WHERE jsonb_typeof(e.value)<>'string'
      OR length(e.value#>>'{}')>254) THEN
    RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
  -- Exact external identity is authoritative, even if a provider retries with new metadata.
  SELECT * INTO v_mapping FROM public.sales_social_leads
    WHERE organization_id=v_org AND external_lead_id=p_normalized->>'externalLeadId';
  IF FOUND THEN
    IF v_mapping.page_id IS DISTINCT FROM p_external_asset_id
      OR v_mapping.form_id IS DISTINCT FROM p_normalized->>'formId' THEN
      RAISE EXCEPTION 'META_REPLAY_CONFLICT' USING ERRCODE='23505'; END IF;
    v_lead:=v_mapping.lead_id;
  ELSE
    v_email:=nullif(lower(btrim(v_fields->>'email')),'');
    v_phone:=nullif(regexp_replace(v_fields->>'phone_number','[^0-9+]','','g'),'');
    IF v_email IS NOT NULL AND (length(v_email)>254 OR v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') THEN
      RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
    IF v_phone IS NOT NULL AND v_phone !~ '^[+]?[0-9]{7,15}$' THEN
      RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
    IF v_email IS NULL AND v_phone IS NULL THEN v_error:='CONTACT_IDENTIFIER_REQUIRED'; END IF;
    SELECT count(*),(array_agg(id))[1] INTO v_leads,v_lead FROM public.sales_leads l
      WHERE l.organization_id=v_org AND l.archived_at IS NULL AND
        ((v_email IS NOT NULL AND lower(btrim(l.email))=v_email) OR
         (v_phone IS NOT NULL AND regexp_replace(l.phone,'[^0-9+]','','g')=v_phone));
    SELECT count(*),(array_agg(id))[1] INTO v_contacts,v_contact FROM public.sales_contacts c
      WHERE c.organization_id=v_org AND c.archived_at IS NULL AND
        ((v_email IS NOT NULL AND lower(btrim(c.email))=v_email) OR
         (v_phone IS NOT NULL AND regexp_replace(c.phone,'[^0-9+]','','g')=v_phone));
    IF v_leads>1 OR v_contacts>1 OR (v_leads=1 AND v_contacts=1 AND NOT EXISTS
      (SELECT 1 FROM public.sales_leads WHERE id=v_lead AND origin_contact_id=v_contact)) THEN
      v_error:='AMBIGUOUS_LEAD_MATCH'; END IF;
    IF v_error IS NOT NULL THEN
      UPDATE public.sales_social_webhook_receipts SET status='FAILED',attempts=attempts+1,
        error_code=v_error,next_retry_at=NULL,normalized=normalized-'fields' WHERE id=v_receipt.id;
      RETURN jsonb_build_object('status','FAILED','replayed',false);
    END IF;
    IF v_leads=0 AND v_contacts=1 THEN
      -- Reconcile the existing Contact without modifying identity, owner or customer data.
      SELECT id INTO v_lead FROM public.sales_leads WHERE organization_id=v_org
        AND origin_contact_id=v_contact AND archived_at IS NULL ORDER BY created_at,id LIMIT 1;
      IF v_lead IS NULL THEN
        SELECT c.owner_member_id,c.team_id INTO v_owner,v_team FROM public.sales_contacts c
          WHERE c.organization_id=v_org AND c.id=v_contact;
        v_assigned:=EXISTS(SELECT 1 FROM public.sales_members WHERE organization_id=v_org
          AND id=v_owner AND role='SELLER' AND status='active');
      END IF;
    END IF;
    IF v_lead IS NULL THEN
      IF v_contact IS NULL THEN
        -- Same lock, configured order, eligibility, cursor and team rules as EMC registration.
        INSERT INTO public.sales_patient_assignment_state(organization_id) VALUES(v_org) ON CONFLICT DO NOTHING;
        SELECT last_position,registration_follow_up_hours INTO v_last,v_hours
          FROM public.sales_patient_assignment_state WHERE organization_id=v_org FOR UPDATE;
        SELECT a.member_id,a.position INTO v_owner,v_position
          FROM public.sales_patient_assignment_order a
          JOIN public.sales_members m ON m.organization_id=a.organization_id AND m.id=a.member_id
          JOIN public.usuarios u ON u.id=m.user_id AND u.auth_id=m.auth_id
          JOIN public.sales_team_members tm ON tm.organization_id=a.organization_id AND tm.member_id=m.id
          JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
          WHERE a.organization_id=v_org AND a.enabled AND m.status='active' AND m.role='SELLER'
            AND u.activo AND t.active AND t.name='Corazón Salud Sales'
          ORDER BY CASE WHEN a.position>v_last THEN 0 ELSE 1 END,a.position LIMIT 1;
        v_assigned:=v_owner IS NOT NULL;
        IF v_assigned THEN
          SELECT tm.team_id INTO v_team FROM public.sales_team_members tm
            JOIN public.sales_teams t ON t.organization_id=tm.organization_id AND t.id=tm.team_id
            WHERE tm.organization_id=v_org AND tm.member_id=v_owner AND t.active AND t.name='Corazón Salud Sales'
            ORDER BY tm.team_id LIMIT 1;
          UPDATE public.sales_patient_assignment_state SET last_position=v_position WHERE organization_id=v_org;
        ELSE
          -- Existing FK-safe EMC holding owner; never assign a disabled seller.
          SELECT id INTO v_owner FROM public.sales_members WHERE organization_id=v_org
            AND id='c67e9779-9e87-48b0-9f6c-bf6a0c8cebad' AND role='SUPERADMIN';
          SELECT id INTO v_team FROM public.sales_teams WHERE organization_id=v_org
            AND active AND name='Corazón Salud Sales' ORDER BY id LIMIT 1;
          IF v_owner IS NULL THEN RAISE EXCEPTION 'META_ASSET_UNAVAILABLE' USING ERRCODE='P0002'; END IF;
        END IF;
      END IF;
      SELECT registration_follow_up_hours INTO v_hours FROM public.sales_patient_assignment_state WHERE organization_id=v_org;
      v_name:=left(coalesce(nullif(btrim(coalesce(v_fields->>'full_name',
        concat_ws(' ',v_fields->>'first_name',v_fields->>'last_name'))),''),v_email,v_phone,'Meta Lead'),200);
      INSERT INTO public.sales_leads
        (organization_id,owner_member_id,team_id,display_name,first_name,last_name,email,phone,
         source,source_detail,description,status,corazon_salud,origin_contact_id,next_action,next_follow_up_at,created_by,updated_by)
        VALUES(v_org,v_owner,v_team,v_name,v_fields->>'first_name',v_fields->>'last_name',v_email,v_phone,
          'Meta',CASE WHEN NOT v_assigned THEN 'Needs Assignment' WHEN v_fields->>'_platform'='ig'
            THEN 'Instagram Lead Ad' WHEN v_fields->>'_platform'='fb' THEN 'Facebook Lead Ad' ELSE 'Meta Lead Ad' END,
          CASE WHEN v_fields->>'preferred_language' IN ('en','es') THEN 'Preferred language: '||(v_fields->>'preferred_language') ELSE NULL END,
          CASE WHEN v_assigned THEN 'ASSIGNED' ELSE 'NEW' END,true,v_contact,
          CASE WHEN v_assigned THEN 'Respond to general information request' ELSE 'Assign an active EMC seller' END,
          CASE WHEN v_assigned THEN now()+make_interval(hours=>coalesce(v_hours,24)) ELSE NULL END,v_owner,v_owner)
        RETURNING id INTO v_lead;
      v_created:=true;
      INSERT INTO public.sales_activities
        (organization_id,kind,title,status,actor_member_id,assignee_member_id,lead_id,contact_id,due_at,idempotency_key)
        VALUES(v_org,'TASK',CASE WHEN v_assigned THEN 'Follow up on Meta information request'
          ELSE 'Assign Meta lead to EMC seller' END,'PENDING',v_owner,
          CASE WHEN v_assigned THEN v_owner ELSE NULL END,v_lead,v_contact,
          CASE WHEN v_assigned THEN now()+make_interval(hours=>coalesce(v_hours,24)) ELSE NULL END,'meta-lead-'||v_lead::text)
        ON CONFLICT (organization_id,idempotency_key) DO NOTHING;
    END IF;
    INSERT INTO public.sales_social_leads
      (organization_id,asset_id,receipt_id,external_lead_id,fingerprint_hash,lead_id,
       campaign_id,adset_id,ad_id,form_id,page_id,operation_id)
      VALUES(v_org,v_asset.id,v_receipt.id,p_normalized->>'externalLeadId',
        md5(p_normalized->>'externalLeadId'),v_lead,v_fields->>'_campaign_id',v_fields->>'_adset_id',
        v_fields->>'_ad_id',p_normalized->>'formId',p_external_asset_id,p_operation_id);
    INSERT INTO public.sales_history(organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
      VALUES(v_org,'lead',v_lead,NULL,CASE WHEN v_created THEN 'meta.lead.created' ELSE 'meta.lead.attributed' END,
        p_correlation_id,jsonb_build_object('assetId',v_asset.id,'receiptId',v_receipt.id,
          'assignmentSource',CASE WHEN NOT v_created THEN 'existing_record' WHEN v_contact IS NOT NULL
            THEN 'existing_contact' WHEN v_assigned
            THEN 'configured_round_robin' ELSE 'needs_assignment' END,
          'assignedMemberId',CASE WHEN v_assigned THEN v_owner ELSE NULL END,
          'platform',CASE WHEN v_fields->>'_platform' IN ('fb','ig') THEN v_fields->>'_platform' ELSE NULL END,
          'fieldsBlocked',v_fields->>'_fields_blocked'='true'));
  END IF;
  -- Retain only signed source IDs; no answers in durable retry receipts after success.
  UPDATE public.sales_social_webhook_receipts SET status='PROCESSED',attempts=attempts+1,
    processed_at=now(),error_code=NULL,next_retry_at=NULL,normalized=normalized-'fields'
    WHERE id=v_receipt.id;
  UPDATE public.sales_social_assets SET last_event_at=now(),last_error_code=NULL WHERE id=v_asset.id;
  RETURN jsonb_build_object('status','PROCESSED','replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid) TO service_role;

DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.sales_social_leads
    WHERE organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
    GROUP BY organization_id,external_lead_id HAVING count(*)>1) THEN
    RAISE EXCEPTION 'META_EXISTING_IDENTITY_CONFLICT'; END IF;
END $$;
CREATE UNIQUE INDEX sales_social_emc_external_lead_unique ON public.sales_social_leads(organization_id,external_lead_id)
  WHERE organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30';

-- Service-only, short-leased recovery for signed Meta Lead Ads receipts.
CREATE OR REPLACE FUNCTION public.native_sales_claim_social_leads(p_limit integer DEFAULT 10)
RETURNS SETOF jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_row record;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 25 THEN
    RAISE EXCEPTION 'META_RETRY_LIMIT_INVALID' USING ERRCODE='22023'; END IF;
  FOR v_row IN
    SELECT r.id,r.organization_id,r.asset_id,r.normalized,
      i.id AS integration_id,coalesce(a.token_ciphertext,i.token_ciphertext) AS token_ciphertext,
      coalesce(a.token_expires_at,i.token_expires_at) AS token_expires_at
    FROM public.sales_social_webhook_receipts r
    JOIN public.sales_social_assets a ON a.organization_id=r.organization_id AND a.id=r.asset_id
    JOIN public.sales_social_accounts ac ON ac.organization_id=a.organization_id AND ac.id=a.account_id
    JOIN public.sales_social_integrations i ON i.organization_id=ac.organization_id AND i.id=ac.integration_id
    WHERE r.status='RETRY' AND r.event_kind='leadgen' AND r.error_code IN
      ('LEAD_DATA_PENDING','META_TOKEN_UNAVAILABLE','META_LEAD_FETCH_FAILED','META_LEAD_INVALID')
      AND r.attempts<r.max_attempts AND r.next_retry_at<=now()
      AND r.organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30'
      AND a.external_asset_id='405695562628937' AND r.normalized->>'formId'='612660371798285'
      AND i.provider_code='META' AND i.app_id='919434760646769'
      AND i.external_business_id='1865633431087642'
      AND a.status='SUBSCRIBED' AND ac.status='ACTIVE' AND i.status='CONNECTED'
    ORDER BY r.next_retry_at,r.received_at LIMIT p_limit FOR UPDATE OF r SKIP LOCKED
  LOOP
    UPDATE public.sales_social_webhook_receipts SET next_retry_at=now()+interval '2 minutes'
      WHERE id=v_row.id;
    RETURN NEXT jsonb_build_object('receiptId',v_row.id,'organizationId',v_row.organization_id,
      'integrationId',v_row.integration_id,'externalLeadId',v_row.normalized->>'externalLeadId',
      'pageId',v_row.normalized->>'pageId','formId',v_row.normalized->>'formId',
      'tokenCiphertext',v_row.token_ciphertext,'tokenExpiresAt',v_row.token_expires_at);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_claim_social_leads(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_claim_social_leads(integer) TO service_role;


CREATE OR REPLACE FUNCTION public.native_sales_complete_meta_page(
  p_state_id uuid,p_organization_id uuid,p_actor_member_id uuid,
  p_integration_id uuid,p_page_id text,p_page_name text,
  p_business_id text,p_business_name text,p_instagram_id text,
  p_user_token_ciphertext text,p_page_token_ciphertext text,p_user_expires_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
DECLARE v_state public.sales_social_oauth_states%ROWTYPE;
DECLARE v_account_id uuid;
DECLARE v_asset_id uuid;
BEGIN
  IF p_organization_id IS DISTINCT FROM '9efab353-46a0-43d1-9901-e3f185dc5d30'::uuid
    OR p_page_id IS DISTINCT FROM '405695562628937'
    OR p_business_id IS DISTINCT FROM '1865633431087642' THEN
    RAISE EXCEPTION 'META_PAGE_INVALID' USING ERRCODE='22023'; END IF;
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_state_id IS NULL OR p_organization_id IS NULL OR p_actor_member_id IS NULL
    OR p_integration_id IS NULL OR p_page_id IS NULL OR length(p_page_id) NOT BETWEEN 1 AND 200
    OR p_page_name IS NULL OR length(p_page_name) NOT BETWEEN 1 AND 500
    OR length(coalesce(p_business_id,''))>200 OR length(coalesce(p_business_name,''))>500
    OR length(coalesce(p_instagram_id,''))>200
    OR p_user_token_ciphertext IS NULL OR p_page_token_ciphertext IS NULL
    OR p_user_expires_at IS NULL OR p_user_expires_at<=now() THEN
    RAISE EXCEPTION 'META_CONNECTION_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_state FROM public.sales_social_oauth_states
    WHERE id=p_state_id FOR UPDATE;
  IF NOT FOUND OR v_state.organization_id<>p_organization_id
    OR v_state.requester_member_id<>p_actor_member_id
    OR v_state.status<>'EXCHANGED' OR v_state.expires_at<=now()
    OR v_state.grant_ciphertext IS NULL OR v_state.pages_ciphertext IS NULL THEN
    RAISE EXCEPTION 'META_GRANT_UNAVAILABLE' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members WHERE organization_id=p_organization_id
    AND id=v_state.default_owner_member_id AND status='active') THEN
    RAISE EXCEPTION 'META_OWNER_UNAVAILABLE' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_social_providers WHERE code='META' AND enabled) THEN
    RAISE EXCEPTION 'META_PROVIDER_DISABLED' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.sales_social_assets
    WHERE external_asset_id=p_page_id AND status IN ('READY','SUBSCRIBED')) THEN
    RAISE EXCEPTION 'META_PAGE_ALREADY_CONNECTED' USING ERRCODE='23505'; END IF;
  INSERT INTO public.sales_social_integrations
    (id,organization_id,provider_code,app_id,external_business_id,external_business_name,
     status,granted_permissions,token_ciphertext,token_expires_at,connected_at,
     created_by,updated_by)
    VALUES (p_integration_id,p_organization_id,'META','919434760646769',nullif(p_business_id,''),
      nullif(p_business_name,''),'CONNECTED',v_state.granted_scopes,
      p_user_token_ciphertext,p_user_expires_at,now(),p_actor_member_id,p_actor_member_id);
  INSERT INTO public.sales_social_accounts
    (organization_id,integration_id,external_account_id,display_name,account_type)
    VALUES (p_organization_id,p_integration_id,coalesce(nullif(p_business_id,''),p_page_id),
      coalesce(nullif(p_business_name,''),p_page_name),
      CASE WHEN nullif(p_business_id,'') IS NULL THEN 'page' ELSE 'business' END)
    RETURNING id INTO v_account_id;
  INSERT INTO public.sales_social_assets
    (organization_id,account_id,external_asset_id,asset_type,display_name,status,
     default_owner_member_id,default_team_id,token_ciphertext,token_expires_at)
    VALUES (p_organization_id,v_account_id,p_page_id,'page',p_page_name,'READY',
      v_state.default_owner_member_id,v_state.default_team_id,
      p_page_token_ciphertext,p_user_expires_at)
    RETURNING id INTO v_asset_id;
  IF nullif(p_instagram_id,'') IS NOT NULL THEN
    INSERT INTO public.sales_social_assets
      (organization_id,account_id,external_asset_id,asset_type,display_name,status,
       default_owner_member_id,default_team_id,token_ciphertext,token_expires_at)
      VALUES (p_organization_id,v_account_id,p_instagram_id,'instagram',
        p_page_name||' Instagram','READY',v_state.default_owner_member_id,
        v_state.default_team_id,p_page_token_ciphertext,p_user_expires_at);
  END IF;
  UPDATE public.sales_social_oauth_states
    SET status='CONSUMED',consumed_at=now(),grant_ciphertext=NULL,pages_ciphertext=NULL
    WHERE id=p_state_id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,'social_connection',p_integration_id,p_actor_member_id,
      'meta.connection.created',gen_random_uuid(),
      jsonb_build_object('assetId',v_asset_id,'pageId',p_page_id));
  RETURN jsonb_build_object('integrationId',p_integration_id,'assetId',v_asset_id,
    'status','READY');
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_complete_meta_page(
  uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_complete_meta_page(
  uuid,uuid,uuid,uuid,text,text,text,text,text,text,text,timestamptz)
  TO service_role;

-- Record a successful provider subscription and its audit event together.

-- Enable only the existing Meta provider; server and SQL guards bind EMC assets.
UPDATE public.sales_social_providers SET enabled=true WHERE code='META'
  AND EXISTS(SELECT 1 FROM public.sales_organizations WHERE id='9efab353-46a0-43d1-9901-e3f185dc5d30'
    AND code='emc' AND status='active');
