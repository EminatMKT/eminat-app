-- Quién CARGÓ la tarea. Nullable para siempre, y a propósito.
--
-- Hasta hoy no hacía falta preguntarlo: todas las tareas eran de marketing y el responsable
-- alcanzaba. Con cinco áreas cargando en el mismo tablero, «quién metió esto» pasa a ser una
-- pregunta real. `solicitante_id` NO la contesta: significa quién PIDIÓ el trabajo, no quién
-- cargó la fila, y se usa en 6 de 266 filas.
--
-- Por qué no alcanza con arreglar `historial`: el log ya registra el alta (`accion='created'`),
-- pero su única policy es `historial_admin_read USING is_admin()`. Un usuario normal que abra
-- el detalle de una tarea no vería esa fila — el dato quedaría escrito e invisible justo para
-- quien lo quiere leer. Abrir `historial` a todos no es opción: guarda `valor_anterior` y
-- `valor_nuevo` de cada cambio de cada tabla. Además `historial.registro_id` no tiene FK ni
-- unicidad sobre `accion='created'`: estructuralmente no puede prometer un creador por fila.
--
-- SIN BACKFILL. No hay de dónde sacarlo: `historial` registra las 282 altas con `usuario_id`
-- en NULL. Poner el responsable ahí sería inventar un dato. Las filas viejas muestran «—».
--
-- ON DELETE SET NULL, como el resto de las FK de esta tabla (ver
-- 20260825120000_actividades_fks_set_null.sql): borrar a una persona no borra las tareas que
-- cargó, sólo pierde la atribución.
--
-- El nombre: `created_by_id` y no `creado_por_id` ni `created_by`. `reuniones` ya usa inglés
-- para esta misma columna; el sufijo `_id` es lo que pide la regla de nombres de FK para una
-- clave surrogate (uuid). `reuniones.created_by` se aparta de esa regla y esto no repite la
-- desviación — unificarlas es un trabajo aparte.
--
-- Diseño: docs/superpowers/specs/2026-09-03-modulo-tasks-design.md

ALTER TABLE public.actividades
  ADD COLUMN IF NOT EXISTS created_by_id uuid
    REFERENCES public.usuarios(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.actividades.created_by_id IS
  'Quién cargó la fila. NO es `solicitante_id` (quién pidió el trabajo) ni `responsable_id` '
  '(quién lo ejecuta). Nullable para siempre: las filas anteriores a 2026-09 no tienen creador '
  'conocido y no se inventa uno. Se escribe sólo en el INSERT — un UPDATE nunca la toca.';
