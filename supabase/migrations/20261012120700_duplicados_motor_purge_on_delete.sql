-- The dedup tables hold generic ids with no FK to `pacientes`, so a pair naming a deleted
-- patient would stay queued forever and every decision on it would fail. Per-entity hook, like
-- `funcion_candidatos`/`hijos`: a second entity needs its own equivalent trigger on its table.
CREATE OR REPLACE FUNCTION public.pacientes_purgar_duplicados()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  DELETE FROM public.duplicados_pendientes
    WHERE entidad = 'pacientes' AND OLD.id IN (item_id_a, item_id_b);
  DELETE FROM public.duplicados_descartes
    WHERE entidad = 'pacientes' AND OLD.id IN (item_id_a, item_id_b);
  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.pacientes_purgar_duplicados() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS pacientes_purgar_duplicados ON public.pacientes;
CREATE TRIGGER pacientes_purgar_duplicados
  AFTER DELETE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.pacientes_purgar_duplicados();
