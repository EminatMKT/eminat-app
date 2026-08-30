# Módulo Reuniones — Fase 1: esquema, expediente y participantes

> **Para quien ejecute esto:** usar `superpowers:subagent-driven-development` (recomendado) o
> `superpowers:executing-plans`, tarea por tarea. Los pasos usan `- [ ]` para ir marcando.

**Goal:** dejar el módulo `/reuniones` funcionando de punta a punta para crear una reunión con sus
participantes, sobre el esquema completo de las cuatro tablas.

**Architecture:** módulo autocontenido. Cuatro tablas nuevas con su RLS por operación, cuatro
triggers de Postgres (código, plazo original, inmutabilidad del acta, auditoría), la capa de datos
en `src/shared/data/reuniones/`, y la UI en `src/features/reuniones/`. No lee ni escribe
`actividades`.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Supabase (Postgres + RLS) · CSS Modules ·
vitest (sin DOM) · Framer Motion vía `src/shared/motion`.

**Spec:** `docs/superpowers/specs/2026-08-29-reuniones-design.md` — el plan discute contra ese
documento y se lee junto con él. Las referencias `§n.m` son de ahí.

**Por qué sólo la fase 1:** las fases 2 y 3 se planifican cuando ésta esté en el navegador. Escribir
los tres planes ahora significa reescribir dos.

---

## Antes de empezar: dos cosas que NO son de este plan

1. **La fase 0 ya está hecha** (commit `ddd2e96`): `permissions.ts` se partió en carpeta. Sin eso,
   la Tarea 1 es imposible — el centinela rechazaba cualquier edición del archivo.
2. **La conversación con Freddy sigue pendiente** (§8.5). Lo único que él puede cambiar de este plan
   es `reuniones.empresa`: si insiste con el trabajo transversal (§2.11a), esa columna se vuelve una
   tabla puente y cambian la **Tarea 2** y la consulta de heredados de la fase 3. Todo lo demás es
   seguro. Si el riesgo molesta, hablá con él antes de la Tarea 2 — las Tareas 1, 4 y 9 no dependen
   de eso.

---

## Global Constraints

Estas valen para **todas** las tareas. Salen de §7 del spec y de `rules/`.

- **`any` está prohibido** (`no-explicit-any: error`). La salida es `Pick`/`Omit`/`Partial` o
  `unknown` con narrowing explícito.
- **Un archivo se lee de una sentada:** 50 líneas blando (con marca versionada + fila en
  `rules/EXENCIONES.md`), **150 el techo duro sin excepción**.
- **Un componente es una carpeta** — `index.tsx` + `index.module.css`. Nombre en PascalCase. Una
  carpeta que agrupa va en minúsculas y **no** lleva `index.tsx`. Un `.tsx` declara UN componente.
- **Sin `style` inline**, salvo declarar variables CSS con datos de la base. Medidas en `rem`, no
  en píxeles (excepto `border`, `outline`, `box-shadow`).
- **i18n obligatorio**: toda cadena que ve un usuario sale de `t('clave')`, con la clave en
  `src/shared/i18n/locales/es.json` **y** `en.json`. Nada de `i18n-ignore`.
- **Fechas en hora local**: `localDate()` / `localMonth()` de `@/shared/utils`. **Nunca**
  `toISOString().split('T')[0]`.
- **Consultas sólo en `src/shared/data/`**. Ningún `.from()` en un componente ni en un hook.
- **Imports por barrel**: `@/shared/utils`, `@/shared/data`. Nada de `../../`.
- **El tipo de las props va arriba**, no dentro de la firma. Se llama `Props`.
- **Más de un `useState` en un componente u hook es sospechoso**: lo que se llena junto es un
  objeto, desestructurado una vez.
- **Todo `<select>` obligatorio arranca con `<option value="">`** y la validación rechaza el vacío.
- **Antes de decir que algo funciona:** `npx tsc --noEmit`, `pnpm test`, y abrirlo en el navegador.
  Si no se abrió, se dice que no se abrió.
- **Commits por ruta**: `git commit ruta/uno.ts ruta/dos.css -m "…"`. Nunca `git add -A`, nunca
  `git commit` sin rutas.
- **`supabase db reset` está prohibido.** Para aplicar migraciones: `pnpm supabase migration up`.

**Valores canónicos que hay que usar tal cual** (§2.2, §3.9):

| DOMAIN | Valores |
|---|---|
| `modalidad_reunion` | `presencial · virtual · hibrida` |
| `estado_reunion` | `borrador · en_curso · cerrada` |
| `asistencia` | `presente · ausente · invitado` |
| `rol_en_reunion` | `preside · secretario · participante · invitado` |
| `tipo_reunion` | `seguimiento · planificacion · revision_direccion · comite · extraordinaria` |
| `estado_pendiente` | `Pendiente · En proceso · Por aprobar · Completado` |

---

## Estructura de archivos

Qué se crea y de qué responde cada uno.

```
supabase/migrations/
  <ts>_reuniones_esquema.sql          Tarea 2 — DOMAINs, tablas, índices, RLS, policies
  <ts>_reuniones_triggers.sql         Tarea 3 — código, fecha_original, inmutabilidad, auditoría
  <ts>_historial_auditoria.sql        Tarea 4 — FK ON DELETE SET NULL + usuario_id + la función
supabase/rollback/
  reuniones-fase-1-rollback.sql       Tarea 2 — se escribe ANTES del push

src/shared/auth/permissions/modulos/
  slugs.ts                            Tarea 1 — el slug
  index.ts                            Tarea 1 — la entrada de MODULE_META
src/shared/components/shell/
  appShellConfig.ts                   Tarea 1 — NAV y AUTO_TITLE
src/shared/i18n/locales/es.json·en.json  Tareas 1,6,7,8 — las claves
src/app/(app)/reuniones/page.tsx      Tarea 1 — thin route

src/shared/data/reuniones/
  index.ts        barrel, sólo re-exporta
  reuniones.ts    list, byId, insert, update
  participantes.ts  listByReunion, insert, update, remove

src/features/reuniones/
  types.ts                            Tarea 5 — Reunion, Participante, ReunionForm
  constants/index.ts                  Tarea 5 — los META de los seis DOMAIN
  context/ReunionProvider/index.tsx   Tarea 6
  hooks/useReuniones/index.ts         Tarea 6 — el listado
  hooks/useReunion/index.ts           Tarea 7 — una reunión + su formulario
  hooks/useParticipantes/index.ts     Tarea 8
  hooks/index.ts                      barrel
  utils/validarReunion/index.ts + index.test.ts    Tarea 7 — función pura, con test
  components/
    listado/ReunionesListado/ · ReunionRow/        Tarea 6
    expediente/ExpedienteView/ · DatosGenerales/   Tarea 7
    participantes/ParticipantesPanel/ · ParticipanteRow/ · InvitadoExternoForm/  Tarea 8

rules/base-de-datos.md                Tarea 2 — la regla de contención con su check
rules/EXENCIONES.md                   cualquier tarea que necesite una marca
CLAUDE.md                             Tarea 1 — tabla de módulos + árbol
```

---

## Tarea 1: Registrar el módulo `reuniones`

Sin esto el módulo no existe para la app: `validateModuleSlugs` rechaza el slug con
`Módulos inválidos: reuniones` y la casilla de `/admin` → Roles ni se dibuja (§4.1).

**Files:**
- Modify: `src/shared/auth/permissions/modulos/slugs.ts`
- Modify: `src/shared/auth/permissions/modulos/index.ts`
- Modify: `src/shared/auth/permissions/modulos/index.test.ts`
- Modify: `src/shared/components/shell/appShellConfig.ts`
- Modify: `src/shared/i18n/locales/es.json` · `en.json`
- Create: `src/app/(app)/reuniones/page.tsx`
- Modify: `CLAUDE.md`

**Interfaces:**
- Produces: `MODULE.REUNIONES = 'reuniones'`, y `'reuniones'` pasa a ser miembro de `ModuleSlug`.
  Todas las tareas siguientes lo usan.

- [ ] **Paso 1: escribir el test que falla**

En `src/shared/auth/permissions/modulos/index.test.ts`, agregar `'reuniones'` al candado:

```ts
  it('ALL_MODULES = set canónico', () => {
    expect([...ALL_MODULES].sort()).toEqual(
      ['accounting','admin','cobranzas','directorio','medical','research','reuniones','stratix-mkt','th-hr'].sort()
    )
  })
```

- [ ] **Paso 2: correrlo y verlo fallar**

Run: `pnpm test -- permissions/modulos`
Expected: FAIL — el array recibido no tiene `'reuniones'`.

- [ ] **Paso 3: agregar el slug**

En `slugs.ts`, dentro de `MODULE`, **antes** de `ADMIN`:

```ts
  REUNIONES: 'reuniones',
```

- [ ] **Paso 4: agregar la entrada del catálogo**

En `modulos/index.ts`, dentro de `MODULE_META`, antes de la entrada de `ADMIN`:

```ts
  [MODULE.REUNIONES]: {
    slug: MODULE.REUNIONES,
    name: 'Reuniones',
    description: 'Actas, participantes y pendientes de las reuniones del grupo.',
    leader: null,
  },
```

> `name` y `description` quedan en español duro, igual que los otros ocho módulos. §7 del spec
> marca esto como deuda conocida: `MODULE_META` no es `.tsx`, así que el check de i18n no lo ve,
> pero la regla igual lo pide. **Se anota en `.todo` y no se resuelve acá** — arreglarlo para un
> módulo y no para los otros ocho es peor que la deuda.

- [ ] **Paso 5: correr el test y verlo pasar**

Run: `pnpm test -- permissions/modulos`
Expected: PASS.

Run también: `pnpm test -- routes`
Expected: FAIL — `routes.test.ts` exige que cada slug tenga su carpeta en `src/app/(app)/`. Esa es
la siguiente red y es correcta que salte ahora.

- [ ] **Paso 6: crear la thin route**

`src/app/(app)/reuniones/page.tsx`:

```tsx
export default function ReunionesPage() {
  return <div>Reuniones</div>
}
```

> Placeholder deliberado: la Tarea 6 lo reemplaza por el módulo. Existe ahora sólo para que
> `routes.test.ts` pase y el rail tenga a dónde navegar.

- [ ] **Paso 7: agregar el ítem del rail y el título**

En `src/shared/components/shell/appShellConfig.ts`, agregar `reuniones` a `NAV` y a `AUTO_TITLE`
siguiendo exactamente la forma de las entradas vecinas — leer las de `cobranzas` y copiar su
estructura, incluido el ícono.

> ⚠️ Ese archivo tiene 88 líneas: está sobre el límite blando de 50 y **no tiene marca**. Al
> tocarlo hay que decidir (regla "el que toca un archivo lo deja en la convención vigente"):
> partirlo en `colores.ts` / `nav.ts`, o firmarlo con `// centinela-exime: archivo-extenso@2 — …`
> **y su fila en `rules/EXENCIONES.md`**. Preferir partirlo: el archivo va a crecer con cada
> módulo. Si se firma, la razón tiene que decir por qué no se partió.

- [ ] **Paso 8: las claves de i18n**

En `es.json` y `en.json`, agregar bajo la raíz que use `appShellConfig`:

```json
"reuniones.title": "Reuniones"
```
```json
"reuniones.title": "Meetings"
```

- [ ] **Paso 9: corregir `CLAUDE.md` en este mismo commit**

Agregar a la tabla "Módulos de negocio":

```markdown
| Reuniones | `/reuniones` | Actas de reunión: participantes, temas tratados, pendientes y acta imprimible |
```

Y al árbol de `src/features/`, junto a los demás: `reuniones/`.

> Lo exige `rules/proceso.md`. Si se olvida, `pnpm rules:contexto` frena el push — pero el arreglo
> tiene que estar en ESTE commit, no en el siguiente.

- [ ] **Paso 10: correr el gate completo**

```bash
npx tsc --noEmit && pnpm test && pnpm rules:contexto
```
Expected: todo verde, 428 tests.

- [ ] **Paso 11: commit**

```bash
git add src/app/\(app\)/reuniones/page.tsx
git commit src/shared/auth/permissions/modulos/slugs.ts \
  src/shared/auth/permissions/modulos/index.ts \
  src/shared/auth/permissions/modulos/index.test.ts \
  src/shared/components/shell/appShellConfig.ts \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  src/app/\(app\)/reuniones/page.tsx CLAUDE.md \
  -m "feat(reuniones): registrar el módulo y su ruta"
```

- [ ] **Paso 12: verificar en el navegador**

`pnpm dev`, entrar como admin. El rail tiene que mostrar "Reuniones" y `/reuniones` renderizar el
placeholder. Con un rol no-admin sin el módulo, el ítem no aparece.

---

## Tarea 2: La migración del esquema

**Files:**
- Create: `supabase/migrations/<timestamp>_reuniones_esquema.sql`
- Create: `supabase/rollback/reuniones-fase-1-rollback.sql`
- Modify: `rules/base-de-datos.md` (la regla de contención de §2.10)

**Interfaces:**
- Produces: las tablas `reuniones`, `reunion_participantes`, `reunion_temas`,
  `reunion_pendientes`; los DOMAIN de la tabla de constantes globales; las funciones
  `public.participa_en_reunion(uuid) → boolean` y `public.misma_empresa_reunion(uuid) → boolean`.

- [ ] **Paso 1: crear el archivo de migración**

```bash
pnpm supabase migration new reuniones_esquema
```

- [ ] **Paso 2: escribir los DOMAIN y las tablas**

Van **todos** los DOMAIN arriba, y cada tabla con su `ENABLE ROW LEVEL SECURITY` en este mismo
archivo — lo exige la regla "una tabla nace con RLS encendida", y el centinela bloquea el `CREATE
TABLE` sin ella.

```sql
BEGIN;

CREATE DOMAIN public.modalidad_reunion AS text
  CONSTRAINT modalidad_reunion_valores CHECK (VALUE IN ('presencial','virtual','hibrida'));
CREATE DOMAIN public.estado_reunion AS text
  CONSTRAINT estado_reunion_valores CHECK (VALUE IN ('borrador','en_curso','cerrada'));
CREATE DOMAIN public.asistencia AS text
  CONSTRAINT asistencia_valores CHECK (VALUE IN ('presente','ausente','invitado'));
CREATE DOMAIN public.rol_en_reunion AS text
  CONSTRAINT rol_en_reunion_valores CHECK (VALUE IN ('preside','secretario','participante','invitado'));
CREATE DOMAIN public.tipo_reunion AS text
  CONSTRAINT tipo_reunion_valores CHECK (VALUE IN ('seguimiento','planificacion','revision_direccion','comite','extraordinaria'));
CREATE DOMAIN public.estado_pendiente AS text
  CONSTRAINT estado_pendiente_valores CHECK (VALUE IN ('Pendiente','En proceso','Por aprobar','Completado'));

CREATE TABLE public.reuniones (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  codigo            text UNIQUE,
  empresa           text NOT NULL REFERENCES public.empresas(codigo) ON UPDATE CASCADE,
  titulo            text NOT NULL,
  tipo              public.tipo_reunion,
  lugar             text,
  modalidad         public.modalidad_reunion NOT NULL DEFAULT 'presencial',
  fecha             date NOT NULL,
  hora_inicio       time,
  hora_fin          time,
  objetivo          text,
  conclusiones      text,
  proxima_fecha     date,
  proxima_notas     text,
  estado            public.estado_reunion NOT NULL DEFAULT 'borrador',
  acta_snapshot     jsonb,
  acta_snapshot_at  timestamptz,
  created_by        uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT horas_coherentes CHECK (hora_fin IS NULL OR hora_inicio IS NULL OR hora_fin >= hora_inicio),
  CONSTRAINT acta_cerrada_tiene_snapshot CHECK (estado <> 'cerrada' OR acta_snapshot IS NOT NULL)
);
ALTER TABLE public.reuniones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_participantes (
  id               uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reunion_id       uuid NOT NULL REFERENCES public.reuniones(id) ON DELETE CASCADE,
  usuario_id       uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  invitado_nombre  text,
  invitado_empresa text,
  invitado_email   text,
  rol_en_reunion   public.rol_en_reunion NOT NULL DEFAULT 'participante',
  asistencia       public.asistencia NOT NULL DEFAULT 'presente',
  CONSTRAINT participante_unico UNIQUE (reunion_id, usuario_id),
  CONSTRAINT interno_xor_externo CHECK (
    (usuario_id IS NOT NULL AND invitado_nombre IS NULL) OR
    (usuario_id IS NULL     AND invitado_nombre IS NOT NULL)
  )
);
ALTER TABLE public.reunion_participantes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_temas (
  id          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  reunion_id  uuid NOT NULL REFERENCES public.reuniones(id) ON DELETE CASCADE,
  posicion    int NOT NULL DEFAULT 0,
  titulo      text NOT NULL,
  descripcion text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
ALTER TABLE public.reunion_temas ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reunion_pendientes (
  id                 uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  tema_id            uuid NOT NULL REFERENCES public.reunion_temas(id) ON DELETE CASCADE,
  posicion           int NOT NULL DEFAULT 0,
  titulo             text NOT NULL,
  responsable_id     uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  fecha_original     date,
  fecha_comprometida date,
  estado             public.estado_pendiente NOT NULL DEFAULT 'Pendiente',
  completado_por_id  uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  completado_at      timestamptz,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);
ALTER TABLE public.reunion_pendientes ENABLE ROW LEVEL SECURITY;

CREATE INDEX ON public.reunion_temas (reunion_id);
CREATE INDEX ON public.reunion_pendientes (tema_id);
CREATE INDEX ON public.reunion_pendientes (responsable_id) WHERE estado <> 'Completado';
CREATE INDEX ON public.reuniones (empresa, fecha DESC);
CREATE INDEX ON public.reunion_participantes (reunion_id);
CREATE INDEX ON public.reunion_participantes (usuario_id);
```

- [ ] **Paso 3: las dos funciones de alcance**

Van `SECURITY DEFINER` con `SET search_path`, igual que `is_admin()`. Sin `SET search_path`, quien
las invoca puede anteponer un esquema propio.

```sql
CREATE OR REPLACE FUNCTION public.participa_en_reunion(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reunion_participantes rp
    JOIN public.usuarios u ON u.id = rp.usuario_id
    WHERE rp.reunion_id = p_reunion AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.preside_o_secretaria(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reunion_participantes rp
    JOIN public.usuarios u ON u.id = rp.usuario_id
    WHERE rp.reunion_id = p_reunion
      AND u.auth_id = auth.uid()
      AND rp.rol_en_reunion IN ('preside','secretario')
  );
$$;

CREATE OR REPLACE FUNCTION public.misma_empresa_reunion(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reuniones r
    JOIN public.empresas e ON e.codigo = r.empresa
    JOIN public.usuarios u ON u.empresa_id = e.id
    WHERE r.id = p_reunion AND u.auth_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.reunion_abierta(p_reunion uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.reuniones WHERE id = p_reunion AND estado <> 'cerrada');
$$;
```

> **Verificar antes de escribir esto:** que `usuarios.empresa_id` exista y sea FK a `empresas.id`.
> ```bash
> docker exec supabase_db_eminat-app psql -U postgres -d postgres -c "\d public.usuarios" | grep empresa
> ```
> Si el nombre difiere, ajustar el join. **No suponerlo** — el spec del 28/08 se equivocó
> exactamente así tres veces.

- [ ] **Paso 4: las policies, por operación**

El slug va en variable con su `RAISE`, y la fila de `role_modules` se inserta, se usa y **se
borra** en el mismo bloque (§4.1): `admin` no debe quedar con filas ahí.

```sql
DO $$
DECLARE
  slug text := 'reuniones';
  tbl  text;
BEGIN
  INSERT INTO public.role_modules (role_key, module_slug)
  VALUES ('admin', slug) ON CONFLICT DO NOTHING;

  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;

  -- reuniones
  EXECUTE format($f$
    CREATE POLICY "reuniones_select" ON public.reuniones FOR SELECT USING (
      public.has_module(%L) AND (
        public.is_admin() OR public.participa_en_reunion(id) OR public.misma_empresa_reunion(id)
      ))$f$, slug);
  EXECUTE format($f$
    CREATE POLICY "reuniones_insert" ON public.reuniones FOR INSERT
      WITH CHECK (public.has_module(%L))$f$, slug);
  EXECUTE $f$
    CREATE POLICY "reuniones_update" ON public.reuniones FOR UPDATE
      USING      (public.is_admin() OR (public.preside_o_secretaria(id) AND estado <> 'cerrada'))
      WITH CHECK (public.is_admin() OR (public.preside_o_secretaria(id) AND estado <> 'cerrada'))$f$;
  EXECUTE 'CREATE POLICY "reuniones_delete" ON public.reuniones FOR DELETE USING (public.is_admin())';

  -- participantes y temas: ver la reunión alcanza para leer; preside/secretario para escribir.
  -- `tbl` es una variable APARTE de `slug` a propósito: reusar `slug` como iterador la pisaría y
  -- el DELETE del final borraría la fila equivocada.
  FOREACH tbl IN ARRAY ARRAY['reunion_participantes','reunion_temas'] LOOP
    EXECUTE format($f$
      CREATE POLICY "%1$s_select" ON public.%1$I FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.reuniones r WHERE r.id = reunion_id))$f$, tbl);
    EXECUTE format($f$
      CREATE POLICY "%1$s_write" ON public.%1$I FOR ALL
        USING      (public.is_admin() OR (public.preside_o_secretaria(reunion_id) AND public.reunion_abierta(reunion_id)))
        WITH CHECK (public.is_admin() OR (public.preside_o_secretaria(reunion_id) AND public.reunion_abierta(reunion_id)))$f$, tbl);
  END LOOP;
END $$;
```

> **Por qué el `SELECT` de esas dos tablas alcanza con el `EXISTS`:** la subconsulta contra
> `reuniones` corre con los permisos de quien pregunta, así que la RLS de `reuniones` se aplica —
> sólo devuelve fila si ese usuario puede ver esa reunión. Y no hay recursión infinita porque
> `participa_en_reunion()` es `SECURITY DEFINER`: lee `reunion_participantes` como dueño, saltando
> su propia policy. Verificarlo igual en el Paso 7.

- [ ] **Paso 5: `reunion_pendientes`, que tiene una policy distinta**

Su `UPDATE` es el único que funciona **con el acta cerrada**: es lo que hace posible el arrastre
(§3.7, §4.2).

```sql
DO $$
DECLARE m text := 'reuniones';
BEGIN
  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_select" ON public.reunion_pendientes FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.reunion_temas t WHERE t.id = tema_id))$f$;

  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_write" ON public.reunion_pendientes FOR ALL
      USING (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.reunion_temas t
        WHERE t.id = tema_id AND public.preside_o_secretaria(t.reunion_id) AND public.reunion_abierta(t.reunion_id)))
      WITH CHECK (public.is_admin() OR EXISTS (
        SELECT 1 FROM public.reunion_temas t
        WHERE t.id = tema_id AND public.preside_o_secretaria(t.reunion_id) AND public.reunion_abierta(t.reunion_id)))$f$;

  -- El responsable cierra lo suyo aunque el acta esté cerrada. Va aparte y sólo FOR UPDATE.
  EXECUTE $f$
    CREATE POLICY "reunion_pendientes_responsable" ON public.reunion_pendientes FOR UPDATE
      USING      (responsable_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))
      WITH CHECK (responsable_id IN (SELECT u.id FROM public.usuarios u WHERE u.auth_id = auth.uid()))$f$;

  DELETE FROM public.role_modules WHERE role_key = 'admin' AND module_slug = m;
END $$;

COMMIT;
```

- [ ] **Paso 6: aplicar en local**

Run: `pnpm supabase migration up`
Expected: sin errores. **Si aborta, leer el mensaje antes de tocar nada** — no reintentar a ciegas.

- [ ] **Paso 7: el test — verificar la RLS con sesiones simuladas**

Éste es el test de esta tarea. Ejecutar y comparar contra lo esperado:

```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres <<'SQL'
-- Semilla mínima por la UI NO se puede acá, así que se crea la reunión como postgres.
INSERT INTO reuniones (empresa, titulo, fecha)
VALUES ((SELECT codigo FROM empresas LIMIT 1), 'Prueba RLS', current_date);

\echo '--- un no-admin CON el módulo la ve si es de su empresa o participa ---'
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', (SELECT auth_id FROM usuarios WHERE rol <> 'admin' AND auth_id IS NOT NULL LIMIT 1))::text, true);
  SELECT set_config('role','authenticated', true);
  SELECT count(*) AS ve_reuniones FROM reuniones;
COMMIT;

\echo '--- borrar: sólo admin ---'
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', (SELECT auth_id FROM usuarios WHERE rol <> 'admin' AND auth_id IS NOT NULL LIMIT 1))::text, true);
  SELECT set_config('role','authenticated', true);
  WITH x AS (DELETE FROM reuniones RETURNING 1) SELECT count(*) AS borro FROM x;
ROLLBACK;

DELETE FROM reuniones WHERE titulo = 'Prueba RLS';
SQL
```

Expected: `ve_reuniones` = 1 si ese usuario pertenece a esa empresa, 0 si no (las dos son
correctas — lo que importa es entender cuál aplica). `borro` = **0** siempre.

> Si `ve_reuniones` da 0 para todos, revisar `misma_empresa_reunion`: probablemente el join contra
> `usuarios.empresa_id` está mal (Paso 3).

- [ ] **Paso 8: el guard de la RLS tiene que seguir pasando**

Run: `pnpm db:rls`
Expected: `✓ rls: toda tabla de public tiene RLS encendida`. Si nombra alguna de las cuatro
tablas nuevas, falta un `ENABLE`.

- [ ] **Paso 9: escribir el rollback ANTES de pensar en prod**

`supabase/rollback/reuniones-fase-1-rollback.sql`:

```sql
-- Rollback de la fase 1 de Reuniones. Borra objetos nuevos; no toca ningún dato preexistente.
BEGIN;
DROP TABLE IF EXISTS public.reunion_pendientes CASCADE;
DROP TABLE IF EXISTS public.reunion_temas CASCADE;
DROP TABLE IF EXISTS public.reunion_participantes CASCADE;
DROP TABLE IF EXISTS public.reuniones CASCADE;
DROP FUNCTION IF EXISTS public.participa_en_reunion(uuid);
DROP FUNCTION IF EXISTS public.preside_o_secretaria(uuid);
DROP FUNCTION IF EXISTS public.misma_empresa_reunion(uuid);
DROP FUNCTION IF EXISTS public.reunion_abierta(uuid);
DROP DOMAIN IF EXISTS public.estado_pendiente;
DROP DOMAIN IF EXISTS public.tipo_reunion;
DROP DOMAIN IF EXISTS public.rol_en_reunion;
DROP DOMAIN IF EXISTS public.asistencia;
DROP DOMAIN IF EXISTS public.estado_reunion;
DROP DOMAIN IF EXISTS public.modalidad_reunion;
DELETE FROM public.role_modules WHERE module_slug = 'reuniones';
COMMIT;
```

- [ ] **Paso 10: la regla de contención, con su check**

`rules/proceso.md` exige que una regla nueva nazca con su check, en el mismo commit. En
`rules/base-de-datos.md`, después de "Una tabla nace con RLS encendida":

```markdown
## `reunion_pendientes` no crece

<!-- check: block
     pattern: ALTER TABLE\s+(public\.)?reunion_pendientes\s+ADD COLUMN
     paths: supabase/migrations/
     files: .sql
     version: 1
     test: falla @supabase/migrations/20260901000000_x.sql :: ALTER TABLE public.reunion_pendientes ADD COLUMN prioridad text;
     test: pasa @supabase/migrations/20260901000000_x.sql :: ALTER TABLE public.reuniones ADD COLUMN sala text;
-->

Sus columnas son las de §3.6 del diseño y no se le agregan más.

**Motivo:** `reunion_pendientes` es `actividades` con menos columnas, y eso está aceptado a
sabiendas — la superposición son seis campos que son la forma irreducible de cualquier pendiente.
Lo que hace sostenible esa duplicación es que esté CONGELADA. Si algún día pide `prioridad`,
colaboradores, adjuntos, comentarios o un Kanban propio, eso no es una columna nueva: es la señal
de que dejó de ser una lista dentro de un acta y se volvió un gestor de tareas — y dos gestores de
tareas no se sostienen. Un duplicado congelado se banca años sin molestar; uno que crece produce
los tres `StatCard` del repo.
```

Run: `pnpm rules:check`
Expected: `self-check OK — 44 checks`.

- [ ] **Paso 11: commit**

```bash
git add supabase/migrations/<archivo>.sql supabase/rollback/reuniones-fase-1-rollback.sql
git commit supabase/migrations/<archivo>.sql supabase/rollback/reuniones-fase-1-rollback.sql \
  rules/base-de-datos.md \
  -m "feat(reuniones): esquema, RLS por operación y la regla de contención"
```

---

## Tarea 3: Los triggers

**Files:**
- Create: `supabase/migrations/<timestamp>_reuniones_triggers.sql`

**Interfaces:**
- Consumes: las tablas de la Tarea 2.
- Produces: `reuniones.codigo` se llena solo; `reunion_pendientes.fecha_original` es inmutable.

- [ ] **Paso 1: el test que falla — insertar sin código**

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c \
  "INSERT INTO reuniones (empresa, titulo, fecha) VALUES ((SELECT codigo FROM empresas LIMIT 1),'T3',current_date) RETURNING codigo;"
```
Expected: devuelve `codigo` **NULL**. Ése es el fallo que el trigger arregla.

Limpiar: `DELETE FROM reuniones WHERE titulo='T3';`

- [ ] **Paso 2: escribir el trigger del código**

```bash
pnpm supabase migration new reuniones_triggers
```

```sql
BEGIN;

-- El {NNN} es por empresa y por día, así que no hay SEQUENCE que sirva. Contar filas y sumar uno
-- es una condición de carrera: dos altas simultáneas leen el mismo máximo y el UNIQUE rechaza la
-- segunda con un error crudo. El advisory lock serializa sólo ese par (empresa, fecha) y se
-- libera solo al terminar la transacción.
CREATE OR REPLACE FUNCTION public.set_codigo_reunion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF NEW.codigo IS NOT NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(NEW.empresa || NEW.fecha::text));
  SELECT count(*) + 1 INTO n FROM public.reuniones
   WHERE empresa = NEW.empresa AND fecha = NEW.fecha;
  NEW.codigo := 'MTG-' || NEW.empresa || '-' || to_char(NEW.fecha, 'YYYYMMDD') || '-' || lpad(n::text, 3, '0');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_codigo_reunion BEFORE INSERT ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.set_codigo_reunion();
```

- [ ] **Paso 3: el trigger de `fecha_original`**

Es un dato que sólo sirve si nadie puede tocarlo: que el cliente lo respete es exactamente lo que
no funciona.

```sql
CREATE OR REPLACE FUNCTION public.proteger_fecha_original()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.fecha_original := NEW.fecha_comprometida;
  ELSIF NEW.fecha_original IS DISTINCT FROM OLD.fecha_original THEN
    NEW.fecha_original := OLD.fecha_original;   -- se ignora el intento, no se aborta
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_fecha_original BEFORE INSERT OR UPDATE ON public.reunion_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_fecha_original();
```

- [ ] **Paso 4: el trigger de inmutabilidad del acta cerrada**

Las policies protegen el acceso; el trigger protege la lógica. El repo ya usa este patrón en
`prevent_rol_self_change`.

```sql
CREATE OR REPLACE FUNCTION public.proteger_acta_cerrada()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r_id uuid;
BEGIN
  r_id := CASE TG_TABLE_NAME
            WHEN 'reuniones' THEN COALESCE(OLD.id, NEW.id)
            ELSE COALESCE(OLD.reunion_id, NEW.reunion_id)
          END;
  IF public.is_admin() THEN RETURN COALESCE(NEW, OLD); END IF;
  IF EXISTS (SELECT 1 FROM public.reuniones WHERE id = r_id AND estado = 'cerrada') THEN
    RAISE EXCEPTION 'el acta está cerrada: no se puede modificar';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_acta_cerrada BEFORE UPDATE OR DELETE ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();
CREATE TRIGGER trg_acta_cerrada BEFORE INSERT OR UPDATE OR DELETE ON public.reunion_temas
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();
CREATE TRIGGER trg_acta_cerrada BEFORE INSERT OR UPDATE OR DELETE ON public.reunion_participantes
  FOR EACH ROW EXECUTE FUNCTION public.proteger_acta_cerrada();

COMMIT;
```

> **`reunion_pendientes` NO lleva este trigger, a propósito:** su `UPDATE` tiene que seguir
> funcionando con el acta cerrada, o el arrastre no existe (§3.7). Si lo agregás, rompés el flujo
> estrella del módulo.

- [ ] **Paso 5: aplicar y verificar el código**

```bash
pnpm supabase migration up
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c \
  "INSERT INTO reuniones (empresa, titulo, fecha) VALUES ((SELECT codigo FROM empresas LIMIT 1),'T3',current_date) RETURNING codigo;"
```
Expected: un código con la forma `MTG-<EMPRESA>-20260829-001`.

Insertar una segunda con la misma empresa y fecha: tiene que dar `-002`.

- [ ] **Paso 6: verificar la inmutabilidad y `fecha_original`**

```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres <<'SQL'
\echo '--- fecha_original se fija sola y no se puede pisar ---'
WITH r AS (SELECT id FROM reuniones WHERE titulo='T3' LIMIT 1),
     t AS (INSERT INTO reunion_temas (reunion_id, titulo) SELECT id,'tema' FROM r RETURNING id)
INSERT INTO reunion_pendientes (tema_id, titulo, fecha_comprometida)
SELECT id, 'p', current_date FROM t;

UPDATE reunion_pendientes SET fecha_original = '2000-01-01', fecha_comprometida = current_date + 10;
SELECT fecha_original = current_date AS original_intacta,
       fecha_comprometida = current_date + 10 AS vigente_se_movio
FROM reunion_pendientes;

\echo '--- un acta cerrada no se toca (como no-admin) ---'
UPDATE reuniones SET estado='cerrada', acta_snapshot='{"v":1}'::jsonb WHERE titulo='T3';
BEGIN;
  SELECT set_config('request.jwt.claims',
    json_build_object('sub',(SELECT auth_id FROM usuarios WHERE rol<>'admin' AND auth_id IS NOT NULL LIMIT 1))::text, true);
  SELECT set_config('role','authenticated', true);
  UPDATE reuniones SET titulo='pisado' WHERE titulo='T3';
ROLLBACK;
SQL
```
Expected: `original_intacta` = **t**, `vigente_se_movio` = **t**, y el último `UPDATE` **falla** con
`el acta está cerrada`. Que falle es el resultado correcto.

Limpiar: `DELETE FROM reuniones WHERE titulo IN ('T3','pisado');`

- [ ] **Paso 7: commit**

```bash
git add supabase/migrations/<archivo>.sql
git commit supabase/migrations/<archivo>.sql -m "feat(reuniones): código por trigger, plazo original inmutable y acta cerrada de solo lectura"
```

---

## Tarea 4: La auditoría y las dos listas hardcodeadas

Esta tarea es la que evita dos roturas que **no están en el SQL** y que ninguna migración habría
descubierto (§4.3). Es independiente de las Tareas 5–8: se puede hacer en cualquier momento
después de la 2.

**Files:**
- Create: `supabase/migrations/<timestamp>_historial_auditoria.sql`
- Modify: `src/features/admin/org-catalogs.ts`

- [ ] **Paso 1: el test que falla — borrar a quien presidió**

```bash
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres <<'SQL'
INSERT INTO reuniones (empresa, titulo, fecha, created_by)
VALUES ((SELECT codigo FROM empresas LIMIT 1), 'T4', current_date,
        (SELECT id FROM usuarios WHERE rol <> 'admin' LIMIT 1));
SELECT public.admin_reassign_and_delete(
  (SELECT id FROM usuarios WHERE rol <> 'admin' LIMIT 1),
  (SELECT id FROM usuarios WHERE rol = 'admin' LIMIT 1));
SQL
```
Expected: **falla** con violación de FK contra `reuniones.created_by`… o **no falla**, porque
`created_by` es `ON DELETE SET NULL`. **Correr esto y anotar cuál de las dos pasa** — si no falla,
la rotura está sólo en las FK que no son SET NULL, y hay que revisar cuáles quedaron así en la
Tarea 2.

Limpiar: `DELETE FROM reuniones WHERE titulo='T4';`

- [ ] **Paso 2: arreglar `historial` y su función**

```bash
pnpm supabase migration new historial_auditoria
```

```sql
BEGIN;

-- 1. Que borrar un usuario NO borre su rastro. Hoy `admin_reassign_and_delete` hace
--    DELETE FROM historial WHERE usuario_id = ... porque la FK no declara ON DELETE. Resultado:
--    desaparece la traza de quien se va, que es la que más se querría mirar.
ALTER TABLE public.historial DROP CONSTRAINT historial_usuario_id_fkey;
ALTER TABLE public.historial ADD CONSTRAINT historial_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- 2. Registrar QUIÉN, no sólo qué. Hoy 0 de 277 filas tienen usuario_id.
CREATE OR REPLACE FUNCTION public.usuario_actual_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.usuarios WHERE auth_id = auth.uid();
$$;

-- 3. La auditoría del módulo.
CREATE OR REPLACE FUNCTION public.log_reunion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO historial (tabla, registro_id, accion, usuario_id)
    VALUES (TG_TABLE_NAME, OLD.id, 'deleted', public.usuario_actual_id());
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial (tabla, registro_id, accion, usuario_id)
    VALUES (TG_TABLE_NAME, NEW.id, 'created', public.usuario_actual_id());
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'reuniones' AND OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
    VALUES ('reuniones', NEW.id, 'updated', 'estado', OLD.estado, NEW.estado, public.usuario_actual_id());
  END IF;

  IF TG_TABLE_NAME = 'reunion_pendientes' THEN
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
      INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('reunion_pendientes', NEW.id, 'updated', 'estado', OLD.estado, NEW.estado, public.usuario_actual_id());
    END IF;
    IF OLD.fecha_comprometida IS DISTINCT FROM NEW.fecha_comprometida THEN
      INSERT INTO historial (tabla, registro_id, accion, campo, valor_anterior, valor_nuevo, usuario_id)
      VALUES ('reunion_pendientes', NEW.id, 'updated', 'fecha_comprometida',
              OLD.fecha_comprometida::text, NEW.fecha_comprometida::text, public.usuario_actual_id());
    END IF;
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_log AFTER INSERT OR UPDATE OR DELETE ON public.reuniones
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();
CREATE TRIGGER trg_log AFTER INSERT OR UPDATE OR DELETE ON public.reunion_pendientes
  FOR EACH ROW EXECUTE FUNCTION public.log_reunion();

-- 4. Que dar de baja a un usuario no falle por las tablas nuevas, y que NO le borre el historial.
--    Hay que reescribir `admin_reassign_and_delete` copiando su cuerpo actual y cambiando dos
--    cosas: quitar la línea `DELETE FROM public.historial ...` (ahora la FK lo resuelve) y no
--    agregar nada por reuniones (todas sus FK a usuarios son ON DELETE SET NULL).
--    LEER LA FUNCIÓN ACTUAL ANTES DE REESCRIBIRLA:
--      SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='admin_reassign_and_delete';

COMMIT;
```

> **El paso 4 de arriba es trabajo real, no un comentario.** Hay que traer el cuerpo actual de la
> función, quitarle la línea del historial, y volver a declararla completa en esta migración. No se
> puede "parchear" una función de Postgres: se re-declara entera.

- [ ] **Paso 3: aplicar y verificar los tres comportamientos**

```bash
pnpm supabase migration up
docker exec -i supabase_db_eminat-app psql -U postgres -d postgres <<'SQL'
INSERT INTO reuniones (empresa, titulo, fecha)
VALUES ((SELECT codigo FROM empresas LIMIT 1), 'T4b', current_date);
SELECT accion, tabla, usuario_id IS NOT NULL AS tiene_autor
FROM historial WHERE tabla='reuniones' ORDER BY created_at DESC LIMIT 1;

DELETE FROM reuniones WHERE titulo='T4b';
SELECT accion FROM historial WHERE tabla='reuniones' ORDER BY created_at DESC LIMIT 1;
SQL
```
Expected: primero `created`, después `deleted`. **Borrar deja rastro** — que es todo el punto.
`tiene_autor` será `f` si se corre como `postgres` (no hay `auth.uid()`); para verlo en `t`, repetir
dentro de una transacción con `set_config('request.jwt.claims', …)` como en la Tarea 2.

- [ ] **Paso 4: agregar `reuniones` al chequeo de "empresa en uso"**

En `src/features/admin/org-catalogs.ts`, en `blockedBy` de `empresas`, agregar:

```ts
      // reuniones.empresa referencia la clave natural, no el uuid — igual que actividades.
      { table: 'reuniones', column: 'empresa', matchOn: 'codigo' },
```

Sin esto, el panel cuenta 0 dependientes para una empresa con reuniones, dice que no está en uso, y
el `DELETE` explota con el error crudo de Postgres — el fallo exacto que ese chequeo existe para
evitar.

- [ ] **Paso 5: verificar en el navegador**

`pnpm dev` → `/admin` → Organización → intentar borrar la empresa que tiene la reunión de prueba.
Expected: el panel dice que está en uso y **no** deja borrar.

- [ ] **Paso 6: gate y commit**

```bash
npx tsc --noEmit && pnpm test && pnpm db:rls
git add supabase/migrations/<archivo>.sql
git commit supabase/migrations/<archivo>.sql src/features/admin/org-catalogs.ts \
  -m "feat(reuniones): auditoría sobre historial y las dos listas hardcodeadas"
```

---

## Tarea 5: Tipos, constantes y capa de datos

**Files:**
- Create: `src/features/reuniones/types.ts`
- Create: `src/features/reuniones/constants/index.ts`
- Create: `src/shared/data/reuniones/index.ts` · `reuniones.ts` · `participantes.ts`
- Modify: `src/shared/data/index.ts`
- Modify: `src/shared/i18n/locales/es.json` · `en.json`

**Interfaces:**
- Produces:
  - `type Reunion`, `type Participante`, `type ReunionForm` en `@/features/reuniones/types`
  - `reunionesRepo.list()`, `.byId(id)`, `.insert(form)`, `.update(id, patch)`
  - `reunionesRepo.participantes.listByReunion(id)`, `.insert(row)`, `.remove(id)`
  - `modalidadLabel(v, t)`, `estadoReunionLabel(v, t)`, `rolEnReunionLabel(v, t)`, `tipoReunionLabel(v, t)`

- [ ] **Paso 1: los tipos**

`src/features/reuniones/types.ts`:

```ts
export type ModalidadReunion = 'presencial' | 'virtual' | 'hibrida'
export type EstadoReunion = 'borrador' | 'en_curso' | 'cerrada'
export type TipoReunion = 'seguimiento' | 'planificacion' | 'revision_direccion' | 'comite' | 'extraordinaria'
export type RolEnReunion = 'preside' | 'secretario' | 'participante' | 'invitado'
export type Asistencia = 'presente' | 'ausente' | 'invitado'

export type Reunion = {
  id: string
  codigo: string | null
  empresa: string
  titulo: string
  tipo: TipoReunion | null
  lugar: string | null
  modalidad: ModalidadReunion
  fecha: string
  hora_inicio: string | null
  hora_fin: string | null
  objetivo: string | null
  conclusiones: string | null
  proxima_fecha: string | null
  proxima_notas: string | null
  estado: EstadoReunion
  created_by: string | null
}

export type Participante = {
  id: string
  reunion_id: string
  usuario_id: string | null
  invitado_nombre: string | null
  invitado_empresa: string | null
  invitado_email: string | null
  rol_en_reunion: RolEnReunion
  asistencia: Asistencia
}

// Lo que el formulario del expediente llena. Un solo objeto: es lo que se llena y se envía junto.
export type ReunionForm = {
  empresa: string
  titulo: string
  tipo: TipoReunion | ''
  lugar: string
  modalidad: ModalidadReunion
  fecha: string
  hora_inicio: string
  hora_fin: string
  objetivo: string
}
```

- [ ] **Paso 2: las constantes META**

`src/features/reuniones/constants/index.ts`. Mismo patrón que `ESTADO` en
`src/shared/constants/domain.ts`: un objeto META del que derivan listas, colores y etiquetas.
**El valor canónico nunca se renderiza** — la etiqueta sale de i18n.

```ts
import type { I18nKey } from '@/shared/i18n'
import type { ModalidadReunion, EstadoReunion, TipoReunion, RolEnReunion, Asistencia } from '../types'

const MODALIDAD_META = {
  presencial: { labelKey: 'reuniones.modalidad.presencial', color: '#7C6FF7' },
  virtual:    { labelKey: 'reuniones.modalidad.virtual',    color: '#34D399' },
  hibrida:    { labelKey: 'reuniones.modalidad.hibrida',    color: '#FBB040' },
} satisfies Record<ModalidadReunion, { labelKey: I18nKey; color: string }>

export const MODALIDADES = Object.keys(MODALIDAD_META) as ModalidadReunion[]

export function modalidadLabel(v: string | undefined, t: (k: I18nKey) => string): string {
  const meta = (MODALIDAD_META as Record<string, { labelKey: I18nKey }>)[v ?? '']
  return meta ? t(meta.labelKey) : (v || '—')
}
```

Repetir la misma forma para `ESTADO_REUNION_META`, `TIPO_META`, `ROL_META` y `ASISTENCIA_META`,
cada uno con su lista derivada y su función `…Label`.

> **Verificar el nombre real del tipo de las claves i18n antes de escribir el import**: leer
> `src/shared/i18n/index.ts` y usar el que exporte. Si no exporta un tipo de claves, usar `string`
> y anotarlo.

- [ ] **Paso 3: las claves i18n de las constantes**

Agregar a `es.json` y `en.json` **todas** las claves que nombran los META — cinco catálogos, 19
valores. Si falta una, el label cae al valor crudo y se ve el canónico en pantalla, que es
exactamente lo que la regla prohíbe.

- [ ] **Paso 4: la capa de datos**

`src/shared/data/reuniones/reuniones.ts`:

```ts
import { supabase } from '@/shared/db/supabase'
import type { Reunion, ReunionForm } from '@/features/reuniones/types'

const TABLA = 'reuniones'

export const list = () =>
  supabase.from(TABLA).select('*').order('fecha', { ascending: false })

export const byId = (id: string) =>
  supabase.from(TABLA).select('*').eq('id', id).single()

export const insert = (form: ReunionForm) =>
  supabase.from(TABLA).insert({ ...form, tipo: form.tipo || null }).select().single()

export const update = (id: string, patch: Partial<Reunion>) =>
  supabase.from(TABLA).update(patch).eq('id', id).select().single()
```

`src/shared/data/reuniones/participantes.ts` con `listByReunion`, `insert`, `update`, `remove`,
siguiendo la misma forma.

`src/shared/data/reuniones/index.ts` — **sólo re-exporta**:

```ts
export * from './reuniones'
export * as participantes from './participantes'
```

- [ ] **Paso 5: agregarlo al barrel de `src/shared/data`**

En `src/shared/data/index.ts`:

```ts
export * as reunionesRepo from './reuniones'
```

> Importar `@/shared/data/reuniones` directo frena por la regla del barrel. Los consumidores usan
> `import { reunionesRepo } from '@/shared/data'`.

- [ ] **Paso 6: verificar tipos y commit**

```bash
npx tsc --noEmit && pnpm test
git add src/features/reuniones src/shared/data/reuniones
git commit src/features/reuniones/types.ts src/features/reuniones/constants/index.ts \
  src/shared/data/reuniones src/shared/data/index.ts \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  -m "feat(reuniones): tipos, catálogos y capa de datos"
```

---

## Tarea 6: El listado de reuniones

**Files:**
- Create: `src/features/reuniones/hooks/useReuniones/index.ts`
- Create: `src/features/reuniones/hooks/index.ts`
- Create: `src/features/reuniones/components/listado/ReunionesListado/index.tsx` + `index.module.css`
- Create: `src/features/reuniones/components/listado/ReunionRow/index.tsx` + `index.module.css`
- Modify: `src/app/(app)/reuniones/page.tsx`
- Modify: `src/shared/i18n/locales/es.json` · `en.json`

**Interfaces:**
- Consumes: `reunionesRepo.list()` (Tarea 5)
- Produces: `useReuniones() → { reuniones, cargando, error, recargar }`

- [ ] **Paso 1: el hook**

Un solo objeto de estado — lo que se llena junto viaja junto:

```ts
import { useCallback, useEffect, useState } from 'react'
import { reunionesRepo } from '@/shared/data'
import type { Reunion } from '../../types'

type Estado = { reuniones: Reunion[]; cargando: boolean; error: string | null }
const VACIO: Estado = { reuniones: [], cargando: true, error: null }

export function useReuniones() {
  const [estado, setEstado] = useState<Estado>(VACIO)
  const { reuniones, cargando, error } = estado

  const recargar = useCallback(async () => {
    setEstado((p) => ({ ...p, cargando: true }))
    const { data, error } = await reunionesRepo.list()
    setEstado({ reuniones: data ?? [], cargando: false, error: error?.message ?? null })
  }, [])

  useEffect(() => { void recargar() }, [recargar])

  const resultado = { reuniones, cargando, error, recargar }
  return resultado
}
```

> El `return` se arma en una variable con nombre porque tiene cuatro campos (`rules/codigo.md`).

- [ ] **Paso 2: la fila**

`ReunionRow/index.tsx` — un componente que muestra una reunión. **Antes de escribirlo, buscar si ya
existe algo parecido** y dejar la búsqueda escrita, que es lo que el centinela va a exigir:

```tsx
// centinela-exime: bloques-similares@1 — busqué en src/shared/components/ una fila de tabla
// genérica y las de features/directorio y features/admin: las dos traen su dominio adentro
// (departamento, rol). Ésta nace en el módulo; si aparece una segunda, sube a shared.
```

Y **su fila en `rules/EXENCIONES.md`**, o la marca no exime.

- [ ] **Paso 3: el listado**

`ReunionesListado/index.tsx` monta el hook, mapea a `<ReunionRow />` y muestra el estado vacío.
La acción primaria ("Nueva reunión") va **en la barra de esta vista**, no en el topbar
(`rules/ui.md`), reusando `NewButton` como hace Admin.

- [ ] **Paso 4: la thin route**

```tsx
import ReunionesListado from '@/features/reuniones/components/listado/ReunionesListado'

export default function ReunionesPage() {
  return <ReunionesListado />
}
```

- [ ] **Paso 5: verificar en el navegador**

`pnpm dev` → `/reuniones`. Con las reuniones de prueba de las tareas anteriores borradas, tiene que
mostrar el estado vacío sin romperse. Crear una por SQL y recargar: aparece.

- [ ] **Paso 6: gate y commit**

```bash
npx tsc --noEmit && pnpm test && pnpm lint:css
git add src/features/reuniones/hooks src/features/reuniones/components
git commit src/features/reuniones/hooks src/features/reuniones/components \
  src/app/\(app\)/reuniones/page.tsx rules/EXENCIONES.md \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  -m "feat(reuniones): listado de reuniones"
```

---

## Tarea 7: El expediente — datos generales

**Files:**
- Create: `src/features/reuniones/utils/validarReunion/index.ts` + `index.test.ts`
- Create: `src/features/reuniones/hooks/useReunion/index.ts`
- Create: `src/features/reuniones/components/expediente/ExpedienteView/index.tsx` + `.module.css`
- Create: `src/features/reuniones/components/expediente/DatosGenerales/index.tsx` + `.module.css`
- Modify: `src/shared/i18n/locales/es.json` · `en.json`

**Interfaces:**
- Consumes: `ReunionForm` (Tarea 5), `reunionesRepo.insert/update`
- Produces: `validarReunion(form) → string[]` (claves i18n de los errores)

- [ ] **Paso 1: escribir el test que falla**

`src/features/reuniones/utils/validarReunion/index.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { validarReunion } from './index'
import type { ReunionForm } from '../../types'

const OK: ReunionForm = {
  empresa: 'EMC', titulo: 'Semanal', tipo: 'seguimiento', lugar: '',
  modalidad: 'presencial', fecha: '2026-08-29', hora_inicio: '09:00', hora_fin: '10:00', objetivo: '',
}

describe('validarReunion', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validarReunion(OK)).toEqual([])
  })
  it('la empresa es obligatoria y el placeholder vacío no cuenta', () => {
    expect(validarReunion({ ...OK, empresa: '' })).toContain('reuniones.error.empresa')
  })
  it('el título es obligatorio y no puede ser espacios', () => {
    expect(validarReunion({ ...OK, titulo: '   ' })).toContain('reuniones.error.titulo')
  })
  it('la fecha es obligatoria', () => {
    expect(validarReunion({ ...OK, fecha: '' })).toContain('reuniones.error.fecha')
  })
  it('la hora de fin no puede ser anterior a la de inicio', () => {
    expect(validarReunion({ ...OK, hora_fin: '08:00' })).toContain('reuniones.error.horas')
  })
  it('las horas vacías no son un error', () => {
    expect(validarReunion({ ...OK, hora_inicio: '', hora_fin: '' })).toEqual([])
  })
})
```

- [ ] **Paso 2: correrlo y verlo fallar**

Run: `pnpm test -- validarReunion`
Expected: FAIL — `validarReunion` no existe.

- [ ] **Paso 3: implementarlo**

```ts
import type { ReunionForm } from '../../types'

// Devuelve claves de i18n, no textos: quien la llama traduce. Así la función es pura y testeable
// sin montar nada, y el mensaje que ve el usuario sigue saliendo de es.json / en.json.
export function validarReunion(form: ReunionForm): string[] {
  const errores: string[] = []
  if (!form.empresa) errores.push('reuniones.error.empresa')
  if (!form.titulo.trim()) errores.push('reuniones.error.titulo')
  if (!form.fecha) errores.push('reuniones.error.fecha')
  if (form.hora_inicio && form.hora_fin && form.hora_fin < form.hora_inicio) {
    errores.push('reuniones.error.horas')
  }
  return errores
}
```

- [ ] **Paso 4: correr el test y verlo pasar**

Run: `pnpm test -- validarReunion`
Expected: PASS, 6 casos.

- [ ] **Paso 5: el hook del expediente**

`useReunion(id?)` — un solo objeto de estado para el formulario, desestructurado una vez, y un
setter genérico:

```ts
const [form, setForm] = useState<ReunionForm>(FORM_VACIO)
const set = (k: keyof ReunionForm) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
  setForm((p) => ({ ...p, [k]: e.target.value }))
```

Guardar llama a `validarReunion` primero y sólo escribe si no hay errores.

> **La fecha por defecto sale de `localDate()`** de `@/shared/utils`, nunca de
> `new Date().toISOString().split('T')[0]`: en UTC-4, después de las 20:00 eso devuelve mañana.

- [ ] **Paso 6: el formulario**

`DatosGenerales/index.tsx`. **Los cinco `<select>` obligatorios arrancan con
`<option value="">— Seleccionar —</option>`** (empresa, tipo, modalidad, y los que agregue la
Tarea 8). Sin eso, el navegador pinta la primera opción y el estado queda en `''`: es el bug que
este repo ya tuvo dos veces.

Los handlers con cuerpo van declarados arriba con nombre, no inline en la prop.

- [ ] **Paso 7: verificar en el navegador**

`pnpm dev` → `/reuniones` → "Nueva reunión". Probar:
- Guardar vacío → muestra los errores traducidos, no guarda.
- Elegir empresa y título, guardar → aparece en el listado **con su código** `MTG-…-001`.
- Recargar (F5) → sigue ahí.
- Cambiar el idioma a inglés → ningún texto en español duro.

- [ ] **Paso 8: gate y commit**

```bash
npx tsc --noEmit && pnpm test && pnpm lint:css
git add src/features/reuniones/utils src/features/reuniones/hooks/useReunion src/features/reuniones/components/expediente
git commit src/features/reuniones/utils src/features/reuniones/hooks src/features/reuniones/components \
  src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  -m "feat(reuniones): expediente con datos generales y su validación"
```

---

## Tarea 8: Participantes, internos y externos

**Files:**
- Create: `src/features/reuniones/hooks/useParticipantes/index.ts`
- Create: `src/features/reuniones/components/participantes/ParticipantesPanel/index.tsx` + `.module.css`
- Create: `src/features/reuniones/components/participantes/ParticipanteRow/index.tsx` + `.module.css`
- Create: `src/features/reuniones/components/participantes/InvitadoExternoForm/index.tsx` + `.module.css`
- Modify: `src/shared/i18n/locales/es.json` · `en.json`

**Interfaces:**
- Consumes: `reunionesRepo.participantes.*` (Tarea 5), `useApp().usuarios` para el dropdown
- Produces: `useParticipantes(reunionId) → { participantes, cargando, agregarInterno, agregarExterno, cambiarRol, cambiarAsistencia, quitar }`

- [ ] **Paso 1: el panel de internos**

Dropdown con los usuarios activos (de `useApp()`), placeholder vacío, más selects de rol y
asistencia. Al agregar, `insert` con `usuario_id` y `invitado_nombre` en NULL — el `CHECK`
`interno_xor_externo` de la base lo exige.

- [ ] **Paso 2: verificar que el CHECK realmente frena**

```bash
docker exec supabase_db_eminat-app psql -U postgres -d postgres -c \
  "INSERT INTO reunion_participantes (reunion_id, usuario_id, invitado_nombre)
   VALUES ((SELECT id FROM reuniones LIMIT 1), (SELECT id FROM usuarios LIMIT 1), 'Juan');"
```
Expected: **falla** con `interno_xor_externo`. Si pasa, el `CHECK` de la Tarea 2 quedó mal escrito.

- [ ] **Paso 3: el formulario de externos**

Nombre, empresa y **correo** (§3.2: el correo entra ahora aunque el envío del acta sea de otra
fase, porque después el snapshot congelaría a los participantes sin él y no habría de dónde
sacarlo). `usuario_id` va NULL.

- [ ] **Paso 4: el UNIQUE también se prueba**

Agregar dos veces la misma persona interna a la misma reunión.
Expected: la segunda **falla** con `participante_unico`, y la UI muestra un mensaje traducido — no
el error crudo de Postgres.

- [ ] **Paso 5: verificar en el navegador**

Abrir una reunión → agregar dos internos y un externo → cambiar un rol a "Preside" → marcar a uno
como ausente → F5. Todo tiene que persistir.

- [ ] **Paso 6: la prueba que cierra la fase 1**

Esto es el criterio de aceptación de §6 y **no se puede probar con un admin**: `has_module()` abre
con `is_admin() OR …`, así que un admin no ejerce ninguna policy.

1. En `/admin` → Roles, asignar el módulo `reuniones` a un rol no-admin.
2. Entrar con un usuario de ese rol.
3. Crear una reunión, agregarle participantes, verla en el listado.
4. Entrar con un usuario de un rol **sin** el módulo: `/reuniones` no aparece en el rail y navegar
   a mano tiene que rebotar.
5. Con el admin, dar de baja a un usuario que haya presidido una reunión.
   Expected: **funciona**. Si falla con violación de FK, la Tarea 4 quedó incompleta.

- [ ] **Paso 7: gate y commit**

```bash
npx tsc --noEmit && pnpm test && pnpm lint:css && pnpm rules:contexto && pnpm db:rls
git add src/features/reuniones
git commit src/features/reuniones src/shared/i18n/locales/es.json src/shared/i18n/locales/en.json \
  -m "feat(reuniones): participantes internos y externos"
```

---

## Cierre de la fase 1

- [ ] **Anotar en `.todo`** lo que quedó decidido y no hecho: los literales en español de
  `MODULE_META`, y —si se firmó en vez de partir— la marca de `appShellConfig.ts`.
- [ ] **Actualizar `DOING.md`** del pool con el estado real.
- [ ] **El push a prod NO es parte de esta fase.** Va con su backup de `roles` y `role_modules`, su
  precheck (§4.3: `information_schema.domains` para los seis DOMAIN, y el `UNIQUE` de
  `empresas.codigo`) y su rollback ya escrito. Se hace en una sesión aparte, con tiempo.

---

## Lo que esta fase NO deja hecho

Para que nadie lo descubra probando:

- **No hay temas ni pendientes en la UI** — las tablas existen, la pantalla es de la fase 2.
- **No hay acta imprimible ni heredados** — fase 3.
- **No hay notificaciones** (§2.12), ni pipeline, ni panel ejecutivo, ni trabajo transversal
  (§2.11): están descartados con argumento, no pendientes.
- **No hay pantalla de auditoría.** La traza se escribe y se consulta por SQL; mostrarla es
  trabajo posterior y se puede hacer en cualquier momento — registrar es lo que no se puede hacer
  retroactivamente.
