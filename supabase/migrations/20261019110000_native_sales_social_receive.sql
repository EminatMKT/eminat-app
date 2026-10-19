-- Verified-provider receipt boundary. The HTTP handler must validate the raw
-- Meta signature before calling this service-role-only function.
CREATE FUNCTION public.native_sales_receive_social_event(
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

-- A private worker may call this after a successful Graph fetch. It never
-- accepts a browser principal and retains the original signed event hash.
CREATE FUNCTION public.native_sales_retry_social_lead(
  p_receipt_id uuid,p_fields jsonb
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_receipt public.sales_social_webhook_receipts%ROWTYPE;
DECLARE v_asset public.sales_social_assets%ROWTYPE;
DECLARE v_normalized jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501'; END IF;
  IF p_fields IS NULL OR jsonb_typeof(p_fields)<>'object' OR p_fields='{}'::jsonb THEN
    RAISE EXCEPTION 'META_EVENT_INVALID' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_receipt FROM public.sales_social_webhook_receipts
    WHERE id=p_receipt_id FOR UPDATE;
  IF NOT FOUND OR v_receipt.event_kind<>'leadgen' OR v_receipt.status<>'RETRY'
    OR v_receipt.attempts>=v_receipt.max_attempts THEN
    RAISE EXCEPTION 'META_RETRY_UNAVAILABLE' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_asset FROM public.sales_social_assets
    WHERE organization_id=v_receipt.organization_id AND id=v_receipt.asset_id;
  v_normalized:=jsonb_set(v_receipt.normalized,'{fields}',p_fields,true);
  UPDATE public.sales_social_webhook_receipts SET status='PENDING',
    normalized=v_normalized,next_retry_at=NULL,error_code=NULL
    WHERE id=v_receipt.id;
  RETURN public.native_sales_receive_social_event(v_asset.external_asset_id,
    v_receipt.external_event_id,'leadgen',v_receipt.occurred_at,v_normalized,
    v_receipt.payload_hash,v_receipt.correlation_id,v_receipt.operation_id);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_retry_social_lead(uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_retry_social_lead(uuid,jsonb)
  TO service_role;
