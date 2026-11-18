-- Disable ingestion before rollback; retain all acquired leads and audit rows.
BEGIN;
UPDATE public.sales_social_assets SET status='DISABLED' WHERE organization_id='9efab353-46a0-43d1-9901-e3f185dc5d30' AND external_asset_id='405695562628937';
DROP INDEX public.sales_social_emc_external_lead_unique;
-- Verified-provider receipt boundary. The HTTP handler must validate the raw
-- Meta signature before calling this service-role-only function.
CREATE OR REPLACE FUNCTION public.native_sales_receive_social_event(
  p_external_asset_id text,p_external_event_id text,p_kind text,
  p_occurred_at timestamptz,p_normalized jsonb,p_payload_hash text,
  p_correlation_id uuid,p_operation_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_asset public.sales_social_assets%ROWTYPE;
DECLARE v_asset_id uuid;
DECLARE v_matches integer;
DECLARE v_receipt public.sales_social_webhook_receipts%ROWTYPE;
DECLARE v_fields jsonb;
DECLARE v_email text;
DECLARE v_phone text;
DECLARE v_name text;
DECLARE v_existing_count integer;
DECLARE v_lead_id uuid;
DECLARE v_subject text;
DECLARE v_conversation_id uuid;
DECLARE v_lock_email bigint;
DECLARE v_lock_phone bigint;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_external_asset_id IS NULL OR length(p_external_asset_id) NOT BETWEEN 1 AND 200
    OR p_external_event_id IS NULL OR length(p_external_event_id) NOT BETWEEN 1 AND 240
    OR p_kind NOT IN ('leadgen','message','comment','unknown')
    OR p_occurred_at IS NULL OR p_occurred_at>now()+interval '5 minutes'
    OR p_occurred_at<now()-interval '7 days'
    OR p_normalized IS NULL OR jsonb_typeof(p_normalized)<>'object'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$'
    OR p_correlation_id IS NULL OR p_operation_id IS NULL THEN
    RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023';
  END IF;
  SELECT count(*), (array_agg(a.id))[1] INTO v_matches,v_asset_id
  FROM public.sales_social_assets a
  JOIN public.sales_social_accounts ac ON ac.organization_id=a.organization_id AND ac.id=a.account_id
  JOIN public.sales_social_integrations i ON i.organization_id=ac.organization_id AND i.id=ac.integration_id
  JOIN public.sales_social_providers p ON p.code=i.provider_code
  WHERE a.external_asset_id=p_external_asset_id AND a.status='SUBSCRIBED'
    AND ac.status='ACTIVE' AND i.status='CONNECTED' AND i.provider_code='META' AND p.enabled;
  IF v_matches<>1 THEN RAISE EXCEPTION 'META_ASSET_UNAVAILABLE' USING ERRCODE='P0002'; END IF;
  SELECT * INTO v_asset FROM public.sales_social_assets WHERE id=v_asset_id;
  INSERT INTO public.sales_social_webhook_receipts
    (organization_id,asset_id,external_event_id,event_kind,object_type,payload_hash,
     occurred_at,correlation_id,operation_id,normalized)
    VALUES (v_asset.organization_id,v_asset.id,p_external_event_id,p_kind,
      coalesce(p_normalized->>'channel','page'),p_payload_hash,p_occurred_at,
      p_correlation_id,p_operation_id,p_normalized)
    ON CONFLICT (organization_id,asset_id,external_event_id) DO NOTHING;
  SELECT * INTO v_receipt FROM public.sales_social_webhook_receipts
    WHERE organization_id=v_asset.organization_id AND asset_id=v_asset.id
      AND external_event_id=p_external_event_id FOR UPDATE;
  IF v_receipt.payload_hash<>p_payload_hash THEN
    RAISE EXCEPTION 'META_REPLAY_CONFLICT' USING ERRCODE='23505'; END IF;
  IF v_receipt.status<>'PENDING' THEN
    RETURN jsonb_build_object('status',v_receipt.status,'replayed',true); END IF;
  IF p_kind='leadgen' THEN
    IF nullif(p_normalized->>'externalLeadId','') IS NULL THEN
      RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
    v_fields:=p_normalized->'fields';
    IF v_fields IS NULL OR jsonb_typeof(v_fields)<>'object' THEN
      UPDATE public.sales_social_webhook_receipts
        SET status='RETRY',attempts=attempts+1,next_retry_at=now()+interval '1 minute',
            error_code='LEAD_DATA_PENDING' WHERE id=v_receipt.id;
      RETURN jsonb_build_object('status','RETRY','replayed',false);
    END IF;
    v_email:=nullif(lower(btrim(coalesce(v_fields->>'email',v_fields->>'email_address',''))),'');
    v_phone:=nullif(regexp_replace(coalesce(v_fields->>'phone_number',v_fields->>'phone',''),
      '[^0-9+]','','g'),'');
    IF v_email IS NOT NULL THEN
      v_lock_email:=hashtextextended(v_asset.organization_id::text||'leademail:'||v_email,0);
    END IF;
    IF v_phone IS NOT NULL THEN
      v_lock_phone:=hashtextextended(v_asset.organization_id::text||'leadphone:'||v_phone,0);
    END IF;
    IF v_lock_email IS NOT NULL AND v_lock_phone IS NOT NULL THEN
      PERFORM pg_advisory_xact_lock(least(v_lock_email,v_lock_phone));
      IF v_lock_email<>v_lock_phone THEN
        PERFORM pg_advisory_xact_lock(greatest(v_lock_email,v_lock_phone)); END IF;
    ELSIF v_lock_email IS NOT NULL THEN PERFORM pg_advisory_xact_lock(v_lock_email);
    ELSIF v_lock_phone IS NOT NULL THEN PERFORM pg_advisory_xact_lock(v_lock_phone);
    END IF;
    SELECT count(*),(array_agg(id))[1] INTO v_existing_count,v_lead_id
      FROM public.sales_leads l WHERE l.organization_id=v_asset.organization_id
        AND l.archived_at IS NULL AND ((v_email IS NOT NULL AND lower(l.email)=v_email)
          OR (v_phone IS NOT NULL AND regexp_replace(coalesce(l.phone,''),'[^0-9+]','','g')=v_phone));
    IF v_existing_count>1 THEN
      UPDATE public.sales_social_webhook_receipts
        SET status='RETRY',attempts=attempts+1,next_retry_at=now()+interval '1 hour',
            error_code='AMBIGUOUS_LEAD_MATCH' WHERE id=v_receipt.id;
      RETURN jsonb_build_object('status','RETRY','replayed',false);
    END IF;
    IF v_existing_count=0 THEN
      IF NOT EXISTS (SELECT 1 FROM public.sales_members WHERE organization_id=v_asset.organization_id
        AND id=v_asset.default_owner_member_id AND status='active') THEN
        UPDATE public.sales_social_webhook_receipts
          SET status='RETRY',attempts=attempts+1,next_retry_at=now()+interval '1 hour',
              error_code='OWNER_NOT_ELIGIBLE' WHERE id=v_receipt.id;
        RETURN jsonb_build_object('status','RETRY','replayed',false);
      END IF;
      v_name:=nullif(btrim(coalesce(v_fields->>'full_name',
        concat_ws(' ',v_fields->>'first_name',v_fields->>'last_name'))),'');
      v_name:=left(coalesce(v_name,v_email,v_phone,'Meta Lead'),500);
      INSERT INTO public.sales_leads
        (organization_id,owner_member_id,team_id,display_name,first_name,last_name,
         email,phone,company_name,source,created_by,updated_by)
        VALUES (v_asset.organization_id,v_asset.default_owner_member_id,v_asset.default_team_id,
          v_name,left(v_fields->>'first_name',500),left(v_fields->>'last_name',500),
          v_email,v_phone,left(v_fields->>'company_name',500),'meta_lead_ads',
          v_asset.default_owner_member_id,v_asset.default_owner_member_id)
        RETURNING id INTO v_lead_id;
      INSERT INTO public.sales_history
        (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
        VALUES (v_asset.organization_id,'lead',v_lead_id,NULL,'meta.lead.created',
          p_correlation_id,jsonb_build_object('assetId',v_asset.id,'receiptId',v_receipt.id));
    END IF;
    INSERT INTO public.sales_social_leads
      (organization_id,asset_id,receipt_id,external_lead_id,fingerprint_hash,lead_id,
       campaign_id,adset_id,ad_id,form_id,page_id,operation_id)
      VALUES (v_asset.organization_id,v_asset.id,v_receipt.id,
        p_normalized->>'externalLeadId',md5(coalesce(p_normalized->>'externalLeadId','')),
        v_lead_id,nullif(p_normalized->>'campaignId',''),nullif(p_normalized->>'adsetId',''),
        nullif(p_normalized->>'adId',''),nullif(p_normalized->>'formId',''),
        nullif(p_normalized->>'pageId',''),p_operation_id);
    INSERT INTO public.sales_history
      (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
      VALUES (v_asset.organization_id,'lead',v_lead_id,NULL,'meta.lead.attributed',
        p_correlation_id,jsonb_build_object('assetId',v_asset.id,'receiptId',v_receipt.id,
          'campaignId',p_normalized->>'campaignId','adsetId',p_normalized->>'adsetId',
          'adId',p_normalized->>'adId','formId',p_normalized->>'formId'));
  ELSIF p_kind='message' THEN
    v_subject:=nullif(p_normalized->>'externalSubjectId','');
    IF v_subject IS NULL THEN
      UPDATE public.sales_social_webhook_receipts
        SET status='FAILED',attempts=attempts+1,error_code='MESSAGE_SUBJECT_MISSING'
        WHERE id=v_receipt.id;
      RETURN jsonb_build_object('status','FAILED','replayed',false);
    ELSE
      INSERT INTO public.sales_social_conversations
        (organization_id,asset_id,external_subject_id,channel,kind,last_event_at,last_text,
         owner_member_id)
        VALUES (v_asset.organization_id,v_asset.id,v_subject,
          coalesce(p_normalized->>'channel','page'),'message',p_occurred_at,
          p_normalized->>'text',v_asset.default_owner_member_id)
        ON CONFLICT (organization_id,asset_id,external_subject_id,channel,kind)
        DO UPDATE SET last_event_at=excluded.last_event_at,last_text=excluded.last_text,
          updated_at=now() RETURNING id INTO v_conversation_id;
      INSERT INTO public.sales_social_messages
        (organization_id,conversation_id,external_message_id,direction,text_content,occurred_at)
        VALUES (v_asset.organization_id,v_conversation_id,p_external_event_id,
          CASE WHEN p_normalized->>'direction'='OUTBOUND' THEN 'OUTBOUND' ELSE 'INBOUND' END,
          p_normalized->>'text',p_occurred_at);
    END IF;
  ELSIF p_kind='comment' THEN
    INSERT INTO public.sales_social_comments
      (organization_id,asset_id,external_comment_id,external_parent_id,external_post_id,
       direction,text_content,occurred_at)
      VALUES (v_asset.organization_id,v_asset.id,p_external_event_id,
        nullif(p_normalized->>'externalParentId',''),nullif(p_normalized->>'externalPostId',''),
        'INBOUND',p_normalized->>'text',p_occurred_at);
  END IF;
  UPDATE public.sales_social_webhook_receipts
    SET status='PROCESSED',attempts=attempts+1,processed_at=now(),error_code=NULL,
        next_retry_at=NULL
    WHERE id=v_receipt.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (v_asset.organization_id,'social_webhook',v_receipt.id,NULL,
      'meta.webhook.accepted',p_correlation_id,
      jsonb_build_object('kind',p_kind,'status','PROCESSED','assetId',v_asset.id));
  UPDATE public.sales_social_assets
    SET last_event_at=greatest(coalesce(last_event_at,p_occurred_at),p_occurred_at)
    WHERE id=v_asset.id;
  RETURN jsonb_build_object('status','PROCESSED','replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_receive_social_event(text,text,text,timestamptz,jsonb,text,uuid,uuid)
  TO service_role;


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
      AND a.status='SUBSCRIBED' AND ac.status='ACTIVE' AND i.status='CONNECTED'
    ORDER BY r.next_retry_at,r.received_at LIMIT p_limit FOR UPDATE OF r SKIP LOCKED
  LOOP
    UPDATE public.sales_social_webhook_receipts SET next_retry_at=now()+interval '2 minutes'
      WHERE id=v_row.id;
    RETURN NEXT jsonb_build_object('receiptId',v_row.id,'organizationId',v_row.organization_id,
      'integrationId',v_row.integration_id,'externalLeadId',v_row.normalized->>'externalLeadId',
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
    (id,organization_id,provider_code,external_business_id,external_business_name,
     status,granted_permissions,token_ciphertext,token_expires_at,connected_at,
     created_by,updated_by)
    VALUES (p_integration_id,p_organization_id,'META',nullif(p_business_id,''),
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

COMMIT;
