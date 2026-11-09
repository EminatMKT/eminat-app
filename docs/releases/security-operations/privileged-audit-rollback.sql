-- Non-destructive rollback: revert the application deployment first. Preserve every audit row.
BEGIN;
REVOKE EXECUTE ON FUNCTION public.native_security_append_privileged_event(uuid,text,uuid,uuid,uuid,text,text[]) FROM service_role;
-- No DROP/TRUNCATE/DELETE. Existing evidence remains available only to authorized DB operators.
COMMIT;
