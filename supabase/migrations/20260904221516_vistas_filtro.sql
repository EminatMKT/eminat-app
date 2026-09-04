-- Vistas de filtro guardadas: una combinación de filtros CON NOMBRE, por persona y por tabla.
--
-- Por qué una tabla y no localStorage, que es donde ya viven los filtros. `useUserPreference` es
-- localStorage namespaceado por usuario, y está bien para lo que hace: recordar qué filtro tenés
-- puesto, qué pestaña mirabas, qué panel dejaste recogido — estado de UI que se pierde y no pasa
-- nada. Una vista guardada no es eso: es un artefacto que la persona creó y nombró. Perderlo al
-- limpiar la caché, o no encontrarlo al entrar desde otra máquina, es un bug.
--
-- Lo que NO viene acá: los valores que están puestos ahora mismo. Cambian con cada tecla y
-- escribirlos a la base sería un round-trip por interacción. Esta tabla se toca sólo al guardar,
-- al cargar y al borrar una vista.
--
-- Diseño: docs/superpowers/specs/2026-09-04-filtros-reutilizables-design.md
-- Rollback: supabase/rollback/vistas-filtro-rollback.sql

BEGIN;

CREATE TABLE public.vistas_filtro (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  -- ON DELETE CASCADE, al revés que las FK de `actividades`, que son SET NULL. Una actividad sin
  -- creador sigue siendo una actividad; una vista sin dueño es basura que nadie puede ver ni
  -- borrar, porque la RLS de abajo corta justamente por `usuario_id`.
  usuario_id        uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  -- Qué tabla filtra: 'tasks', 'research', … Es text y no un DOMAIN con CHECK a propósito: la
  -- lista crece con cada módulo que adopte el motor, y un CHECK obligaría a una migración por
  -- módulo. La fuente única del valor es la constante de TypeScript; el peor caso de un typo es
  -- que tu vista no aparezca, no un agujero de acceso.
  ambito            text NOT NULL,
  nombre            text NOT NULL,
  valores           jsonb   NOT NULL DEFAULT '{}'::jsonb,
  -- Las claves de def que la persona escondió. Se guarda lo OCULTO y no lo visible: con una
  -- lista de visibles, un filtro agregado por el código mañana nacería invisible para todo el
  -- que tenga una vista vieja.
  ocultos           text[]  NOT NULL DEFAULT '{}',
  abre_por_defecto  boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT vista_nombre_unico UNIQUE (usuario_id, ambito, nombre),
  CONSTRAINT vista_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

ALTER TABLE public.vistas_filtro ENABLE ROW LEVEL SECURITY;

CREATE INDEX vistas_filtro_usuario_ambito_idx ON public.vistas_filtro (usuario_id, ambito);

-- UNA sola vista de apertura por persona y ámbito. Parcial y no un constraint: sin el WHERE,
-- `false` colisionaría consigo mismo y no se podría tener dos vistas sin marcar.
CREATE UNIQUE INDEX vista_default_unica
  ON public.vistas_filtro (usuario_id, ambito) WHERE abre_por_defecto;

-- Cada quien ve y escribe lo suyo, y nada más. Sin gate de módulo a propósito: una vista no
-- contiene datos del negocio —sólo claves de filtro y texto que la propia persona tipeó—, y
-- gatearla por módulo dejaría vistas huérfanas que nadie podría limpiar el día que alguien
-- pierde un módulo.
CREATE POLICY "vistas_filtro_propias" ON public.vistas_filtro FOR ALL
  USING      (usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))
  WITH CHECK (usuario_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()));

-- Defensa en profundidad, igual que 20260831214348_revocar_anon_vistas.sql: la policy ya deja
-- a `anon` sin filas (auth.uid() es NULL), pero el GRANT es lo que se lee en una auditoría.
REVOKE ALL ON public.vistas_filtro FROM anon;

COMMENT ON TABLE public.vistas_filtro IS
  'Combinaciones de filtros guardadas con nombre, por usuario y por tabla (`ambito`). NO es el '
  'estado vivo de los filtros: eso sigue en localStorage vía useUserPreference. Se toca sólo al '
  'guardar, cargar o borrar una vista.';

COMMIT;
