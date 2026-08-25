-- Borrar una tarea referenciada por notificaciones, slots_calendario o solicitudes
-- fallaba con FK violation (las tres FKs eran NO ACTION). Las tres columnas son
-- nullable y el link no tiene sentido sin la tarea: SET NULL desvincula en vez
-- de bloquear (mismo patrón que 20260824150000 para dominios_corporativos).
ALTER TABLE public.notificaciones
  DROP CONSTRAINT notificaciones_actividad_id_fkey;

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;

ALTER TABLE public.slots_calendario
  DROP CONSTRAINT slots_calendario_actividad_id_fkey;

ALTER TABLE public.slots_calendario
  ADD CONSTRAINT slots_calendario_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;

ALTER TABLE public.solicitudes
  DROP CONSTRAINT solicitudes_actividad_id_fkey;

ALTER TABLE public.solicitudes
  ADD CONSTRAINT solicitudes_actividad_id_fkey
  FOREIGN KEY (actividad_id) REFERENCES public.actividades(id)
  ON DELETE SET NULL;
