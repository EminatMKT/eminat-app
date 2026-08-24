-- Fix de datos para DEV (ydcadspinryybextlvyi): naomi@stratix360.com tenía
-- jornada MEDIA asignada con horas_dia=8 propio (override accidental). Decisión
-- del usuario 2026-08-23: alinearla a COMPLETA antes del drop de horas_dia.
-- En prod/local no matchea nadie: no-op seguro fuera de dev.
-- (La fila fantasma 20260808201240_diag_temporal se limpia aparte con
-- supabase migration repair --status reverted.)

UPDATE public.usuarios
SET jornada_id = (SELECT id FROM public.jornadas WHERE codigo = 'COMPLETA')
WHERE email = 'naomi@stratix360.com'
  AND jornada_id = (SELECT id FROM public.jornadas WHERE codigo = 'MEDIA');
