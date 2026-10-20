-- Patient Portal identities are explicit bindings to Native Sales contacts.
-- No browser role can access these tables directly. ANNIE is not involved.
CREATE UNIQUE INDEX sales_patient_self_registration_email_unique
  ON public.sales_contacts (organization_id, lower(btrim(email)))
  WHERE source = 'PATIENT_PORTAL' AND email IS NOT NULL;

CREATE TABLE public.sales_patient_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  contact_id uuid NOT NULL,
  source text NOT NULL CHECK (source IN ('SELF_REGISTRATION','APPROVED_LEGACY')),
  legacy_portal_identity_id text,
  approved_evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, contact_id)
    REFERENCES public.sales_contacts(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (auth_id),
  UNIQUE (organization_id, id),
  UNIQUE (organization_id, contact_id),
  UNIQUE (organization_id, legacy_portal_identity_id)
);

CREATE TABLE public.sales_patient_enrollment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  patient_identity_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('ESSENTIAL','PLUS','MAX')),
  membership_type text NOT NULL CHECK (membership_type IN ('INDIVIDUAL','FAMILY')),
  duration text NOT NULL CHECK (duration IN ('MONTHLY','3M','6M','12M')),
  initial_months smallint NOT NULL CHECK (initial_months IN (2,3,6,12)),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  status text NOT NULL DEFAULT 'PAYMENT_UNAVAILABLE'
    CHECK (status IN ('PAYMENT_UNAVAILABLE','PAYMENT_PENDING','CANCELLED','FULFILLED')),
  membership_id uuid,
  idempotency_key uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (organization_id, membership_id)
    REFERENCES public.sales_memberships(organization_id, id) ON DELETE RESTRICT,
  FOREIGN KEY (organization_id, patient_identity_id)
    REFERENCES public.sales_patient_identities(organization_id, id) ON DELETE RESTRICT,
  UNIQUE (patient_identity_id, idempotency_key)
);

CREATE TABLE public.sales_patient_sessions (
  handle_hash text PRIMARY KEY CHECK (handle_hash ~ '^[0-9a-f]{64}$'),
  auth_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX sales_patient_sessions_auth_idx ON public.sales_patient_sessions(auth_id, expires_at);

ALTER TABLE public.sales_patient_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_patient_enrollment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_patient_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_patient_identities, public.sales_patient_enrollment_intents,
  public.sales_patient_sessions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sales_patient_identities,
  public.sales_patient_enrollment_intents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_patient_sessions TO service_role;

-- Service-only transaction. The caller must first validate the Supabase Auth
-- token and verified email. A matching CRM email is deliberately a conflict,
-- never proof of ownership. Existing CRM contacts require owner review.
CREATE FUNCTION public.native_sales_patient_claim_contact(
  p_auth_id uuid, p_email text, p_first_name text, p_last_name text,
  p_phone text, p_organization_id uuid, p_owner_member_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_existing uuid; v_contact uuid; v_email text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PATIENT_SERVER_ONLY' USING ERRCODE = '42501';
  END IF;
  v_email := lower(btrim(p_email));
  IF p_auth_id IS NULL OR p_organization_id IS NULL OR p_owner_member_id IS NULL OR
     p_first_name IS NULL OR p_last_name IS NULL OR v_email IS NULL OR
     v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR
     length(v_email) > 320 OR
     length(btrim(p_first_name)) NOT BETWEEN 1 AND 160 OR
     length(btrim(p_last_name)) NOT BETWEEN 1 AND 160 OR
     (p_phone IS NOT NULL AND length(btrim(p_phone)) > 40) THEN
    RAISE EXCEPTION 'PATIENT_PROFILE_INVALID';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users
    WHERE id = p_auth_id AND lower(email) = v_email AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'PATIENT_AUTH_IDENTITY_UNVERIFIED' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_email, 0));
  SELECT contact_id INTO v_existing FROM public.sales_patient_identities WHERE auth_id = p_auth_id;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales_members WHERE id = p_owner_member_id
    AND organization_id = p_organization_id AND (
      status = 'active' OR
      (status = 'pending' AND role = 'SUPERADMIN'
        AND id = 'c67e9779-9e87-48b0-9f6c-bf6a0c8cebad'::uuid
        AND user_id = '2344e112-76ef-42a8-ac56-7c488084e0f5'::uuid
        AND evidence_ref = 'owner-approved-emc-patient-fallback-2026-10-20'
        AND NOT EXISTS (SELECT 1 FROM public.sales_members active_emc
          WHERE active_emc.organization_id = p_organization_id AND active_emc.status = 'active')))) OR
     NOT EXISTS (SELECT 1 FROM public.sales_organizations WHERE id = p_organization_id AND status = 'active') THEN
    RAISE EXCEPTION 'PATIENT_ORGANIZATION_UNAVAILABLE';
  END IF;
  -- A contact in another Sales organization is still an identity ambiguity.
  -- Never create a duplicate or infer ownership from its email address.
  IF EXISTS (SELECT 1 FROM public.sales_contacts
      WHERE lower(btrim(email)) = v_email) THEN
    RAISE EXCEPTION 'PATIENT_CONTACT_REVIEW_REQUIRED';
  END IF;
  INSERT INTO public.sales_contacts (
    organization_id, owner_member_id, display_name, first_name, last_name,
    email, phone, corazon_salud, source, created_by, updated_by
  ) VALUES (
    p_organization_id, p_owner_member_id,
    btrim(p_first_name) || ' ' || btrim(p_last_name),
    btrim(p_first_name), btrim(p_last_name), v_email, nullif(btrim(p_phone),''), true,
    'PATIENT_PORTAL',
    p_owner_member_id, p_owner_member_id
  ) RETURNING id INTO v_contact;
  INSERT INTO public.sales_patient_identities
    (organization_id, auth_id, contact_id, source, approved_evidence)
  VALUES (p_organization_id, p_auth_id, v_contact, 'SELF_REGISTRATION', 'verified Supabase Auth session; self-submitted profile');
  INSERT INTO public.sales_history
    (organization_id, entity_type, record_id, actor_member_id, action, request_id, changes)
  VALUES (p_organization_id, 'contact', v_contact, p_owner_member_id, 'patient_self_registered',
    gen_random_uuid(), jsonb_build_object('identitySource', 'SELF_REGISTRATION'));
  RETURN v_contact;
END;
$$;
REVOKE ALL ON FUNCTION public.native_sales_patient_claim_contact(uuid,text,text,text,text,uuid,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.native_sales_patient_claim_contact(uuid,text,text,text,text,uuid,uuid)
  TO service_role;
