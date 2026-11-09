-- Owner-authorized Medical grant minimization; apply only through protected release.
-- Scope: only Medical registry table privileges. No rows/policies/functions change.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';
REVOKE ALL PRIVILEGES ON TABLE
  public.pacientes, public.paciente_fuentes, public.paciente_contactos
  FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.pacientes, public.paciente_fuentes, public.paciente_contactos
  FROM authenticated;
COMMIT;
