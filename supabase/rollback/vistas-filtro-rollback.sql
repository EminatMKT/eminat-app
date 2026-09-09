-- Deshace 20260904221516_vistas_filtro.sql. La tabla es nueva y no la referencia nadie, así que
-- alcanza con soltarla: la policy, los índices y el REVOKE se van con ella.
--
-- Lo que NO se puede deshacer: las vistas que la gente haya guardado. Antes de correr esto,
-- `pg_dump --data-only -t public.vistas_filtro` si hay filas que valga la pena conservar.
DROP TABLE IF EXISTS public.vistas_filtro;
