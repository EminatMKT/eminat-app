-- Fix de datos de PROD previo al SET NOT NULL de responsable_id (20260811235816).
-- Decisión del usuario 2026-08-23: borrar las 29 actividades huérfanas de prod —
-- 14 pruebas de teclado ('s', 'sss', 'qqq'…) del 06-04 y 15 del proyecto CRM viejo
-- cuyo responsable (Jonathan_CRM) no existe como usuario.
-- No-op en bases limpias (dev ya está sincronizado).
DELETE FROM public.actividades WHERE responsable_id IS NULL;
