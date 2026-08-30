-- Quien crea un acta queda afuera de sus propias policies.
--
-- Lo encontró la prueba de aceptación del módulo con un rol NO-admin (paso 6 del plan de la
-- fase 1). Con un admin nunca se ve: `is_admin()` corta en las tres policies antes de evaluar
-- nada más, y el admin es justamente quien escribe y prueba la migración.
--
-- Tres huecos, y el tercero es un punto muerto:
--
-- 1. `reuniones_select` admitía admin, participante o misma empresa. El creador no está en esa
--    lista, así que NO puede leer la reunión que acaba de crear. Y como la capa de datos hace
--    `.insert(...).select().single()`, Postgres exige que la fila recién insertada pase también
--    la policy de SELECT para devolverla con RETURNING: el INSERT entero aborta con "new row
--    violates row-level security policy". El INSERT solo —sin RETURNING— pasaba, que es lo que
--    hacía el síntoma tan confuso.
--
-- 2. `reuniones_update` pedía presidir o ser secretario. El creador no puede corregir ni el
--    título de su propia acta.
--
-- 3. `reunion_participantes_write` pedía lo mismo, y `preside_o_secretaria()` mira si el usuario
--    YA ES participante con ese rol. Al crear una reunión no hay ningún participante todavía:
--    para agregar al primero hay que presidir, y para presidir alguien tiene que agregarte.
--    Nadie puede armar la mesa. El mismo punto muerto alcanza a temas y pendientes, que son de
--    la fase 2 pero heredan la condición.
--
-- La regla que faltaba, dicha en una línea: **quien levanta el acta la gobierna hasta que
-- designe a alguien.** No es un permiso de más — es el mínimo para que el módulo se pueda usar
-- sin un admin al lado.

-- El creador, con la misma forma que las otras cuatro: SECURITY DEFINER para que pueda leer
-- `reuniones` salteando su propia policy —si no, la policy se llamaría a sí misma— y con el
-- search_path fijo, sin el cual quien la invoca puede anteponer un esquema propio.
--
-- ⚠️ Sirve para las tablas HIJAS, no para `reuniones`. Es `STABLE`, así que ve el snapshot del
-- INICIO del comando: durante el RETURNING de un INSERT sobre `reuniones` la fila todavía no
-- está en ese snapshot y la función devuelve false — con lo cual el arreglo no arreglaba nada.
-- Sobre `reuniones` la policy compara la columna `created_by` DIRECTO: la tiene a mano, es la
-- fila que se está evaluando, y de paso se ahorra la subconsulta.
CREATE OR REPLACE FUNCTION public.creo_la_reunion(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reuniones r
    WHERE r.id = p_reunion AND r.created_by = public.usuario_actual_id()
  );
$$;

DO $$
DECLARE
  slug text := 'reuniones';
BEGIN
  -- El slug va en variable con su verificación: `role_modules.module_slug` es text sin FK, así
  -- que uno mal escrito no falla — deja las tablas mudas para todos menos el admin.
  INSERT INTO public.role_modules (role_key, module_slug)
  VALUES ('admin', slug) ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  -- 1. Leer: el creador ve su acta aunque todavía no haya nadie en la mesa. La columna se
  --    compara DIRECTO y no por `creo_la_reunion()`, por lo de la advertencia de arriba.
  DROP POLICY IF EXISTS "reuniones_select" ON public.reuniones;
  EXECUTE format($f$
    CREATE POLICY "reuniones_select" ON public.reuniones FOR SELECT USING (
      public.has_module(%L) AND (
        public.is_admin()
        OR created_by = public.usuario_actual_id()
        OR public.participa_en_reunion(id)
        OR public.misma_empresa_reunion(id)
      ))$f$, slug);

  -- 2. Editar: mientras el acta no esté cerrada. El `estado <> 'cerrada'` se conserva tal cual
  --    estaba — el creador no gana el derecho de tocar un acta ya cerrada.
  DROP POLICY IF EXISTS "reuniones_update" ON public.reuniones;
  CREATE POLICY "reuniones_update" ON public.reuniones FOR UPDATE USING (
    public.is_admin()
    OR ((public.preside_o_secretaria(id) OR created_by = public.usuario_actual_id())
        AND estado <> 'cerrada')
  );

  -- 3. Armar la mesa: es lo que rompe el punto muerto. Sin esto, la reunión nace sin nadie que
  --    pueda agregar al primer participante. Acá la reunión YA existe, así que la función sirve.
  DROP POLICY IF EXISTS "reunion_participantes_write" ON public.reunion_participantes;
  CREATE POLICY "reunion_participantes_write" ON public.reunion_participantes FOR ALL USING (
    public.is_admin()
    OR ((public.preside_o_secretaria(reunion_id) OR public.creo_la_reunion(reunion_id))
        AND public.reunion_abierta(reunion_id))
  );

  -- Temas y pendientes son de la fase 2, pero heredan el mismo punto muerto: se corrigen ahora
  -- para que no llegue como un bug nuevo cuando esa pantalla exista.
  DROP POLICY IF EXISTS "reunion_temas_write" ON public.reunion_temas;
  CREATE POLICY "reunion_temas_write" ON public.reunion_temas FOR ALL USING (
    public.is_admin()
    OR ((public.preside_o_secretaria(reunion_id) OR public.creo_la_reunion(reunion_id))
        AND public.reunion_abierta(reunion_id))
  );

  DROP POLICY IF EXISTS "reunion_pendientes_write" ON public.reunion_pendientes;
  CREATE POLICY "reunion_pendientes_write" ON public.reunion_pendientes FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.reunion_temas t
      WHERE t.id = reunion_pendientes.tema_id
        AND (public.preside_o_secretaria(t.reunion_id) OR public.creo_la_reunion(t.reunion_id))
        AND public.reunion_abierta(t.reunion_id)
    )
  );
END $$;
