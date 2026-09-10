-- Prueba de tema_para_acta(). Se revierte al final: no ensucia la base.
--
-- Corre como `postgres`, o sea sin JWT: `usuario_actual_id()` da NULL y `is_admin()` da false. Eso
-- es a propósito — lo que se prueba acá es que la función RECHAZA a quien no puede escribir el
-- acta, que es la mitad que un admin nunca vería. El camino feliz se monta suplantando al creador
-- de la reunión con `set_config('request.jwt.claims', …)`, que es lo que hace PostgREST.
BEGIN;

-- Un usuario y una reunión suya, para poder pasar el guard como su creador.
INSERT INTO public.usuarios (email, nombre, apellido, rol, auth_id, validado, activo)
VALUES ('prueba.temas@eminat.net', 'Prueba', 'Temas', 'stratix360',
        '00000000-0000-4000-8000-0000000000aa', true, true);

INSERT INTO public.reuniones (empresa, titulo, fecha, modalidad, created_by)
SELECT (SELECT codigo FROM public.empresas LIMIT 1), 'Reunión de prueba', CURRENT_DATE, 'virtual',
       (SELECT id FROM public.usuarios WHERE email = 'prueba.temas@eminat.net');

-- 1. Sin identidad: tiene que rechazar con 42501, NO crear el tema.
DO $$
DECLARE r uuid; v_reunion uuid;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  BEGIN
    r := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
    RAISE EXCEPTION 'FALLA: dejó crear un tema sin poder escribir el acta (devolvió %)', r;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok 1: rechaza a quien no puede escribir el acta';
  END;
END $$;

-- 2. Como el creador del acta: crea, y la segunda vez con otro casing devuelve EL MISMO id.
SELECT set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-4000-8000-0000000000aa')::text, true);

DO $$
DECLARE v_reunion uuid; a uuid; b uuid; n bigint; guardado text;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  a := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
  b := public.tema_para_acta(v_reunion, '  presupuesto q4 ');
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'FALLA: "presupuesto q4" creó un asunto nuevo (% vs %)', a, b;
  END IF;
  SELECT count(*), min(titulo) INTO n, guardado FROM public.temas;
  IF n <> 1 THEN RAISE EXCEPTION 'FALLA: quedaron % filas en temas', n; END IF;
  IF guardado <> 'Presupuesto Q4' THEN
    RAISE EXCEPTION 'FALLA: el título se pisó con el segundo tipeo (quedó %)', guardado;
  END IF;
  RAISE NOTICE 'ok 2: dedup por (empresa, lower(btrim(titulo))) y el título original intacto';
END $$;

-- 3. La empresa sale de la REUNIÓN, no de quien llama.
DO $$
DECLARE esperado text; real_ text;
BEGIN
  SELECT empresa INTO esperado FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  SELECT empresa INTO real_ FROM public.temas LIMIT 1;
  IF esperado IS DISTINCT FROM real_ THEN
    RAISE EXCEPTION 'FALLA: empresa % en vez de %', real_, esperado;
  END IF;
  RAISE NOTICE 'ok 3: la empresa sale de la reunión';
END $$;

-- 4. Un título vacío no entra.
DO $$
DECLARE v_reunion uuid; r uuid;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  BEGIN
    r := public.tema_para_acta(v_reunion, '   ');
    RAISE EXCEPTION 'FALLA: aceptó un título vacío (devolvió %)', r;
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'ok 4: rechaza el título vacío';
  END;
END $$;

-- 5. Una reunión inexistente da el MISMO error que una que no podés escribir. Si diera uno
--    distinto, sería el oráculo otra vez: "esa reunión no existe" vs "no podés escribirla".
DO $$
DECLARE r uuid;
BEGIN
  BEGIN
    r := public.tema_para_acta('00000000-0000-4000-8000-0000000000ff', 'Cualquiera');
    RAISE EXCEPTION 'FALLA: aceptó una reunión inexistente (devolvió %)', r;
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'ok 5: una reunión que no existe y una que no podés escribir dan lo mismo';
  END;
END $$;

-- 6. ⚠️ Un tema INACTIVO se devuelve igual, y sigue inactivo. Esto NO es lo deseable: es lo que
--    la función hace hoy, escrito para que la fase 3 no lo descubra en pantalla (D9). El día
--    que Wagner decida, esta prueba cambia con la función.
DO $$
DECLARE v_reunion uuid; a uuid; b uuid; act boolean;
BEGIN
  SELECT id INTO v_reunion FROM public.reuniones WHERE titulo = 'Reunión de prueba';
  a := public.tema_para_acta(v_reunion, 'Presupuesto Q4');
  UPDATE public.temas SET activo = false WHERE id = a;
  b := public.tema_para_acta(v_reunion, 'presupuesto q4');
  SELECT activo INTO act FROM public.temas WHERE id = b;
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'FALLA: un tema inactivo se duplicó (% vs %)', a, b;
  END IF;
  IF act THEN
    RAISE EXCEPTION 'FALLA: la función reactivó el tema — si es a propósito, D9 ya se decidió y hay que actualizar esta prueba';
  END IF;
  RAISE NOTICE 'ok 6: un tema inactivo se devuelve tal cual (D9 pendiente: activo hoy no es una baja para el acta)';
END $$;

ROLLBACK;
