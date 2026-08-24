-- Un departamento con un dominio corporativo asociado no se podía borrar:
-- la FK era estricta y el chequeo de la app no contaba esta tabla, así que el
-- usuario recibía el error crudo de Postgres (caso real: borrar VNF).
-- Con SET NULL, borrar el departamento desvincula el dominio en vez de bloquear.
ALTER TABLE public.dominios_corporativos
  DROP CONSTRAINT dominios_corporativos_departamento_id_fkey;

ALTER TABLE public.dominios_corporativos
  ADD CONSTRAINT dominios_corporativos_departamento_id_fkey
  FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
  ON DELETE SET NULL;
