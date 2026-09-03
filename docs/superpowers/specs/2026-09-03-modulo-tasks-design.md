# El módulo `/tasks` — las tareas dejan de ser de marketing

Estado: diseño aprobado, con una decisión abierta anotada al final.
Fecha: 2026-09-03. Actualizado el mismo día: cerrada la decisión sobre el alcance del reporte
de pago (ver «Quién es asignable y quién es liquidable»).

## El problema

Hoy las tareas de la empresa son de un solo departamento por accidente de dónde se
construyeron. `actividades` vive dentro de Stratix 360, su RLS se gatea con
`has_module('stratix-mkt')` y el sidebar la muestra bajo el rail de Marketing. Medical,
Cobranzas, Research y TH/HR no tienen dónde llevar sus pendientes.

Eso ya produjo un duplicado. `reunion_pendientes` nació porque un acta necesitaba una lista de
pendientes y `actividades` no estaba disponible para nadie fuera de marketing: son seis columnas
que se superponen. La regla del centinela que congela esa tabla lo dice sin rodeos —

> si algún día pide `prioridad`, colaboradores, adjuntos, comentarios o un Kanban propio, eso no
> es una columna nueva: es la señal de que dejó de ser una lista dentro de un acta y se volvió un
> gestor de tareas — y dos gestores de tareas no se sostienen.

Sin un lugar común, el tercero es cuestión de tiempo: el día que Medical pida un tablero, sale
`medical_tareas`.

## Lo que hay hoy, medido

**Stratix 360 tiene siete secciones** (`appShellConfig/subvistas.ts`, `SUB_ITEMS.mkt`). Cuatro
son de tareas y tres no:

| Sección | Tab | Lee `actividades` |
|---|---|---|
| Dashboard | `overview` | sí — KPIs y gráficas |
| Production | `kanban` | sí — el tablero, + Gantt y horas |
| Requests | `solicitudes` | sí — la tabla |
| Report | `reporte` | sí — el reporte de pago |
| Social Media | `social` | no |
| Competitors | `competencia` | no |
| Team | `equipo` | **sí** — cuenta tareas en proceso por persona |

**Las personas de una tarea, y cuánto se usan** (local, 266 filas):

| Columna | Obligatoria | Uso real |
|---|---|---|
| `responsable_id` | sí | 266 de 266 |
| `solicitante_id` | no | 6 de 266 |
| `aprobado_por_id` | no | 0 de 266 |
| *quién la creó* | — | **no existe** |

**La jerarquía de área existe y está vacía.** `departamentos ← equipos ← usuarios`, con
`departamentos` en una sola fila (`MKT · Marketing`) y **1 de 7 usuarios con `equipo_id`**. Es
administrable desde `/admin` → Organización: no hay que inventar el catálogo, hay que poblarlo.

**El motor de filtros existe.** `shared/utils/filters.ts` declara `FilterDef<T>` y de un array
salen la UI (`FilterBar`), el predicado (`applyFilters`) y el clear. Lo usan research y
stratix-mkt; los otros siete módulos filtran a mano.

**El log de auditoría existe y le falta la mitad.** `historial` guarda `tabla`, `registro_id`,
`accion`, `campo`, `valor_anterior`, `valor_nuevo`, `usuario_id`. Registra las 266 altas de
`actividades`… **con `usuario_id` en NULL en las 282 filas**. Sabe que algo pasó y no sabe quién
lo hizo.

## El diseño

### Qué se muda y qué se queda

`/tasks` es un módulo nuevo que se lleva las cuatro secciones de tareas. Stratix 360 **se queda
como módulo** con las tres restantes.

```
/tasks         Dashboard · Production · Requests · Report
/stratix-mkt   Social Media · Competitors · Team
```

Disolver Stratix —Team al Directorio, Social y Competitors a otro lado— es una opción viva pero
explícitamente fuera de esta tanda.

### Quién es asignable y quién es liquidable: el módulo `tasks`, las dos

Se le puede asignar una tarea a quien tenga el módulo **`tasks`**, y el reporte de pago puede
liquidar a esa misma gente. Un solo gate para las dos preguntas.

Hoy ese gate existe pero apunta al módulo viejo, y está en una línea que no está en el reporte:

```ts
// src/shared/context/team-derivations.ts:38 — deriveMiembrosAsignables
.filter((u) => getModulesForRole(roleModuleMap, normalizeRole(u.rol)).includes(MODULE.STRATIX_MKT))
```

De ahí sale `miembrosAsignables`, y de ahí salen las dos listas:

| | camino |
|---|---|
| a quién se le asigna | `miembrosAsignables` → el `<select>` de responsable |
| a quién se le liquida | `miembrosAsignables` → `useTablero.idsTeam` → `useReporte` → el `<select>` del reporte |

Cambiar `MODULE.STRATIX_MKT` por `MODULE.TASKS` es todo lo que hace falta, y es lo que hace que
el Report se pueda mudar sin ninguna condición: **dónde vive la pestaña nunca fue lo que
controlaba a quién se paga.** El provider es uno solo y lo montan los dos módulos, así que dejar
el Report en Stratix no lo habría protegido de nada — habría seguido comiendo del mismo array.

La consecuencia hay que decirla en voz alta porque es la política, no un efecto lateral: **darle
el módulo `tasks` a un rol lo vuelve asignable y liquidable a la vez.** Quien no deba aparecer en
una hoja de pago no lleva el módulo. Es un gate explícito y de un solo lugar, en vez de dos que
se desincronizan.

Los seis consumidores de `miembrosAsignables` son todos de tareas y todos se mudan a `/tasks`; la
sección Team que se queda en Stratix usa `equipoMarketing` —filtrado por el departamento MKT— y
no se entera del cambio.

### Una sola columna nueva: `actividades.created_by_id`

FK a `usuarios`, **nullable**, sin default.

Hoy no hace falta preguntarse quién creó una tarea porque todos son de marketing y el responsable
alcanza. Con cinco áreas cargando en el mismo tablero, «quién metió esto» pasa a ser una pregunta
real, y hoy la app no la puede contestar: `solicitante_id` se usa 6 veces de 266 y significa otra
cosa —quién *pidió* el trabajo, no quién *cargó* la fila—.

**Nullable para siempre, y a propósito.** No hay de dónde backfillear: `historial` registra las
altas pero con `usuario_id` vacío, así que las 370 filas de producción quedan sin creador. Poner
el responsable ahí sería inventar un dato. Las viejas muestran «—» y las nuevas se llenan solas.

**Por qué no alcanza con arreglar `historial`.** Es la objeción correcta —el log ya registra el
alta, así que arreglarle el `usuario_id` parecería suficiente— y se cae al mirar los permisos:

```
historial → una sola policy:  historial_admin_read  USING is_admin()
```

El log es **admin-only**. Un usuario normal que abra el detalle de una tarea no ve esa fila, así
que el dato quedaría escrito y sería invisible justo para quien lo quiere leer. Abrir `historial`
a todos no es una opción: guarda `valor_anterior` y `valor_nuevo` de cada cambio de cada tabla.

Y ésa es la diferencia exacta con el `departamento_id` que se descartó arriba:

| | dato alternativo | ¿lo lee el mismo usuario? | |
|---|---|---|---|
| `departamento_id` | responsable → equipo → departamento | sí, mismos permisos | redundante |
| `created_by_id` | `historial.usuario_id` | no, admin-only | **no redundante** |

Además, `historial.registro_id` no tiene FK ni unicidad sobre `accion='created'`: estructuralmente
no puede prometer «un creador por actividad». El índice `(tabla, registro_id)` sí existe, así que
el problema nunca fue rendimiento.

**El nombre, que tuvo tres candidatos.** Hay dos convenciones vivas en el repo: `actividades`
nombra a sus personas en español y con sufijo (`responsable_id`, `solicitante_id`,
`aprobado_por_id`), y `reuniones` usa `created_by`, en inglés y sin sufijo.

Se elige **`created_by_id`**, que es la única de las tres que no rompe nada:

| candidato | idioma | regla de FK (`<entidad>_id` para surrogate) |
|---|---|---|
| `creado_por_id` | sigue a `actividades` | cumple |
| `created_by` | sigue a `reuniones` | **la rompe**: apunta a un uuid sin sufijo |
| **`created_by_id`** | sigue a `reuniones` | **cumple** |

`reuniones.created_by` ya se aparta de la regla; esta decisión no repite la desviación y deja la
diferencia entre las dos tablas en un sufijo, no en un idioma. Unificar `reuniones` es un trabajo
aparte y de un solo sentido.

### Por qué NO hay una columna de departamento

Fue la primera propuesta y se cayó al medirla. «El departamento de la tarea» resultó ser «el
departamento del responsable», y eso ya está: `responsable_id` es obligatorio, y de la persona
salen su equipo y su departamento. Guardarlo aparte es codificar un dato que existe por separado,
que es justo lo que prohíbe la regla de nombres de FK.

El filtro de área **deriva** el departamento del responsable al leer. Lo que hoy falta no es una
columna: es que `usuarios.equipo_id` está poblado en 1 de 7 personas, y eso se arregla en
`/admin` → Organización.

El único argumento a favor de guardarla era congelar el área en el momento del trabajo, para que
mover a alguien de departamento no reescriba la historia. Con 7 usuarios, 1 departamento y ningún
reporte que compare áreas en el tiempo, no compra nada todavía — y cuando lo compre, la columna se
agrega con un backfill que sale de esa misma derivación. **Y probablemente no sea una columna:**
la forma correcta de «desde cuándo hasta cuándo esta persona fue de esta área» es una tabla de
rangos, hermana de lo que `historial` ya hace con los cambios de estado. Queda para discutir
aparte.

### Visibilidad: la RLS no corta por departamento

Quien tenga el módulo `tasks` lee todas las tareas de la empresa. El filtro de departamento viene
**precargado al del usuario** y se puede quitar. El filtro es comodidad, no control de acceso.

Tres razones, en orden de peso:

1. **Cortar en la RLS cuesta una función `SECURITY DEFINER` en el camino caliente.** El
   departamento de una persona está a tres saltos (`usuarios → equipos → departamentos`), así que
   cada `SELECT` de la tabla más consultada de la app pagaría ese join.
2. **Ninguna otra tabla de negocio corta así.** La RLS gatea por módulo (`has_module(slug)`) y
   nada más. Que `tasks` sea la excepción se paga cada vez que alguien toca permisos.
3. **El costo de equivocarse es asimétrico.** Abierto → cerrado se arregla agregando una policy.
   Cerrado → abierto significa haber escrito la función, la policy, sus tests y el mapeo
   departamento→módulo para tirarlos.

### El nudo: Team sigue leyendo `actividades`

`RosterCard` cuenta las tareas en proceso de cada persona, y Team se queda en Stratix. O sea que
la extracción **no** deja a Stratix sin dependencia de la tabla.

La policy de lectura de `actividades` pasa a ser:

```sql
using ( has_module('tasks') or has_module('stratix-mkt') )
```

Es la opción honesta y la más barata. Las alternativas —mover el contador a `/tasks`, o exponer
un agregado por persona— resuelven menos y cuestan más; se pueden tomar después sin rehacer nada.

### El filtro universal: qué le falta al motor que ya existe

El pedido de «componente de filtro universal» no es escribir uno: es terminar el que hay. Lo que
`/tasks` necesita y hoy no está:

1. **Valores por defecto.** `FilterDef` no tiene forma de decir «este filtro arranca en tal
   valor». Es lo que hace usable un tablero con cinco áreas juntas, y sin eso la decisión de
   visibilidad de arriba no se sostiene.
2. **Distinguir «vacío» de «sin tocar».** Con defaults, el clear tiene que volver al default, no
   a vacío — si no, quitar un filtro y recargar dan resultados distintos.
3. **Persistir lo elegido.** Ya existe `useUserPreference` para la pestaña abierta; los filtros
   merecen lo mismo.
4. **`FilterBar` recibe estilos por props** (`selectStyle`, `clearStyle`, `mutedColor`) y los
   aplica inline. Funciona, pero obliga a cada módulo a traer su tema a mano — que es
   exactamente por qué los otros siete no lo adoptaron.

Los puntos 1–3 son requisito de `/tasks`. El 4 es la condición para que el motor se pueda adoptar
en el resto, y va después: adoptarlo en los otros módulos **no** entra en esta tanda.

El filtro de área necesita, además, un `FilterDef` cuyo `match` navegue responsable → equipo →
departamento. El motor ya lo soporta: `match` es una función y recibe el item; las dependencias
entran por parámetro, como ya hace `actividadFilters` con `nombrePorId`.

## Fases

**Fase 0 — poblar el catálogo.** Los departamentos reales y los equipos, desde `/admin` →
Organización, y asignarle equipo a cada usuario. Sin esto el filtro de área no tiene qué mostrar.
No es código: es el bloqueante real y va primero. Los datos se cargan por el frontend, no por
seed.

**Fase 1 — la columna.** Migración que agrega `created_by_id` nullable, y el alta de tareas
empieza a escribirlo. Sin backfill, por lo dicho arriba. Es chica y desplegable sola.

**Fase 2 — el módulo.** Los cinco lugares de registro (`slugs.ts`, `MODULE_META`,
`src/app/(app)/tasks/`, `appShellConfig`, i18n) más la fila en `role_modules`. El feature nuevo
monta **tres** secciones —Dashboard, Production, Requests— reusando los componentes donde están;
nada se mueve de carpeta todavía. Report no se monta acá. Al final de esta fase `/tasks` y
Stratix muestran lo mismo, y eso es a propósito: dos puertas a la misma vista es un estado seguro
para verificar.

**Fase 3 — la mudanza.** Los componentes de tareas pasan a `src/features/tasks/` —el Report
entre ellos—, el gate de `deriveMiembrosAsignables` pasa a `MODULE.TASKS`, Stratix pierde sus
cuatro secciones de tareas y la policy de `actividades` queda con las dos condiciones.

**Fase 4 — el filtro.** Defaults, clear-al-default y persistencia en el motor; el filtro de área
precargado en `/tasks`, derivando el departamento del responsable.

Cada fase es un PR y deja la app funcionando.

## Código a tocar

| Qué | Dónde |
|---|---|
| la columna | una migración nueva en `supabase/migrations/` |
| el alta | el modal de nueva tarea y su llamada de inserción |
| el slug | `shared/auth/permissions/modulos/slugs.ts` |
| el catálogo | `shared/auth/permissions/modulos/index.ts` (`MODULE_META`) |
| la ruta | `src/app/(app)/tasks/page.tsx` (thin route) |
| el rail y las sub-vistas | `shared/components/shell/appShellConfig/{nav,subvistas}.ts` |
| las claves | `shared/i18n/locales/{es,en}.json` |
| el feature | `src/features/tasks/` — recibe `overview`, `kanban`, `solicitudes`, `reporte`, `gantt`, `modals`, `TaskTable`, `utils/act-filters`, `hooks/useTablero` |
| lo que queda | `src/features/stratix-mkt/` — `social`, `competencia`, `roster` |
| el motor | `shared/utils/filters.ts`, `shared/components/ui/FilterBar` |
| la policy | migración de la fase 3 |

## Qué va a ver distinto la gente

- Un ícono nuevo en el rail, `Tasks`, para quien tenga el módulo.
- Stratix 360 pasa de siete secciones a tres. Quien tenía guardada la pestaña `kanban` en su
  preferencia `tab-stratix` abre en una sección que ya no existe: hay que degradar al primer tab
  en vez de mostrar una pantalla en blanco.
- En el detalle de una tarea, quién la creó — «—» en las que ya existen.
- En `/tasks`, un filtro de área que arranca en la suya.
- Nadie pierde acceso: quien tenía `stratix-mkt` necesita también `tasks` para seguir viendo el
  tablero, y esa fila en `role_modules` va con la fase 2.
- El reporte de pago, que hoy vive en Stratix, aparece bajo `/tasks`. Quién sale en su
  desplegable no cambia el día de la mudanza —la fila de `role_modules` copia los mismos roles—
  y cambia el día que alguien le dé `tasks` a un departamento nuevo. Eso es lo que hay que
  mirar al asignar el módulo.

## Prueba

- **Puras:** que `applyFilters` con defaults devuelva lo mismo que con esos valores puestos a
  mano; que el clear vuelva al default y no a vacío; que el `match` del filtro de área resuelva
  responsable → equipo → departamento y no reviente con un usuario sin equipo.
- **Migración:** el ensayo con datos de producción cargados en el Postgres local, que es lo que
  pide la regla de ensayo. La columna es aditiva y nullable, así que el riesgo es bajo; igual se
  ensaya.
- **E2E:** entrar a `/tasks` con un rol que lo tenga y ver el tablero; entrar con uno que no y
  caer donde corresponde; que Team en Stratix siga contando bien después del cambio de policy;
  que una tarea creada por la UI guarde su creador.
- **Datos:** las tareas se crean por la UI, no por `INSERT` — cada fila insertada por SQL esconde
  un agujero del formulario.

## Riesgos

**Dar el módulo `tasks` es dar dos cosas.** Quien lo tenga es asignable **y** liquidable: aparece
en el `<select>` de responsable y en el del reporte de pago. Es deliberado y es el diseño, pero
se dice acá porque el día que alguien le dé `tasks` a un departamento nuevo para que cargue sus
pendientes, esa gente va a aparecer en la pantalla del pago sin que nadie lo haya pedido. El
gate está en una sola línea (`team-derivations.ts:38`) y eso es lo que hay que mirar antes de
asignar el módulo, no la pantalla del reporte.

**La fase 0 no es código y por eso se saltea.** Un filtro de área con un solo departamento y seis
usuarios sin equipo se ve roto aunque el código esté bien. Si la fase 0 no está hecha, la 4 no
sirve de nada.

**La preferencia de pestaña guardada.** `tab-stratix` puede apuntar a `kanban`. Sin degradación,
la primera pantalla después del deploy es blanca.

**Dos puertas a la misma vista durante la fase 2.** Es deliberado y es corto, pero si la fase 3 se
demora queda un estado confuso: la misma tarea editable desde dos rutas.

**`role_modules` es la mitad invisible.** Un módulo que existe para la app y no para la RLS
devuelve listas vacías sin error. Ya pasó.

## Decisiones abiertas

1. **¿Stratix 360 sobrevive a largo plazo?** Se queda por ahora. Si más adelante se disuelve, Team
   va al Directorio y con eso desaparece la dependencia que obliga a la policy de dos condiciones.

**Cerrada el 03/09/2026 — a quién liquida el reporte de nómina.** A quien tenga el módulo
`tasks`, el mismo gate que decide a quién se le puede asignar una tarea. La pregunta estaba mal
planteada: era «¿el Report se muda?», y mudarlo o no nunca cambió el alcance —el provider es uno
solo y las dos rutas lo montan—. Lo que decide es `team-derivations.ts:38`. Con eso resuelto el
Report se muda con el resto, sin condición.

## Fuera de alcance

- **Reuniones.** `reunion_pendientes` no se toca ni se migra. Sigue congelada.
- **La historia de a qué área perteneció cada persona.** Es la idea de una tabla de rangos,
  hermana de `historial`. Se discute aparte; nada de este diseño la bloquea.
- **Arreglar `historial.usuario_id`.** El log registra las altas de `actividades` sin decir quién:
  282 filas con el campo vacío. Es un bug real del log de auditoría y no es este trabajo. Arreglarlo
  **no** reemplazaría a `created_by_id` —el log es admin-only, ver arriba—, pero sí haría que la
  auditoría sirva para lo que existe.
- **Renombrar la tabla.** El módulo es `/tasks` y la tabla sigue siendo `actividades`: son 370
  filas, tres FKs apuntando, sus policies y cada query, a cambio de nada funcional. El desfase de
  nombre ya existe y ya está tolerado — la UI dice «tareas» desde antes.
- **Adoptar el motor de filtros en los otros siete módulos.** Es lo que habilita el punto 4 del
  motor, no parte de esta tanda.
- **Permisos granulares dentro de un módulo.** El sistema es rol → módulos y así se queda.
