# Fase 1 — Stratix 360 contra el catálogo de empresas

**Fecha:** 2026-08-11
**Estado:** aprobado, pendiente de implementar
**Continúa en:** fase 2 (eliminar `responsable_ref`), sin spec todavía

Eliminar `MARCAS_LIST` de `shared/constants/domain.ts` y hacer que Stratix 360 lea las
marcas del catálogo `empresas`, que el admin ya administra desde `/admin` → Organización.

## Problema

Crear una empresa en Admin → Organización no la hace aparecer en el formulario de
actividades de Stratix. Renombrarla o cambiarle el color tampoco se refleja. El módulo
admin quedó terminado pero Stratix sigue leyendo una lista hardcodeada.

Es el resto de una migración a medias: `empresa_rename_eje_unico` creó las columnas FK y
`empresas_catalogo_pertenencia` unificó el catálogo, pero cablear las lecturas del front
quedó pendiente.

## Estado actual (verificado en la DB local, 2026-08-11)

| Hecho | Valor |
|---|---|
| Filas en `empresas` | 11, todas `activo = true` |
| Entradas en `MARCAS_LIST` | 7 |
| Filas en `actividades` | 18 |
| `actividades.empresa` (texto) | 18/18 poblado, 7 códigos distintos |
| `actividades.empresa_id` (uuid) | 0/18 |
| `slots_calendario`, `solicitudes` | 0 filas |

Los 7 códigos usados en `actividades.empresa` existen exactos en `empresas.codigo`, así
que el backfill no necesita mapeo de alias.

Las 4 empresas que están en el catálogo pero no en `MARCAS_LIST` — `EMINAT`, `STRATIX`,
`ONDARA`, `DACOACH` — entraron por la migración de pertenencia. Responden a *dónde
trabaja una persona*, no a *a qué marca se atribuye una actividad*. La migración lo
declara: una sola lista, dos relaciones distintas.

## Decisiones

| Decisión | Elegido | Por qué |
|---|---|---|
| Distinguir marcas de empresas de pertenencia | Columna `recibe_actividades` | Deja la semántica explícita en datos y administrable. Reusar `activo` la habría sobrecargado y habría sacado esas 4 del selector de pertenencia de usuarios. |
| Nombre de la columna | `recibe_actividades` | Dice literalmente qué habilita, sin exigir conocer el vocabulario del dominio. |
| Relación `actividades` → `empresas` | FK por clave natural sobre `codigo` | Ver abajo. El código sigue leyendo `a.empresa` como string, así que los call sites de color no cambian de forma. |
| Acceso al color desde el front | Mapa derivado en `AppContext` | Un solo lugar deriva, O(1) en render. Kanban y Gantt pintan decenas de celdas. |

### Semántica de `activo` × `recibe_actividades`

Los dos flags no son independientes. **`activo` es el interruptor maestro**: significa "esta
empresa existe en el grupo" y gobierna las dos relaciones (pertenencia y atribución).
`recibe_actividades` es un permiso adicional que solo tiene efecto si la empresa está
activa.

| `activo` | `recibe_actividades` | Significado | Selector de actividad | Selector de pertenencia |
|---|---|---|---|---|
| ✅ | ✅ | Marca viva del grupo | aparece | aparece |
| ✅ | ❌ | Empresa donde trabaja gente, sin marketing propio | no aparece | aparece |
| ❌ | ✅ | *inalcanzable por construcción* | — | — |
| ❌ | ❌ | Empresa que ya no opera | no aparece | no aparece |

La tercera fila se vuelve inalcanzable porque el form deshabilita `recibe_actividades`
cuando `activo` está apagado. Aun así el front nunca asume esa invariante: filtra por
`activo && recibe_actividades`, no solo por el segundo.

**Desactivar una empresa NO toca las actividades existentes.** Es la regla que gobierna
todo lo demás:

- Las actividades de una empresa desactivada **se siguen viendo** en Kanban, Gantt,
  reportes y gráficas, **con el color de su empresa**. Por eso `colorMarca` no filtra.
- No se pueden crear actividades nuevas para esa empresa.
- No se puede borrar la empresa mientras tenga actividades: la FK lo impide, con o sin
  `activo`. Desactivar es la salida suave; borrar sigue bloqueado.
- Los totales históricos por marca no cambian. El histórico es registro, no se reescribe
  cuando cambia la configuración.

Una consecuencia a tener presente si más adelante se agrega **edición de la empresa de una
actividad ya creada**: ese `<select>` tendría que incluir el valor actual aunque su
empresa esté desactivada o no sea atribuible, o al guardar pisaría la empresa con la
primera opción de la lista. Hoy no aplica — `ActivityDetailModal:29` solo la muestra en un
`<span>`, no la edita.

### Por qué `codigo` sí sirve como clave natural

El proyecto tiene un antecedente de clave natural que salió mal — `responsable_ref` — así
que la elección necesita justificarse en vez de asumirse. `empresas.codigo` es sano y
`responsable_ref` no, por tres razones:

| | `empresas.codigo` | `usuarios.responsable_ref` |
|---|---|---|
| `UNIQUE` | sí | no |
| Completo | `NOT NULL` | 3 de 10 personas no tienen |
| ¿Codifica otros datos? | no, `EMC` es solo un código | sí: cargo + nombre, ambos ya en tablas |

La tercera fila es la que importa. Un identificador que contiene el nombre de la persona
deja de ser estable justo cuando el nombre cambia — que es lo único que un identificador
debería sobrevivir. `DG_Ariana` dice "Ariana" porque ella se llama Arianna y el string
nunca se actualizó. `EMC` no tiene ese problema: no deriva de nada, se muestra tal cual
como chip en la UI, y es el dato.

**El criterio, entonces, no es "natural vs surrogate" como dice hoy el `CLAUDE.md`, sino
si la clave natural es sana: legible, `UNIQUE`, `NOT NULL`, y sin codificar datos que ya
existen por separado.** Vale afinar esa convención cuando se toque el doc.

## Capa de datos

Una migración, `empresas_marca_atribuible.sql`:

```sql
-- 1. Qué empresas reciben actividades (las otras son solo de pertenencia)
ALTER TABLE empresas ADD COLUMN recibe_actividades boolean NOT NULL DEFAULT false;
UPDATE empresas SET recibe_actividades = true
 WHERE codigo IN ('EMC','SVN','ERG','VNF','PREMIER','ORNELLA','MENTOR');

-- 2. Integridad por clave natural
ALTER TABLE actividades
  ADD CONSTRAINT actividades_empresa_fkey
  FOREIGN KEY (empresa) REFERENCES empresas(codigo) ON UPDATE CASCADE;
ALTER TABLE actividades DROP COLUMN empresa_id;
```

El backfill marca exactamente las 7 que hoy muestra `MARCAS_LIST`. Nadie ve un cambio de
comportamiento el día del deploy; lo que cambia es que a partir de ahí se administra.

`ON UPDATE CASCADE` hace que renombrar un código desde el admin propague a las
actividades. El borrado queda en `RESTRICT` (default): una empresa con actividades no se
puede borrar.

## Admin

`ORG_CATALOGS` es config-driven, así que el grueso es declarativo:

1. Dos campos más en `empresas.fields`:
   `{ name: 'activo', type: 'checkbox', labelKey: 'admin.org.activo' }` y
   `{ name: 'recibe_actividades', type: 'checkbox', labelKey: 'admin.org.recibeActividades' }`.
   `recibe_actividades` se deshabilita cuando `activo` está apagado, para que el estado
   contradictorio de la matriz no se pueda armar desde la UI.
2. **`type: 'checkbox'` no existe todavía** en el form genérico (hoy:
   `text | number | color | icon | select`). Hay que agregarlo al renderer del modal. Es
   el único componente nuevo del trabajo, y sirve a los dos campos.

   `activo` se expone acá porque sin eso el filtro del front sería especulativo: la
   columna existe con default `true` y hoy **no hay forma de cambiarla** salvo por SQL.
3. `blockedBy` gana `matchOn?: 'id' | 'codigo'` con default `'id'`, y la entrada de
   actividades pasa a `{ table: 'actividades', column: 'empresa', matchOn: 'codigo' }`.

El punto 3 no es opcional: `app/api/admin/org/[cat]/[id]/route.ts:33` hace
`.eq(column, params.id)`, comparando contra el uuid. Con `actividades.empresa` guardando
el código, ese chequeo contaría 0 y dejaría intentar un borrado que después reventaría
con el error crudo de Postgres en lugar del mensaje "está en uso por N registros".

Efecto secundario deseable: con la FK real, Postgres bloquea el borrado aunque el chequeo
de la app falle. `blockedBy` pasa a ser el mensaje legible, no la única defensa.

También hay que agregar `recibe_actividades` al tipo `OrgRow` y las claves i18n (`es.json`
y `en.json`) — sin `i18n-ignore`.

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

Son dos memos separados por esa razón. No unificarlos.

## Call sites

Diez, en nueve archivos — cuatro de `MARCAS_LIST` y seis de `getColorMarca`:

| Archivo | Línea | Hoy | Queda |
|---|---|---|---|
| `shared/components/TopbarBrands.tsx` | 9 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/hooks/useStratixData.ts` | 57 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/social/SocialTab.tsx` | 20 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/modals/NewActivityModal.tsx` | 32 | `MARCAS_LIST` | `marcas` |
| `features/stratix-mkt/components/modals/ActivityDetailModal.tsx` | 29 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/kanban/KanbanTaskCard.tsx` | 9 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/gantt/GanttBar.tsx` | 19 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/solicitudes/TaskTableRow.tsx` | 16 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/solicitudes/MemberAvailabilityCard.tsx` | 63 | `getColorMarca` | `colorMarca[…]` |
| `features/stratix-mkt/components/social/AccountRow.tsx` | 11 | `getColorMarca` | `colorMarca[…]` |

Los nueve archivos ya llaman `useApp()`, así que ninguno necesita cablear el contexto.

Se borran de `shared/constants/domain.ts`: `MARCAS_LIST` y `getColorMarca`, y sus
re-exports en `AppContext`. `MESES`, `TRIMESTRES`, `ESTADO_COLORS`, `COLUMNAS_KANBAN` y
`COLORES_AVATAR` se quedan: son constantes de verdad, no catálogos administrables.
`SOLICITANTES` **también se queda por ahora** — se elimina en la fase 2, porque sus
valores son refs y su destino depende de esa decisión.

## Errores y bordes

| Caso | Comportamiento |
|---|---|
| Código sin entrada en `colorMarca` | Fallback `'#7C6FF7'`, el mismo default de hoy |
| Empresa con actividades, intento de borrado | La FK lo bloquea; el admin ve "está en uso por N registros" |
| Empresa desmarcada como atribuible | Sigue pintando el color en actividades viejas; no aparece en el selector de nuevas |
| Empresa **desactivada** con actividades | Idéntico: las actividades se ven con su color y cuentan en los totales. Solo se cierra la creación de nuevas |
| Empresa desactivada con personas asignadas | El borrado sigue bloqueado por `usuarios.empresa_id`. Desactivar no desasigna a nadie |
| `AccountRow`: `acc.brand` no matchea ningún `codigo` | Fallback de color. Es el comportamiento actual: `social_accounts.brand` es texto libre y no se toca acá |

## Testing

Hay `vitest` configurado (`pnpm test`). Los tests que importan son los de la derivación:

- `marcas` excluye una empresa con `activo = false`
- `marcas` excluye una empresa con `recibe_actividades = false`
- `marcas` excluye una empresa con `activo = false` **aunque** `recibe_actividades = true`
  (la fila contradictoria de la matriz: el front no confía en que la UI la impida)
- `colorMarca` **sí** incluye una empresa desactivada y una no atribuible

El último es el que importa: es la regresión que este diseño introduce si alguien unifica
los dos memos en uno, y la que rompería el histórico.

Verificación manual, con Supabase local levantado:

1. Crear una empresa desde Admin → Organización con ambos checkboxes tildados, y
   confirmar que aparece en el selector de nueva actividad de Stratix.
2. Desactivar una empresa **que tenga actividades** (por ejemplo `EMC`) y confirmar que
   sus tarjetas siguen en el Kanban con su color y siguen contando en la gráfica por
   marca, pero que ya no se ofrece al crear una actividad nueva.

## Fuera de scope

### Fase 2 — eliminar `responsable_ref` (spec propio, pendiente)

`actividades` arrastra tres pares de columna-texto en uso + FK uuid vacía:
`empresa`/`empresa_id` (que resuelve esta fase), `solicitado_por`/`solicitante_id`, y
`responsable_ref`/`responsable_id`. Los dos últimos se resuelven juntos porque
`solicitado_por` guarda un ref: su único valor en las 18 filas es `Coord_MFreddy`, que es
el `responsable_ref` de Freddy.

El diagnóstico de por qué el ref tiene que desaparecer, para no rehacerlo:

- Viene de `remote_schema.sql`, el dump del esquema original. No fue una decisión de
  diseño, es herencia.
- No lo consume ningún sistema externo: no hay código de Google Sheets y `sheet_row` está
  en 0 filas.
- Codifica cargo + nombre, datos que ya viven por separado en `usuario_cargos`/`cargos` y
  `usuarios.nombre`.
- Se desincroniza: `DG_Ariana` quedó con el nombre viejo de Arianna.
- No es `UNIQUE` ni `NOT NULL`: 3 de 10 personas no tienen ref, y por eso **no pueden ser
  responsables de una actividad ni heredar tareas** cuando se borra a alguien.

El trabajo: `responsable_ref` y `solicitado_por` pasan a las FK uuid que ya existen, la UI
compone la etiqueta con nombre + cargo, y `SOLICITANTES` se borra. Son ~25 call sites,
incluidos los filtros y agrupaciones de `useStratixData` (con un caso especial para
`Coord_MFreddy` que mezcla responsable con solicitante), el mapa `miembrosRef`, el flujo
de reasignación al borrar usuarios (`reassign-and-delete` transfiere por `newRef` y
`DeleteUserModal` deshabilita herederos sin ref), y dos archivos de test.

Descartada la alternativa de sanar el ref con `UNIQUE` + `NOT NULL`: le daría integridad
a un artefacto que no debería existir, y obligaría a inventar tres refs nuevos — generar
deuda para poder declararla consistente.

### Otros

- **`slots_calendario` y `solicitudes`**: su única referencia a empresa es `empresa_id`
  (uuid), están en 0 filas y no tienen funcionalidad. Migrarlas ahora es trabajo sobre
  tablas que nadie usa. Sus entradas en `blockedBy` siguen con `matchOn: 'id'`, que para
  ellas es correcto.
- **`social_accounts.brand`**: texto libre sin FK. Otro trabajo.
- **`activo` en los otros cinco catálogos**: `departamentos`, `equipos`, `cargos`,
  `jornadas` y `vinculaciones` también tienen la columna, y ninguno la expone — igual que
  empresas hasta esta fase. Agregarlas es una línea por catálogo ahora que el renderer
  soporta `checkbox`, pero desactivar un cargo o un departamento tiene implicancias
  propias (qué pasa con las personas que lo tienen asignado) que no se analizaron acá.
- **Limpieza de refs sucios** (`CM_ Naomi` con espacio, `Jonathan_CRM` invertido,
  `DG_Ariana` con el nombre viejo): sin sentido si el ref se elimina en la fase 2.

## Riesgos

**El `DROP COLUMN` es irreversible.** `empresa_id` se va en la misma migración que crea la
FK. Dev y prod tienen datos distintos de local: antes de `db push` a cada uno hay que
verificar que no haya códigos en `actividades.empresa` que falten en `empresas.codigo`, o
la creación de la FK falla a mitad de la migración.

```sql
-- correr en cada entorno ANTES del push
SELECT DISTINCT a.empresa FROM actividades a
 LEFT JOIN empresas e ON e.codigo = a.empresa
 WHERE e.codigo IS NULL;
```

Si devuelve filas, hay que crear esas empresas o corregir los códigos antes de migrar.

**El backfill de `recibe_actividades` es por lista fija de códigos.** Si dev o prod tienen
marcas en uso que no estén en esos 7, quedan sin marcar y desaparecen del selector. La
misma consulta de arriba las revela.
