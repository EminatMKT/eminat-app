-- Fix de datos previo al drop de columnas legacy de jornada.
-- Decisión del usuario 2026-08-23 para PROD: las horas por-persona se limpian;
-- se vuelven a cargar desde la interfaz una vez vigente el catálogo `jornadas`.
-- El guard de 20260808201243 solo cuenta filas con horas_dia IS NOT NULL, así que
-- con esto pasa siempre. Idempotente.
--
-- Además reporta (RAISE NOTICE) las actividades sin responsable_id que bloquearían
-- el SET NOT NULL de 20260811235816_drop_responsable_ref.

UPDATE public.usuarios
SET horas_dia     = NULL,
    horas_semana  = NULL,
    horas_mes     = NULL
WHERE horas_dia IS NOT NULL
   OR horas_semana IS NOT NULL
   OR horas_mes IS NOT NULL;

DO $$
DECLARE r record; n int;
BEGIN
  SELECT count(*) INTO n FROM public.actividades WHERE responsable_id IS NULL;
  RAISE NOTICE 'DIAG actividades_sin_responsable=%', n;
  FOR r IN
    SELECT id::text, left(coalesce(titulo,'(sin título)'),50) AS t,
           coalesce(responsable_ref,'-') AS ref, estado
    FROM public.actividades WHERE responsable_id IS NULL
  LOOP
    RAISE NOTICE 'DIAG % | % | ref=% | estado=%', r.id, r.t, r.ref, r.estado;
  END LOOP;
END $$;
