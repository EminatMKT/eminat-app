-- Precheck de la fase 2 de `operations`. Corre ANTES del backup y del push, contra la base a la
-- que se va a aplicar la migración.
--
-- Por qué existe: la migración hace `DROP COLUMN titulo` sobre `reunion_temas`. Con una sola fila
-- eso es pérdida de datos, y el `ADD COLUMN tema_id … NOT NULL` aborta a mitad de camino. Las "0
-- filas en prod" del diseño son un corte del 09/09, no una garantía: reuniones está en producción.
--
-- `reunion_pendientes` se cuenta acá aunque ESTA fase no la toque: la fase 3 la dropea, la
-- consulta es el mismo viaje, y descubrir que dejó de estar vacía dos fases antes es gratis.
--
-- Este archivo NO lleva `\set ON_ERROR_STOP`: es un meta-comando de psql, y el runbook lo corre
-- con `supabase db query --linked --file`, que manda el archivo tal cual por el wire protocol —
-- probado contra local, un `\set` ahí da `syntax error at or near "\"` antes de llegar al DO. El
-- `RAISE EXCEPTION` de cada IF ya aborta la transacción sin depender de ningún flag externo.
DO $$
DECLARE
  n_temas bigint;
  n_pend  bigint;
  n_reu   bigint;
BEGIN
  SELECT count(*) INTO n_temas FROM public.reunion_temas;
  SELECT count(*) INTO n_pend  FROM public.reunion_pendientes;
  SELECT count(*) INTO n_reu   FROM public.role_modules WHERE module_slug = 'reuniones';

  RAISE NOTICE 'reunion_temas: % filas · reunion_pendientes: % filas · role_modules(reuniones): %',
    n_temas, n_pend, n_reu;

  IF n_temas > 0 THEN
    RAISE EXCEPTION E'reunion_temas tiene % filas.\n\n%', n_temas,
      'La migración 20260911130100_temas_catalogo.sql borra la columna `titulo`. Con filas, '
      'esos títulos se pierden y no hay de dónde reconstruirlos. Antes de seguir hay que '
      'escribir el backfill: por cada fila, un `tema` con su (empresa de la reunión, titulo) y '
      'el `tema_id` apuntando ahí. No existe: el diseño se escribió sobre una tabla vacía.';
  END IF;

  IF n_pend > 0 THEN
    RAISE EXCEPTION E'reunion_pendientes tiene % filas.\n\n%', n_pend,
      'Esta fase no la toca, pero la fase 3 la dropea y el diseño entero se apoya en que esté '
      'vacía. Si tiene filas, hay que decidir qué se hace con ellas ANTES de seguir con la '
      'cadena de fases.';
  END IF;

  -- La migración (20260911130100:81-83) aborta a mitad del `db push` si nadie reparte el slug
  -- `reuniones` — dato que un admin edita desde `/admin` y puede haber cambiado desde que se
  -- escribió el diseño. Adelantar el mismo chequeo acá es el punto del precheck.
  --
  -- Sólo `reuniones`, no también `operations`: la revisión final del 10/09 revirtió el gate de
  -- `puedo_ver_reunion` a `has_module('reuniones')` a secas (D3 revertida), así que la migración
  -- ya no lee `role_modules` para `operations` en ningún lado. Chequearlo acá probaría algo de lo
  -- que la migración no depende.
  IF n_reu = 0 THEN
    RAISE EXCEPTION E'Ningún rol tiene el módulo `reuniones` en role_modules.\n\n%',
      'La migración 20260911130100_temas_catalogo.sql aborta con "slug de módulo desconocido" '
      'si esto sigue así el día del push. Asignale `reuniones` a algún rol desde /admin antes '
      'de seguir.';
  END IF;
END $$;
