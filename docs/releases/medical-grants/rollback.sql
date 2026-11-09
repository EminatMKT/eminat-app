-- DRAFT rollback to captured 2026-10-29 ACL baseline; reintroduces known excess privileges.
-- Use only after owner-approved rollback decision and rechecking current ACLs.
BEGIN;
SET LOCAL lock_timeout = '5s';
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.pacientes, public.paciente_fuentes, public.paciente_contactos TO anon;
GRANT TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.pacientes, public.paciente_fuentes, public.paciente_contactos TO authenticated;
COMMIT;
