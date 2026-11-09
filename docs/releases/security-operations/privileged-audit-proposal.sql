-- REVIEWED PROPOSAL. Apply only through protected schema_check/apply/verify.
BEGIN;
CREATE TABLE public.native_security_privileged_events (
 request_id uuid PRIMARY KEY,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 action text NOT NULL CHECK(action IN ('admin.role.created','admin.role.updated','admin.role.deleted',
  'admin.user.updated','admin.user.scopes.updated','admin.catalog.created','admin.catalog.updated','admin.catalog.deleted')),
 actor_id uuid NOT NULL,
 organization_id uuid,
 resource_id uuid,
 resource_key_digest text CHECK(resource_key_digest ~ '^[a-f0-9]{64}$'),
 changed_fields text[] NOT NULL DEFAULT '{}',
 outcome text NOT NULL DEFAULT 'SUCCESS' CHECK(outcome='SUCCESS'),
 CHECK(cardinality(changed_fields)<=24 AND changed_fields <@ ARRAY['label','modules','rol','tipo','activo',
  'validado','empresa_id','equipo_id','jornada_id','vinculacion_id','cargoIds','directorio_visible','codes',
  'nombre','apellido','email','color','ubicacion','codigo','departamento_id','lider_id']::text[])
);
CREATE INDEX native_security_privileged_events_time ON public.native_security_privileged_events(occurred_at);
CREATE INDEX native_security_privileged_events_actor ON public.native_security_privileged_events(actor_id,occurred_at);
ALTER TABLE public.native_security_privileged_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.native_security_privileged_events FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.native_security_append_privileged_event(
 p_request_id uuid,p_action text,p_actor_id uuid,p_organization_id uuid,
 p_resource_id uuid,p_resource_key_digest text,p_changed_fields text[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $function$
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN
  RAISE EXCEPTION 'SECURITY_AUDIT_ACCESS_DENIED' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.native_security_privileged_events(request_id,action,actor_id,organization_id,
  resource_id,resource_key_digest,changed_fields)
 VALUES(p_request_id,p_action,p_actor_id,p_organization_id,p_resource_id,p_resource_key_digest,p_changed_fields)
 ON CONFLICT(request_id) DO NOTHING;
END;
$function$;
REVOKE ALL ON FUNCTION public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[]) TO service_role;
COMMIT;
