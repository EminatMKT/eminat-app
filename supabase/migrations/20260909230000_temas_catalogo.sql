-- FASE 2: el tema sube a su propia tabla y `reunion_temas` pasa a ser el TRATAMIENTO.
--
-- Va ordenada ENTRE la apertura (20260909222149) y el cierre (20260909233746) de la fase 1: sus
-- policies nombran el slug `operations`, que la apertura crea, y la pantalla de /admin que las
-- consume viaja en el bundle que se despliega antes del cierre.
--
-- El timestamp está escrito a mano por eso mismo. En local se aplica con
-- `pnpm supabase migration up --include-all`, porque la del cierre ya está puesta.
BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. La guarda que hace que esta migración no pueda perder datos.
--    El precheck (supabase/checks/precheck-temas.sql) contesta lo mismo antes del push, pero es
--    un paso humano y los pasos humanos se saltean. Esto no.
DO $guard$
DECLARE n bigint;
BEGIN
  SELECT count(*) INTO n FROM public.reunion_temas;
  IF n > 0 THEN
    RAISE EXCEPTION E'reunion_temas tiene % filas y esta migración borra `titulo`.\n\n%', n,
      'No hay backfill escrito: el diseño se hizo sobre una tabla vacía. Ver '
      'supabase/checks/precheck-temas.sql.';
  END IF;
END $guard$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. El asunto. El título es el mismo siempre; lo que cambia por reunión es la descripción, que
--    se queda en `reunion_temas`.
CREATE TABLE public.temas (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- ON UPDATE CASCADE por el mismo motivo que `actividades_empresa_fkey`: el `codigo` de una
  -- empresa se edita desde /admin.
  empresa       text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  titulo        text NOT NULL,
  -- No hay borrado: `tema_id` es ON DELETE RESTRICT porque borrar un asunto ya tratado
  -- reescribiría un acta pasada. `activo` es la baja.
  activo        boolean NOT NULL DEFAULT true,
  creado_por_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

-- `btrim` además de `lower`: sin él "Presupuesto Q4 " entra como un asunto distinto y la historia
-- que todo esto quiere unir se parte con el primero mal tipeado. La empresa entra en la clave
-- porque el "Presupuesto Q4" de EMC y el de Servi-Net son dos asuntos, no uno.
-- Sin índice suelto por `empresa`: este UNIQUE ya la tiene como columna líder y sirve
-- cualquier consulta que el índice suelto serviría.
CREATE UNIQUE INDEX temas_unicos_por_empresa
  ON public.temas (empresa, lower(btrim(titulo)));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. El tratamiento. `titulo` se va: ahora vive una sola vez, en `temas`.
ALTER TABLE public.reunion_temas
  ADD COLUMN tema_id uuid NOT NULL REFERENCES public.temas(id) ON DELETE RESTRICT,
  DROP COLUMN titulo,
  ADD CONSTRAINT reunion_temas_unicos UNIQUE (reunion_id, tema_id);

-- El UNIQUE de arriba indexa (reunion_id, tema_id); esto sirve al camino inverso —"en qué
-- reuniones se trató este asunto"—, que es la consulta que hace posible la historia.
CREATE INDEX reunion_temas_tema_id_idx ON public.reunion_temas (tema_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Permisos y RLS.
--
-- El `DO` va ETIQUETADO (`$do$`) y los dólares anidados no se tocan: el lexer hace longest match
-- del delimitador, así que con `DO $$` un `$q$$f$` consume `$q`, retrocede un `$`, encuentra `$$`
-- —la apertura del DO— y cierra el bloque ahí. Ya pasó: `syntax error at or near "f$"`.
DO $do$
DECLARE
  slug text := 'reuniones';
BEGIN
  -- El slug verificado. `role_modules.module_slug` es text sin FK y `has_module()` abre con
  -- `is_admin() OR …`: uno mal escrito le da true al admin —que es quien prueba la migración— y
  -- false en silencio a todo el resto.
  --
  -- Va UN slug, no dos. La primera versión de esta migración guardaba también `operations`,
  -- porque el gate de más abajo era `has_module('operations') OR has_module('reuniones')`. Eso
  -- se revirtió (ver el comentario de `puedo_ver_reunion`): el gate de hoy no lee `role_modules`
  -- para `operations` en ningún lado de esta migración, así que guardar su existencia acá
  -- probaría algo de lo que esta migración no depende. `operations` lo sigue creando la fase 1;
  -- esta guarda cubre sólo lo que ESTA migración usa.
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  -- El predicado de `reuniones_select` en UN solo lugar, para que las tablas hijas no lo copien.
  -- Lee `reuniones` salteando su propia policy —si no, se llamaría a sí misma— y por eso sirve a
  -- las hijas y NO a `reuniones` (advertencia de 20260830204042:33-37).
  --
  -- `reuniones` A SECAS, no `operations OR reuniones` (D3 revertida en la revisión final del
  -- 10/09). `reuniones_select` (20260830204042:63-69) pide `has_module('reuniones')` a secas: con
  -- el OR, un rol que tiene `operations` y no `reuniones` —`stratix360` en producción, que hoy va
  -- a tener sólo `operations`— pasaba el gate de `temas`/`reunion_temas` sin poder abrir la
  -- reunión de la que salen esas filas, y eso deja leer `temas.titulo` y
  -- `reunion_temas.descripcion` de un acta reservada por una puerta que su propia tabla padre no
  -- abre. El caso que el OR quería resolver —`medico_investigacion`, que en producción tiene
  -- `reuniones` y no `operations`— ya entra por `reuniones` a secas: no hacía falta ensanchar
  -- nada. El OR vuelve el día que `operations` absorba `reuniones` de verdad —anotado en el
  -- `.todo`— porque ese día el módulo viejo deja de repartirse y dejar de leerlo acá recién
  -- entonces sería la regresión.
  --
  -- El (SELECT …) fuerza un InitPlan, como en 20260821212925:82: sin él la función corre una vez
  -- por fila.
  EXECUTE format($f$
    CREATE OR REPLACE FUNCTION public.puedo_ver_reunion(p_reunion uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $q$
      SELECT (SELECT public.has_module(%L)) AND EXISTS (
        SELECT 1 FROM public.reuniones r
         WHERE r.id = p_reunion AND (
           public.is_admin()
           OR r.created_by = public.usuario_actual_id()
           OR public.participa_en_reunion(r.id)
           OR public.misma_empresa_reunion(r.id)))
    $q$ $f$, slug);

  EXECUTE 'ALTER TABLE public.temas ENABLE ROW LEVEL SECURITY';
  -- Una tabla nueva de `public` recibe GRANT ALL a `anon` por defecto en Supabase: está el
  -- precedente literal en el dump, `GRANT ALL ON TABLE public.reunion_pendientes TO anon`. Sin
  -- este REVOKE, `temas` sería lectura y escritura anónima con la llave que viaja en el bundle.
  EXECUTE 'REVOKE ALL ON public.temas FROM anon';
  -- Y los GRANT NO son opcionales: 20260821212925:62 lo dice textual. Sin ellos la tabla queda
  -- inaccesible con 42501 y la pestaña sale vacía sin que nada explique por qué.
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON public.temas TO authenticated';
  -- Los default privileges de Supabase le dan ALL a `authenticated` en una tabla nueva de
  -- `public` —igual que a `anon` arriba—, así que sin este REVOKE queda con DELETE y TRUNCATE
  -- aunque el GRANT de la línea anterior no los mencione. Hoy no hay policy de DELETE que lo
  -- explote, pero "no hay borrado" (el comentario de `temas` y el de `Tema`) es una promesa que
  -- tiene que sostenerse en el ACL, no en la ausencia de una policy que cualquiera puede agregar.
  EXECUTE 'REVOKE DELETE, TRUNCATE ON public.temas FROM authenticated';
  EXECUTE 'GRANT ALL    ON public.temas TO service_role';

  -- Un tema se ve si se puede ver ALGUNA de las reuniones donde se trató —dicho entero, no
  -- delegado a la RLS de `reunion_temas`—, o si nadie lo trató todavía y lo creaste vos, que es
  -- el hueco entre escribir el título y guardar el punto. Nunca "todos los temas del módulo": eso
  -- filtraría los títulos de las actas reservadas.
  --
  -- `is_admin()` va explícito para que el catálogo de /admin no esconda los temas sin tratamiento
  -- de otra persona. No concede nada: `puedo_ver_reunion` ya abre con is_admin().
  EXECUTE $f$
    CREATE POLICY temas_select ON public.temas FOR SELECT USING (
      public.is_admin()
      OR EXISTS (SELECT 1 FROM public.reunion_temas rt
                  WHERE rt.tema_id = temas.id AND public.puedo_ver_reunion(rt.reunion_id))
      OR creado_por_id = public.usuario_actual_id())$f$;

  -- Sólo admin (revisión final del 10/09, revierte la versión anterior de esta policy). NO es
  -- "admin o el gate de módulo": es SÓLO admin. Dejarla abierta a cualquier autenticado con
  -- `operations`/`reuniones` reabría el oráculo que `tema_para_acta()` existe para cerrar — un
  -- `POST /rest/v1/temas` con un título que ya existe en esa empresa responde `23505 duplicate
  -- key`, y esa respuesta le CONFIRMA a quien no puede ver el acta que el asunto ya existe,
  -- exactamente lo que `temas_select` esconde. Y el `WITH CHECK` anterior no restringía
  -- `empresa`, así que cualquier autenticado con el módulo podía sembrar el catálogo de una marca
  -- que no es la suya, mientras `tema_para_acta()` se toma el trabajo de derivar la empresa DE LA
  -- REUNIÓN justamente para que eso no pase.
  --
  -- No le saca nada a la UI: `TemasManager` sólo se monta detrás del gate de admin de
  -- `AdminModule`. El alta desde un acta sigue entrando por `tema_para_acta()`, que es
  -- SECURITY DEFINER y no pasa por esta policy. `creado_por_id = usuario_actual_id()` se
  -- mantiene: con NULL la fila queda inmodificable salvo por admin, y sin la igualdad cualquier
  -- admin la siembra con el id de otro.
  EXECUTE $f$
    CREATE POLICY temas_insert ON public.temas FOR INSERT
      WITH CHECK (public.is_admin() AND creado_por_id = public.usuario_actual_id())$f$;

  -- Corregir un tema mientras el acta donde se trató siga abierta. Sin el EXISTS, quien lo creó
  -- podría reescribir el título de un asunto tratado en actas CERRADAS — y como el título es N:N,
  -- eso reescribe las cinco a la vez.
  --
  -- El WITH CHECK va explícito aunque repita: una policy de escritura sin WITH CHECK valida la
  -- fila NUEVA con el USING, y eso es la trampa que dejó a `reuniones_update` sin poder cerrar.
  EXECUTE $f$
    CREATE POLICY temas_update ON public.temas FOR UPDATE
      USING (public.is_admin() OR (creado_por_id = public.usuario_actual_id() AND (
        NOT EXISTS (SELECT 1 FROM public.reunion_temas rt WHERE rt.tema_id = temas.id)
        OR EXISTS (SELECT 1 FROM public.reunion_temas rt
                    WHERE rt.tema_id = temas.id AND public.reunion_abierta(rt.reunion_id)))))
      WITH CHECK (public.is_admin() OR creado_por_id = public.usuario_actual_id())$f$;

  -- La de `reunion_temas` decía `EXISTS (SELECT 1 FROM reuniones r WHERE r.id = reunion_id)`:
  -- sin gate de módulo y apoyada en que la subconsulta pasara por la RLS de `reuniones`. Pasa,
  -- pero deja la confidencialidad de un acta reservada colgando de un detalle que no se lee.
  EXECUTE 'DROP POLICY IF EXISTS reunion_temas_select ON public.reunion_temas';
  EXECUTE $f$
    CREATE POLICY reunion_temas_select ON public.reunion_temas FOR SELECT
      USING (public.puedo_ver_reunion(reunion_id))$f$;
END $do$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. El alta de un tema es una función, no un INSERT del cliente.
--
-- El UNIQUE es un oráculo: `temas_select` esconde el tema de un acta reservada y el índice no.
-- Al tipear ese título, el cliente recibiría `duplicate key value violates unique constraint`,
-- que le CONFIRMA la existencia del asunto que la policy le oculta y lo deja sin salida — ni lo
-- ve para reusarlo ni lo puede crear. Y sin RETURNING legible, un `.insert().select().single()`
-- aborta con "new row violates row-level security policy" (el bug de 20260830204042:9-14).
CREATE OR REPLACE FUNCTION public.tema_para_acta(p_reunion uuid, p_titulo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_empresa text;
  v_titulo  text := btrim(p_titulo);
  v_id      uuid;
BEGIN
  IF v_titulo = '' THEN
    RAISE EXCEPTION 'El tema necesita un título.' USING ERRCODE = '23514';
  END IF;

  -- El MISMO predicado que `reunion_temas_write` (20260830204042:91-96). Va acá adentro porque
  -- SECURITY DEFINER saltea toda la RLS: sin esto, la función sería una puerta lateral al acta.
  IF NOT (public.is_admin()
          OR ((public.preside_o_secretaria(p_reunion) OR public.creo_la_reunion(p_reunion))
              AND public.reunion_abierta(p_reunion))) THEN
    RAISE EXCEPTION 'No podés escribir en esa acta.' USING ERRCODE = '42501';
  END IF;

  -- La empresa sale de la REUNIÓN y no del que llama: nada obligaba a que `temas.empresa` fuera
  -- la del acta, y sin esto dos actas de empresas distintas podrían escribir en el mismo asunto.
  SELECT r.empresa INTO v_empresa FROM public.reuniones r WHERE r.id = p_reunion;
  -- Una reunión que no existe da el MISMO error que una que no podés escribir. Distinguirlos
  -- sería reabrir el oráculo por el otro lado.
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'No podés escribir en esa acta.' USING ERRCODE = '42501';
  END IF;

  -- `DO UPDATE` y no `DO NOTHING` porque hace falta el RETURNING: `DO NOTHING` no devuelve fila y
  -- dos usuarios simultáneos chocarían con un 23505 crudo.
  --
  -- Se asigna el título A SÍ MISMO, NO `EXCLUDED.titulo`. Con EXCLUDED, quien tipea
  -- "presupuesto q4" le reescribe el título al asunto en las otras cuatro actas —cerradas
  -- incluidas—, que es justo lo que `temas_update` bloquea con su EXISTS y que esta función,
  -- por ser SECURITY DEFINER, no evalúa.
  INSERT INTO public.temas (empresa, titulo, creado_por_id)
  VALUES (v_empresa, v_titulo, public.usuario_actual_id())
  ON CONFLICT (empresa, lower(btrim(titulo)))
    DO UPDATE SET titulo = public.temas.titulo
  RETURNING id INTO v_id;

  RETURN v_id;
END $fn$;

-- Una función SECURITY DEFINER es ejecutable por PUBLIC por defecto, y PUBLIC incluye a `anon`:
-- sin este REVOKE, la llave que viaja en el bundle del browser podría crear temas en cualquier
-- acta. El REVOKE va primero y el GRANT después, en ese orden.
REVOKE ALL ON FUNCTION public.tema_para_acta(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tema_para_acta(uuid, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. El rastro. `reunion_temas` nunca tuvo trigger, así que el tratamiento —que a partir de
--    ahora carga la descripción del acta— venía sin auditoría desde el 30/08.
--
--    ⚠️ VA SIN `UPDATE`, Y NO ES UN OLVIDO. `log_reunion()` tiene, en su línea 15,
--        TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado
--    y PL/pgSQL NO corta ese AND: la condición entera se planifica como una sola expresión SQL,
--    así que `OLD.estado` tiene que resolver contra el tipo de la fila aunque TG_TABLE_NAME no
--    sea 'reuniones'. Ni `temas` ni `reunion_temas` tienen `estado`, así que con `OR UPDATE`
--    cualquier modificación aborta con `record "old" has no field "estado"` — probado contra el
--    Postgres local: el segundo `tema_para_acta()`, el que entra por ON CONFLICT DO UPDATE,
--    revienta; y editar la descripción de un punto sería imposible.
--
--    Con INSERT y DELETE a secas, las dos ramas que corren son las genéricas y las dos retornan
--    antes de esa línea, así que la función NO se toca — y esta migración no arrastra la rama de
--    `reunion_pendientes` que la fase 3 tiene que sacar. El precio: no queda rastro del cambio de
--    título ni del `activo`. Se paga en la fase 3, anidando los IF por tabla en vez de unirlos
--    con AND.
DROP TRIGGER IF EXISTS trg_log ON public.reunion_temas;
CREATE TRIGGER trg_log AFTER INSERT OR DELETE ON public.reunion_temas
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
DROP TRIGGER IF EXISTS trg_log ON public.temas;
CREATE TRIGGER trg_log AFTER INSERT OR DELETE ON public.temas
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();

COMMIT;
