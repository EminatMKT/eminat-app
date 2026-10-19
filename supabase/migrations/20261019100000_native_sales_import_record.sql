-- Each import row is one transaction. Receipts make both created and skipped
-- outcomes stable on retries; no uploaded file content is retained here.
CREATE TABLE public.sales_import_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.sales_organizations(id) ON DELETE RESTRICT,
  actor_member_id uuid NOT NULL,
  resource text NOT NULL CHECK (resource IN ('leads','contacts')),
  idempotency_key text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
  payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  outcome text CHECK (outcome IN ('CREATED','SKIPPED')),
  record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  FOREIGN KEY (organization_id,actor_member_id)
    REFERENCES public.sales_members(organization_id,id) ON DELETE RESTRICT,
  UNIQUE (organization_id,actor_member_id,resource,idempotency_key),
  CHECK ((outcome IS NULL AND completed_at IS NULL AND record_id IS NULL)
    OR (outcome='SKIPPED' AND completed_at IS NOT NULL AND record_id IS NULL)
    OR (outcome='CREATED' AND completed_at IS NOT NULL AND record_id IS NOT NULL))
);
CREATE INDEX sales_import_receipts_actor_idx ON public.sales_import_receipts
  (organization_id,actor_member_id,created_at DESC);
ALTER TABLE public.sales_import_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_import_receipts FROM PUBLIC,anon,authenticated,service_role;
GRANT ALL ON public.sales_import_receipts TO service_role;

CREATE FUNCTION public.native_sales_import_record(
  p_organization_id uuid,p_actor_member_id uuid,p_resource text,p_data jsonb,
  p_idempotency_key text,p_payload_hash text,p_duplicate_mode text,p_request_id uuid
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_actor public.sales_members%ROWTYPE;
DECLARE v_receipt public.sales_import_receipts%ROWTYPE;
DECLARE v_email text;
DECLARE v_phone text;
DECLARE v_extra jsonb;
DECLARE v_record_id uuid;
DECLARE v_lead public.sales_leads%ROWTYPE;
DECLARE v_contact jsonb;
DECLARE v_lock_email bigint;
DECLARE v_lock_phone bigint;
DECLARE v_duplicate boolean;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'SALES_SERVER_ONLY' USING ERRCODE='42501';
  END IF;
  IF p_resource NOT IN ('leads','contacts') OR p_duplicate_mode NOT IN ('SKIP','CREATE')
    OR p_request_id IS NULL OR p_data IS NULL OR jsonb_typeof(p_data)<>'object'
    OR p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,128}$'
    OR p_payload_hash IS NULL OR p_payload_hash !~ '^[a-f0-9]{64}$'
    OR length(coalesce(p_data->>'displayName','')) NOT BETWEEN 1 AND 500
    OR (p_resource='leads' AND length(coalesce(p_data->>'source','')) NOT BETWEEN 1 AND 500)
    OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_data) AS key WHERE key NOT IN
      ('displayName','source','email','phone','companyName','firstName','lastName',
       'title','website','industry','address','description','doNotCall','doNotEmail',
       'nextAction','nextFollowUpAt','dateOfBirth','insurance','corazonSalud',
       'plan','product'))
    OR (p_resource='contacts' AND EXISTS
      (SELECT 1 FROM jsonb_object_keys(p_data) AS key
       WHERE key IN ('source','companyName','website','industry')))
  THEN RAISE EXCEPTION 'INVALID_REQUEST' USING ERRCODE='22023'; END IF;
  SELECT m.* INTO v_actor FROM public.sales_members m
    JOIN public.sales_organizations o ON o.id=m.organization_id
    WHERE m.id=p_actor_member_id AND m.organization_id=p_organization_id
      AND m.status='active' AND o.status='active';
  IF NOT FOUND OR v_actor.role NOT IN ('SELLER','SALES_MANAGER','ADMINISTRATOR','SUPERADMIN') THEN
    RAISE EXCEPTION 'SALES_ACCESS_DENIED' USING ERRCODE='42501';
  END IF;
  v_email:=nullif(lower(btrim(p_data->>'email')),'');
  v_phone:=nullif(regexp_replace(coalesce(p_data->>'phone',''),'[^0-9+]','','g'),'');
  -- Lock both keys in a fixed order so overlapping import workers cannot race.
  IF v_email IS NOT NULL THEN
    v_lock_email:=hashtextextended(p_organization_id::text||p_resource||'email:'||v_email,0);
  END IF;
  IF v_phone IS NOT NULL THEN
    v_lock_phone:=hashtextextended(p_organization_id::text||p_resource||'phone:'||v_phone,0);
  END IF;
  IF v_lock_email IS NOT NULL AND v_lock_phone IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(least(v_lock_email,v_lock_phone));
    IF v_lock_email<>v_lock_phone THEN
      PERFORM pg_advisory_xact_lock(greatest(v_lock_email,v_lock_phone));
    END IF;
  ELSIF v_lock_email IS NOT NULL THEN PERFORM pg_advisory_xact_lock(v_lock_email);
  ELSIF v_lock_phone IS NOT NULL THEN PERFORM pg_advisory_xact_lock(v_lock_phone);
  END IF;
  INSERT INTO public.sales_import_receipts
    (organization_id,actor_member_id,resource,idempotency_key,payload_hash)
    VALUES (p_organization_id,p_actor_member_id,p_resource,p_idempotency_key,p_payload_hash)
    ON CONFLICT (organization_id,actor_member_id,resource,idempotency_key) DO NOTHING;
  SELECT * INTO v_receipt FROM public.sales_import_receipts
    WHERE organization_id=p_organization_id AND actor_member_id=p_actor_member_id
      AND resource=p_resource AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF v_receipt.payload_hash<>p_payload_hash THEN
    RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT' USING ERRCODE='23505';
  END IF;
  IF v_receipt.outcome IS NOT NULL THEN
    RETURN jsonb_build_object('status',v_receipt.outcome,'recordId',v_receipt.record_id,'replayed',true);
  END IF;
  IF p_duplicate_mode='SKIP' AND (v_email IS NOT NULL OR v_phone IS NOT NULL) THEN
    IF p_resource='leads' THEN
      SELECT EXISTS (SELECT 1 FROM public.sales_leads r
        WHERE r.organization_id=p_organization_id AND r.archived_at IS NULL
          AND ((v_email IS NOT NULL AND lower(r.email)=v_email)
            OR (v_phone IS NOT NULL AND regexp_replace(coalesce(r.phone,''),'[^0-9+]','','g')=v_phone)))
        INTO v_duplicate;
    ELSE
      SELECT EXISTS (SELECT 1 FROM public.sales_contacts r
        WHERE r.organization_id=p_organization_id AND r.archived_at IS NULL
          AND ((v_email IS NOT NULL AND lower(r.email)=v_email)
            OR (v_phone IS NOT NULL AND regexp_replace(coalesce(r.phone,''),'[^0-9+]','','g')=v_phone)))
        INTO v_duplicate;
    END IF;
  END IF;
  IF coalesce(v_duplicate,false) THEN
    UPDATE public.sales_import_receipts SET outcome='SKIPPED',completed_at=now()
      WHERE id=v_receipt.id;
    INSERT INTO public.sales_history
      (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
      VALUES (p_organization_id,'import',v_receipt.id,p_actor_member_id,
        'import.skipped_duplicate',p_request_id,
        jsonb_build_object('resource',p_resource));
    RETURN jsonb_build_object('status','SKIPPED','recordId',NULL,'replayed',false);
  END IF;
  IF p_resource='leads' THEN
    v_lead:=public.native_sales_create_lead(p_organization_id,p_actor_member_id,
      p_data->>'displayName',p_data->>'source',p_data->>'email',p_data->>'phone',
      p_data->>'companyName',NULL,NULL,p_idempotency_key,p_payload_hash,p_request_id);
    v_record_id:=v_lead.id;
    v_extra:=p_data-'displayName'-'source'-'email'-'phone'-'companyName';
    IF v_extra<>'{}'::jsonb THEN
      PERFORM public.native_sales_update_lead(p_organization_id,p_actor_member_id,
        v_record_id,v_lead.version,v_extra,p_request_id);
    END IF;
  ELSE
    v_contact:=public.native_sales_create_directory_record(p_organization_id,p_actor_member_id,
      'contacts',p_data->>'displayName',p_data->>'email',p_data->>'phone',NULL,
      NULL,NULL,NULL,NULL,p_idempotency_key,p_payload_hash,p_request_id);
    v_record_id:=(v_contact->>'id')::uuid;
    v_extra:=p_data-'displayName'-'email'-'phone';
    IF v_extra<>'{}'::jsonb THEN
      PERFORM public.native_sales_update_directory_record(p_organization_id,p_actor_member_id,
        'contacts',v_record_id,1,v_extra,p_request_id);
    END IF;
  END IF;
  UPDATE public.sales_import_receipts SET outcome='CREATED',record_id=v_record_id,completed_at=now()
    WHERE id=v_receipt.id;
  INSERT INTO public.sales_history
    (organization_id,entity_type,record_id,actor_member_id,action,request_id,changes)
    VALUES (p_organization_id,left(p_resource,length(p_resource)-1),v_record_id,p_actor_member_id,
      'import.created',p_request_id,jsonb_build_object('receiptId',v_receipt.id));
  RETURN jsonb_build_object('status','CREATED','recordId',v_record_id,'replayed',false);
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_import_record(uuid,uuid,text,jsonb,text,text,text,uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_import_record(uuid,uuid,text,jsonb,text,text,text,uuid)
  TO service_role;
