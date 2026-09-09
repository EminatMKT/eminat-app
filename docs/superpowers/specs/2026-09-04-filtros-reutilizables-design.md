# Filtros reutilizables y vistas guardadas — Diseño

**Fecha:** 2026-09-04
**Estado:** propuesto
**Plan:** `docs/superpowers/plans/2026-09-04-filtros-reutilizables.md`

## El problema

Filtrar existe tres veces en el repo, con tres formas distintas:

| Dónde | Qué es |
|---|---|
| `shared/utils/filters` + `shared/components/ui/FilterBar` | El motor declarativo. Lo usan `/tasks` (6 defs) y Research (`LEAD_FILTERS`) |
| `features/cobranzas/components/FilterBar.tsx` | Un `<div>` flex de 4 líneas; los `<select>` están escritos a mano en cada tab |
| `features/admin/components/RoleFilterBar.tsx` | Chips de rol + búsqueda, sin relación con el motor |

Y Medical, Reuniones, Directorio y Accounting filtran con `useState` sueltos.

El motor **ya es compartido y ya es data-driven**: agregar un filtro es agregar un objeto al array.
Lo que impide reusarlo no es el motor. Son dos cosas concretas:

1. **`FilterBar` recibe su look por props.** `selectStyle`, `clearStyle` y `mutedColor` son
   `CSSProperties` que el módulo consumidor tiene que proveer. Montarla en Medical significa
   importar el tema de los tableros o inventar uno. Además está escrita con `style` inline en
   cada nodo, que la regla del centinela ya prohíbe: es deuda declarada, no una preferencia.

2. **Una combinación de filtros no se puede nombrar ni guardar.** Hoy vive en localStorage como
   un blob anónimo por usuario (`useUserPreference('stratix-act-filters')`). No tiene nombre, no
   hay dos, y muere cuando se limpia la caché o se entra desde otra máquina.

## Lo que se pide

Filtrar como en Notion: **elegir qué columnas filtrar** y **guardar combinaciones con nombre para
saltar entre ellas**, con el mismo motor en todo el proyecto.

Explícitamente fuera de alcance por ahora, dicho por quien lo pidió: agrupar
(«me conformo con poder filtrar por ahora»).

## Las decisiones

### 1. Las vistas guardadas van a una tabla, no a localStorage

Es la decisión que motiva este documento y se toma en contra del camino barato.

`useUserPreference` es **localStorage namespaceado por id de usuario**
(`src/shared/hooks/useUserPreference.ts`). Sirve perfectamente para lo que hace hoy: recordar qué
filtro tenés puesto, qué pestaña estabas mirando, qué panel dejaste recogido. Eso es estado de UI
efímero — se pierde y no pasa nada.

Una vista guardada no es eso. **Es un artefacto que la persona creó y nombró.** Perderlo al
limpiar la caché, o no encontrarlo al entrar desde otra computadora, no es una molestia: es un
bug. Y una vista es además lo único de esta tanda que algún día se va a querer compartir con el
equipo — algo que localStorage no puede hacer ni con el mejor diseño encima.

**El corte, entonces:**

| Qué | Dónde | Por qué |
|---|---|---|
| Los valores que tenés puestos AHORA | localStorage (`useUserPreference`) | Cambia con cada tecla. Escribir a la base por cada `<select>` es un round-trip por interacción |
| Qué filtros tenés ocultos AHORA | localStorage | Ídem |
| Las vistas con nombre | tabla `vistas_filtro` | Las creaste vos, tienen nombre, y tienen que seguirte |

**La tabla NO es el estado vivo.** Se toca sólo al guardar, al cargar y al borrar una vista.

```sql
CREATE TABLE public.vistas_filtro (
  id                uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  usuario_id        uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  ambito            text NOT NULL,                       -- qué tabla filtra: 'tasks', 'research', …
  nombre            text NOT NULL,
  valores           jsonb NOT NULL DEFAULT '{}'::jsonb,  -- un FilterValues
  ocultos           text[] NOT NULL DEFAULT '{}',        -- las claves de def que se esconden
  abre_por_defecto  boolean NOT NULL DEFAULT false,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  CONSTRAINT vista_nombre_unico UNIQUE (usuario_id, ambito, nombre)
);
```

**`ON DELETE CASCADE` y no `SET NULL`,** al revés que todas las FK de `actividades`. Es
deliberado: una actividad sin creador sigue siendo una actividad, pero una vista sin dueño es
basura — nadie la puede ver ni borrar, porque la RLS corta por `usuario_id`.

**Se guarda `ocultos` y no `visibles`.** Es la diferencia entre «lo que escondiste» y «lo que
elegiste ver», y decide qué pasa cuando el código agrega un filtro nuevo: con `visibles`, el
filtro nuevo nace invisible para todo el que tenga una vista vieja y nadie entiende por qué; con
`ocultos`, aparece solo. Guardar la excepción y no la regla es lo que hace que la lista pueda
crecer.

**RLS: cada quien ve y escribe lo suyo, sin gate de módulo.** Una vista no contiene datos del
negocio — sólo claves de filtro y strings que el propio usuario tipeó. Gatearla por módulo
significaría que quien pierde un módulo deja vistas huérfanas que nadie puede limpiar. El
`ambito` ya la vuelve inofensiva fuera de su tabla.

**Compartir una vista con el equipo queda afuera, a propósito.** Es una columna
(`compartida boolean`) y un `OR` en la policy, aditivos los dos. Se agrega el día que alguien lo
pida, no antes.

### 2. `FilterBar` deja de recibir estilos por props

Los dos consumidores le pasan **exactamente los mismos valores**:

- `selectStyle` y `clearStyle` salen los dos de `@/shared/components/dashboard/theme`.
- `mutedColor` es `DASHBOARD_THEME.t3` en uno y `RESEARCH_THEME.t3` en el otro — y
  `features/research/theme.ts` re-exporta `DASHBOARD_THEME`, así que es el mismo `#9CA3AF`.

O sea que los tres props no configuran nada: son ceremonia que cada consumidor nuevo tendría que
repetir. Salen, y el look pasa a un CSS module sobre las variables `--c-*` que ya existen en
`src/app/globals.css`. Eso además paga la deuda de la regla «el atributo `style` está prohibido».

Un solo color no tiene variable: el `#D1D5DB` del borde de los `<select>` (más fuerte que
`--c-border`). Se agrega como `--c-border-strong`.

### 3. `defaultValue` y las vistas conviven; no se pisan

El motor ya acepta un `defaultValue` por def (commit `ba249f4`): es **con qué abre el filtro según
el código** — hoy, el área de quien mira. Una vista marcada `abre_por_defecto` es **con qué abre
según el usuario**. El orden de resolución es una línea:

```
defaults del código  <  la vista que abre por defecto  <  lo que tocaste en esta sesión
```

Elegir una vista del desplegable **escribe sus valores en el estado local**. Por eso la capa de
«vista» sólo interviene en la primera carga: después, lo que hay es lo que tocaste, y eso es lo
que sobrevive a un F5.

«✕ Limpiar» vuelve a la vista activa si hay una, y a los defaults del código si no. Nunca a
vacío: si volviera a vacío, «limpiar» y «recargar» dejarían la pantalla en dos estados distintos.

### 4. Una vista se puede actualizar, y la pantalla dice cuándo dejó de serlo

Guardar y borrar no alcanzan para «disponer de ellas fácilmente». Faltan dos cosas, y las dos son
el mismo problema:

- **Actualizar.** Retocás un filtro sobre una vista guardada y la única forma de conservarlo sería
  borrarla y volver a guardarla con el mismo nombre.
- **Saber que la tocaste.** Sin eso, el desplegable sigue diciendo «Mi trimestre» mientras en
  pantalla hay otra cosa — que es peor que no tener la etiqueta, porque miente con confianza.

Se resuelven juntas: la vista aplicada se guarda en el estado local (así sobrevive a un F5, cosa
que un `useState` del componente no haría), y se compara contra lo que hay en pantalla con una
función pura. Si difieren, aparece «• modificada» y un botón «Actualizar».

La comparación trata **la clave ausente y la cadena vacía como iguales**: las dos significan «este
filtro no filtra». Sin esa equivalencia, aplicar una vista y no tocar nada la marcaría como
modificada apenas el motor rellene una clave con cadena vacía.

## Aplicabilidad: qué módulo acepta qué

Medido el 04/09/2026 sobre los ocho módulos, y no supuesto: los dos consumidores actuales del
motor —`/tasks` y Research— son casi gemelos (los dos son tableros, los dos usan `Panel`, los dos
sacan su look del mismo tema), así que dar por hecho que la pieza generaliza a partir de ellos
habría sido diseñar contra una muestra de uno.

La distinción que importa es que **la pieza son tres cosas separables**: el motor (`FilterDef` +
`applyFilters`), la barra (`FilterBar`), y el estado con vistas (`useFiltros`). Un módulo puede
tomar el motor sin tomar la barra.

| Módulo | Qué filtra hoy | Motor | Barra | Vistas |
|---|---|---|---|---|
| `/tasks` | 6 defs, ya declarativo | ✅ ya | ✅ ya | ✅ |
| Research | `LEAD_FILTERS`, incluye `kind: 'text'` y dos `'date'` | ✅ ya | ✅ ya | ✅ |
| Cobranzas | Un objeto `Filtros` de 6 claves, a mano, en `useCobranzasData` | ✅ | ✅ | ⚠️ ver abajo |
| Medical | `searchPaciente`, `searchAudit`, `filterEstadoPaciente`, `filterCitaFecha` | ✅ | ✅ | ✅ (4 ámbitos) |
| Reuniones | `busqueda` en el listado | ✅ | ✅ | ✅ |
| Directorio | `useDirectorioFilter`: búsqueda sobre 3 columnas + departamento | ✅ | ⚠️ usa `ListToolbar` | ✅ |
| Admin | `busqueda` + chips de rol, en 3 vistas | ✅ | ❌ chips, no selects | ⚠️ |
| Accounting | Un `useState` de banco en `BankingTab` | ✅ | ⚠️ | ❌ |

**La búsqueda de texto NO es un obstáculo.** `FilterDef` ya soporta `kind: 'text'` y Research ya lo
usa en producción (el filtro `nct`). Un buscador es un def con un `match` que mira varias columnas
— que es exactamente lo que `useDirectorioFilter` ya hace a mano sobre `nombre`, `cargo` y `email`.
Lo que cambia entre un módulo y otro no es el motor: es **dónde se dibuja el control**.

### Los dos hallazgos que el diseño tiene que absorber

**1. Cobranzas rompe «un ámbito = una tabla».** Su `Filtros` es UN estado de seis claves
compartido por TRES tablas, cada una usando un subconjunto:

| Tab | Claves que usa |
|---|---|
| Ventas | `periodo`, `laboratorio`, `estudio` |
| Cuentas | `laboratorio`, `estudio` |
| Depósitos | `periodo`, `banco`, `contratante` |

Y es **deliberado**: filtrar por laboratorio en Ventas se arrastra a Cuentas. `useFiltros(ambito,
defs)` asume un array de defs y una lista de items; acá hay un ámbito con la unión de los defs y
tres subconjuntos. El consumidor ya puede filtrar `visibles` por su cuenta, pero entonces el
contador de «N activos» cuenta filtros que no aplican a la pestaña abierta, y el «+ Filtro»
ofrece los seis en las tres. **Es un ajuste chico y hay que hacerlo antes de adoptar Cobranzas,
no durante.**

**2. `ListToolbar` tiene la misma deuda que `FilterBar` acaba de pagar.** Recibe `inputStyle`
desde `useApp()` y dibuja con `style` inline. Es el encabezado de Admin, Directorio y los
catálogos de organización — o sea que **es el bloqueante de los cuatro módulos administrativos**,
igual que los tres props de estilo lo eran de los dos tableros. Despegarlo es la fase 1 de esa
segunda tanda, y es el mismo trabajo.

### Dónde las vistas guardadas no valen la pena

**Directorio y Accounting leen datos hardcodeados** (`DIRECTORIO_DATA` en el contexto y
`accounting/data.ts`, filas literales en el repo). Guardar una vista contra datos que no vienen de
la base no rompe nada, pero tampoco resuelve nada: se adopta el motor y la barra, y las vistas se
dejan apagadas hasta que esos módulos tengan datos de verdad.

**Admin es el caso a discutir, no a asumir.** Sus filtros son de administración —buscar un usuario
para editarlo— y una «vista guardada» de eso se parece más a un marcador que a un modo de
trabajo. El motor y la barra sí le sirven; las vistas hay que preguntarlas antes de construirlas.

## Lo que este diseño NO hace

- **Operadores por columna** (*contiene / antes de / está vacío*). Hoy el operador vive dentro del
  closure `match` de cada def. Elegirlo exige matar `match` y reemplazarlo por `{ columna, tipo }`
  más una tabla de operadores por tipo — o sea reescribir los ~15 defs que ya existen. No se paga
  mientras «poder filtrar» alcance.
- **Grupos AND/OR anidados.** Notion los tiene y casi nadie los usa. Doce personas no necesitan
  `(A o B) y no C`.
- **Agrupar.** Es otro eje: cambia cómo se dibuja la tabla, no qué filas entran. Va después y
  aparte.
- **Adoptar el motor en los otros siete módulos.** Es un `FilterDef[]` por tabla y un PR chico por
  módulo. Este diseño lo desbloquea (decisión 2) pero no lo ejecuta: son subsistemas
  independientes y cada uno merece su propio plan.
- **Un registro de columnas por tabla.** Es lo que haría que filtro, orden, encabezados, export
  CSV y ficha de detalle salgan de una sola descripción. Es el techo siguiente y el que de verdad
  vale, pero no se puede escribir bien sin haber adoptado el motor en dos o tres módulos primero.
- **Dejar que el usuario elija la forma de cada filtro** (chips o desplegable). Hoy lo decide el
  `kind` del def, que es donde está la información: la forma correcta la manda la cardinalidad
  —cuatro estados se leen mejor como chips, veinticuatro períodos no—, y eso el motor lo sabe y
  quien filtra no. Queda **fuera de alcance**; el día que entre, entra completo. Lo único que
  quedaría decidido de antemano es dónde NO va: en una preferencia por persona. Eso haría que dos
  compañeros vean pantallas distintas sin enterarse, y «el filtro de área está arriba a la
  izquierda» dejaría de ser cierto para los dos.
- **Tests de componente.** El repo no tiene `@testing-library` ni entorno DOM en Vitest (corre en
  node). No se estrena una infraestructura de testing acá: la lógica pura lleva test de Vitest, y
  lo que sólo se ve en pantalla se verifica con Playwright, que ya está.
