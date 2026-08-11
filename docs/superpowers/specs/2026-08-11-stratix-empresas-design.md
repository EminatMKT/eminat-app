# Stratix 360 contra el catálogo de empresas

**Fecha:** 2026-08-11
**Estado:** aprobado, pendiente de implementar

Eliminar `MARCAS_LIST` y `SOLICITANTES` de `shared/constants/domain.ts` y hacer que
Stratix 360 lea las marcas del catálogo `empresas`, que el admin ya administra desde
`/admin` → Organización.

## Problema

Crear una empresa en Admin → Organización no la hace aparecer en el formulario de
actividades de Stratix. Renombrarla o cambiarle el color tampoco se refleja. El módulo
admin quedó terminado pero Stratix sigue leyendo una lista hardcodeada.

Es el resto de una migración a medias: `empresa_rename_eje_unico` creó las columnas FK
y `empresas_catalogo_pertenencia` unificó el catálogo, pero el paso de cablear las
lecturas del front quedó pendiente.

## Estado actual (verificado en la DB local, 2026-08-11)

| Hecho | Valor |
|---|---|
| Filas en `empresas` | 11, todas `activo = true` |
| Entradas en `MARCAS_LIST` | 7 |
| Filas en `actividades` | 18 |
| `actividades.empresa` (texto) | 18/18 poblado, 7 códigos distintos |
| `actividades.empresa_id` (uuid) | 0/18 |
| `actividades.solicitado_por` | 18/18, **un solo valor**: `Coord_MFreddy` |
| `actividades.solicitante_id` | 0/18 |
| `slots_calendario`, `solicitudes` | 0 filas |

Los 7 códigos usados en `actividades.empresa` existen exactos en `empresas.codigo`, así
que ningún backfill necesita mapeo de alias.

Las 4 empresas que están en el catálogo pero no en `MARCAS_LIST` — `EMINAT`, `STRATIX`,
`ONDARA`, `DACOACH` — entraron por la migración de pertenencia. Responden a *dónde
trabaja una persona*, no a *a qué marca se atribuye una actividad*. La migración lo
declara explícitamente: una sola lista, dos relaciones distintas.

`actividades` arrastra **tres pares** de columna-texto en uso + FK vacía:
`empresa`/`empresa_id`, `solicitado_por`/`solicitante_id`, `responsable_ref`/`responsable_id`.

## Decisiones

| Decisión | Elegido | Por qué |
|---|---|---|
| Distinguir marcas de empresas de pertenencia | Columna `recibe_actividades` | Deja la semántica explícita en datos y administrable. Reusar `activo` la habría sobrecargado y habría sacado esas 4 del selector de pertenencia de usuarios. |
| Nombre de la columna | `recibe_actividades` | Dice literalmente qué habilita, sin exigir conocer el vocabulario del dominio. |
| Relación `actividades` → `empresas` | FK por clave natural sobre `codigo` | Precedente vigente `usuarios.rol → roles.key`. El código sigue leyendo `a.empresa` como string, así que los 6 call sites de color no cambian de forma. |
| `solicitado_por` | FK a `usuarios` | Las 5 opciones-marca del dropdown nunca se usaron: el dato real es "una persona pidió esto". |
| Acceso al color desde el front | Mapa derivado en `AppContext` | Un solo lugar deriva, O(1) en render. Kanban y Gantt pintan decenas de celdas. |

## Capa de datos

Una migración, `empresas_marca_atribuible.sql`:

```sql
-- 1. Qué empresas reciben actividades (las otras son solo de pertenencia)
ALTER TABLE empresas ADD COLUMN recibe_actividades boolean NOT NULL DEFAULT false;
UPDATE empresas SET recibe_actividades = true
 WHERE codigo IN ('EMC','SVN','ERG','VNF','PREMIER','ORNELLA','MENTOR');

-- 2. Integridad por clave natural (precedente: usuarios.rol → roles.key)
ALTER TABLE actividades
  ADD CONSTRAINT actividades_empresa_fkey
  FOREIGN KEY (empresa) REFERENCES empresas(codigo) ON UPDATE CASCADE;
ALTER TABLE actividades DROP COLUMN empresa_id;

-- 3. Solicitante: texto libre → persona real (la FK ya existía, vacía)
UPDATE actividades SET solicitante_id = (SELECT id FROM usuarios WHERE nombre = 'Freddy')
 WHERE solicitado_por = 'Coord_MFreddy';
ALTER TABLE actividades DROP COLUMN solicitado_por;
```

El backfill de `recibe_actividades` marca exactamente las 7 que hoy muestra
`MARCAS_LIST`. Nadie ve un cambio de comportamiento el día del deploy; lo que cambia es
que a partir de ahí se administra.

`ON UPDATE CASCADE` hace que renombrar un código desde el admin propague a las
actividades. El borrado queda en `RESTRICT` (default): una empresa con actividades no se
puede borrar, que es el comportamiento deseado.

## Admin

`ORG_CATALOGS` es config-driven, así que el grueso es declarativo:

1. Un campo más en `empresas.fields`:
   `{ name: 'recibe_actividades', type: 'checkbox', labelKey: 'admin.org.recibeActividades' }`
2. **`type: 'checkbox'` no existe todavía** en el form genérico (hoy:
   `text | number | color | icon | select`). Hay que agregarlo al renderer del modal. Es
   el único componente nuevo del trabajo.
3. `blockedBy` gana `matchOn?: 'id' | 'codigo'` con default `'id'`, y la entrada de
   actividades pasa a `{ table: 'actividades', column: 'empresa', matchOn: 'codigo' }`.

El punto 3 no es opcional: `app/api/admin/org/[cat]/[id]/route.ts:33` hace
`.eq(column, params.id)`, comparando contra el uuid. Con `actividades.empresa` guardando
el código, ese chequeo contaría 0 y dejaría intentar un borrado que después reventaría
con el error crudo de Postgres en lugar del mensaje "está en uso por N registros".

Efecto secundario deseable: con la FK real, Postgres bloquea el borrado aunque el chequeo
de la app falle. `blockedBy` pasa a ser el mensaje legible, no la única defensa.

También hay que agregar `recibe_actividades` al tipo `OrgRow` y las claves i18n
(`es.json` y `en.json`) — sin `i18n-ignore`.

## Contexto

`AppContext` expone dos derivados:

```ts
const marcas = useMemo(() =>
  empresas.filter(e => e.activo && e.recibe_actividades), [empresas])

const colorMarca = useMemo(() =>
  Object.fromEntries(empresas.map(e => [e.codigo, e.color])), [empresas])
```

**`marcas` filtra; `colorMarca` no, y es a propósito.** Si una empresa se desmarca como
atribuible, las actividades históricas que la referencian tienen que seguir pintándose
con su color: solo deja de ofrecerse para actividades nuevas. Un `colorMarca` filtrado
volvería violeta genérico esas tarjetas de un día para el otro.

Son dos memos separados por la misma razón. No unificarlos.

## Call sites

Doce, en diez archivos — cuatro de `MARCAS_LIST`, dos de `SOLICITANTES` y seis de
`getColorMarca`. `NewActivityModal` y `ActivityDetailModal` aparecen dos veces cada uno
porque usan dos constantes distintas:

| Archivo | Línea | Hoy | Queda |
|---|---|---|---|
| `shared/components/TopbarBrands.tsx` | 9 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/hooks/useStratixData.ts` | 57 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/social/SocialTab.tsx` | 20 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/modals/NewActivityModal.tsx` | 32 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/modals/NewActivityModal.tsx` | 45 | `SOLICITANTES` | `usuarios` |
| `features/stratix-mkt/components/modals/ActivityDetailModal.tsx` | 14 | `SOLICITANTES` | lookup en `usuarios` |
| `features/stratix-mkt/components/modals/ActivityDetailModal.tsx` | 29 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx` | 9 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/gantt/GanttBar.tsx` | 19 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx` | 16 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/solicitudes/MemberAvailabilityCard.tsx` | 63 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/social/AccountRow.tsx` | 11 | `getColorMarca` | `colorMarca[…]` |

Los diez archivos ya llaman `useApp()`, así que ninguno necesita cablear el contexto.

El selector de solicitante se puebla de `usuarios` y guarda `solicitante_id`. Para
mostrar el nombre se hace **lookup en memoria** contra `usuarios` del contexto, no un
embed de PostgREST: `actividades` tiene tres FKs a `usuarios` (`responsable_id`,
`solicitante_id`, `aprobado_por_id`), así que un embed sería ambiguo y devolvería
`PGRST201` en runtime. La query de actividades no se toca.

Se borran de `shared/constants/domain.ts`: `MARCAS_LIST`, `SOLICITANTES`,
`getColorMarca`, y sus re-exports en `AppContext`. `MESES`, `TRIMESTRES`,
`ESTADO_COLORS`, `COLUMNAS_KANBAN` y `COLORES_AVATAR` se quedan: son constantes de
verdad, no catálogos administrables.

## Errores y bordes

| Caso | Comportamiento |
|---|---|
| Código sin entrada en `colorMarca` | Fallback `'#7C6FF7'`, el mismo default de hoy |
| `solicitante_id` en NULL (usuario borrado, `ON DELETE SET NULL`) | `'—'`, el fallback que `ActivityDetailModal` ya tiene |
| Empresa con actividades, intento de borrado | FK lo bloquea; el admin ve "está en uso por N registros" |
| Empresa desmarcada como atribuible | Sigue pintando el color en actividades viejas; no aparece en el selector de nuevas |
| `AccountRow`: `acc.brand` no matchea ningún `codigo` | Fallback de color. Es el comportamiento actual: `social_accounts.brand` es texto libre y no se toca en este trabajo |

## Testing

Hay `vitest` configurado (`pnpm test`). Los tests que importan son los de la derivación
en el contexto:

- `marcas` excluye una empresa con `activo = false`
- `marcas` excluye una empresa con `recibe_actividades = false`
- `colorMarca` **sí** incluye una empresa con `recibe_actividades = false`

El tercero es el que importa: es la regresión que este diseño introduce si alguien
unifica los dos memos en uno.

Verificación manual, con Supabase local levantado: crear una empresa desde Admin →
Organización con el checkbox tildado, y confirmar que aparece en el selector de nueva
actividad de Stratix sin recargar la sesión.

## Fuera de scope

- **`responsable_ref` / `responsable_id`**: mismo patrón de texto + FK vacía, pero el
  selector de responsable ya lee de `usuarios` y funciona. No es dato hardcodeado y
  arreglarlo no sirve a este objetivo.
- **`slots_calendario` y `solicitudes`**: su única referencia a empresa es `empresa_id`
  (uuid), están en 0 filas y no tienen funcionalidad. Migrarlas ahora es trabajo sobre
  tablas que nadie usa. Cuando se implementen, se alinean con la convención de `codigo`.
  Sus entradas en `blockedBy` siguen usando `matchOn: 'id'`, que para ellas es correcto.
- **`social_accounts.brand`**: texto libre sin FK. Otro trabajo.

## Riesgos

**El `DROP COLUMN` es irreversible.** `empresa_id` y `solicitado_por` se van en la misma
migración que crea la FK. Dev y prod tienen datos distintos de local: antes de
`db push` a cada uno hay que verificar que no haya códigos en `actividades.empresa` que
falten en `empresas.codigo`, o la creación de la FK falla a mitad de la migración.

```sql
-- correr en cada entorno ANTES del push
SELECT DISTINCT a.empresa FROM actividades a
 LEFT JOIN empresas e ON e.codigo = a.empresa
 WHERE e.codigo IS NULL;
```

Si devuelve filas, hay que crear esas empresas o corregir los códigos antes de migrar.

**El backfill de `solicitante_id` asume que existe un usuario llamado `Freddy`.** En
local existe. En dev y prod hay que confirmarlo, o las 18 filas quedan con
`solicitante_id` en NULL y el detalle de actividad muestra `'—'`.
