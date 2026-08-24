-- Fix de datos para DEV (ydcadspinryybextlvyi): la única fila de actividades
-- era una prueba de junio sin responsable (título basura, ref 'DG_Joselyn' a un
-- usuario inexistente en esta base). Bloqueaba el SET NOT NULL de
-- 20260811235816_drop_responsable_ref. Decisión 2026-08-23: se elimina.
-- En prod/local el id+titulo no matchean: no-op seguro fuera de dev.

DELETE FROM public.actividades
WHERE id = '9157da19-40ff-4300-b213-bb9af84a54b4'
  AND titulo = 'zdfsdfgsdfgsdfsdfgs'
  AND responsable_id IS NULL;
