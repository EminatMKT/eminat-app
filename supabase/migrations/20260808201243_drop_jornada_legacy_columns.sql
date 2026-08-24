-- Cierra la transitividad 3NF de la jornada: `usuarios` guardaba por-persona lo
-- que en realidad depende del tipo de jornada (usuario → tipo → horas).
--
-- Desde 20260808190614 la jornada es catálogo (`jornadas.horas_dia`) y `usuarios`
-- apunta con `jornada_id`. Estas cuatro columnas quedaron duplicando ese dato:
--   tipo_jornada  → reemplazada por jornada_id (era 'A'/'B', el mismo enum que `tipo`)
--   horas_dia     → vive en jornadas.horas_dia
--   horas_semana  → derivable (horas_dia × 5)
--   horas_mes     → derivable (horas_dia × 20)
-- Verificado antes de escribir esto: CERO consumidores en el código — el único
-- `horas_dia` que se lee en toda la app es el del catálogo.
--
-- La vista `v_equipo_hoy` SÍ exponía `tipo_jornada` (por eso el drop directo
-- falla con 2BP01), pero el campo no lo consume nadie: de esa vista la app solo
-- usa `nombre`, para armar la lista del equipo en Stratix. Se recrea igual, sin
-- esa columna. CREATE OR REPLACE no sirve — no permite quitar columnas.
--
-- `marca_hora` NO se toca: es un timestamp por-persona, no parte del cluster.
--
-- No se agregan horas_semana/horas_mes al catálogo: nadie las consume y salen de
-- horas_dia con una multiplicación. Si algún día hacen falta, se derivan.

-- Guard: en local es una dependencia funcional pura (10/10 usuarios en 8h/40/160
-- contra una jornada de 8h), pero en prod podría haber overrides individuales que
-- este drop borraría en silencio. Si los hay, la migración FALLA y hay que decidir
-- qué hacer con ese dato antes de seguir — es un catálogo nuevo, no una pérdida
-- aceptable.
DO $$
DECLARE
  desalineados int;
  no_derivables int;
BEGIN
  SELECT count(*) INTO desalineados
  FROM public.usuarios u
  LEFT JOIN public.jornadas j ON j.id = u.jornada_id
  WHERE u.horas_dia IS NOT NULL
    AND (j.horas_dia IS NULL OR u.horas_dia <> j.horas_dia);

  IF desalineados > 0 THEN
    RAISE EXCEPTION
      'Abortado: % usuario(s) tienen horas_dia propio distinto del de su jornada (o sin jornada asignada). Revisá si son overrides reales antes de dropear la columna.',
      desalineados;
  END IF;

  SELECT count(*) INTO no_derivables
  FROM public.usuarios u
  WHERE u.horas_dia IS NOT NULL
    AND (u.horas_semana IS DISTINCT FROM u.horas_dia * 5
      OR u.horas_mes    IS DISTINCT FROM u.horas_dia * 20);

  IF no_derivables > 0 THEN
    RAISE EXCEPTION
      'Abortado: % usuario(s) tienen horas_semana/horas_mes que NO salen de horas_dia (×5 / ×20). Esa configuración se perdería: hay que modelarla en `jornadas` antes de dropear.',
      no_derivables;
  END IF;
END $$;

DROP VIEW IF EXISTS public.v_equipo_hoy;

CREATE VIEW public.v_equipo_hoy AS
 SELECT u.id,
    u.nombre,
    u.apellido,
    u.nombre_display,
    u.color,
    u.rol,
    u.id_sheet,
    m.hora_entrada,
    m.hora_salida,
    m.horas_trabajadas,
        CASE
            WHEN m.hora_entrada IS NOT NULL AND m.hora_salida IS NULL THEN 'presente'::text
            WHEN m.hora_entrada IS NOT NULL AND m.hora_salida IS NOT NULL THEN 'salio'::text
            WHEN u.marca_hora = false THEN 'sin_marcacion'::text
            ELSE 'ausente'::text
        END AS estado_hoy,
    ( SELECT count(*) AS count
           FROM public.actividades a
          WHERE a.responsable_id = u.id AND (a.estado = ANY (ARRAY['En proceso'::text, 'Pendiente'::text]))) AS tareas_activas
   FROM public.usuarios u
     LEFT JOIN public.marcaciones m ON m.usuario_id = u.id AND m.fecha = CURRENT_DATE
  WHERE u.activo = true
  ORDER BY u.nombre;

-- Los GRANT no sobreviven al DROP: se restauran los que tenía la vista original.
GRANT SELECT ON public.v_equipo_hoy TO anon, authenticated, service_role;

ALTER TABLE public.usuarios
  DROP COLUMN IF EXISTS tipo_jornada,
  DROP COLUMN IF EXISTS horas_dia,
  DROP COLUMN IF EXISTS horas_semana,
  DROP COLUMN IF EXISTS horas_mes;
