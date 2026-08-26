# Código

Estas reglas venían de la sección "Convenciones" de `CLAUDE.md`: son órdenes sobre cómo escribir,
no descripciones del proyecto, así que su lugar es este directorio.

## Los tipos no se aflojan para que compile

<!-- check: block
     pattern: :\s*any\b|\bas\s+any\b|<any>
     files: .ts,.tsx
     version: 1
     test: falla :: const x: any = 1
     test: falla :: foo(bar as any)
     test: pasa :: const x: Company = 1
     test: falla existente :: const x: any = 1
-->

<!-- check: contact
     pattern: as\s+unknown\s+as
     files: .ts,.tsx
     version: 1
     test: falla :: const x = dato as unknown as Company
     test: pasa :: const x = dato as Company
-->

`any` está prohibido por ESLint (`no-explicit-any: error`). Cuando un tipo no cierra, la salida es
`Pick`/`Omit`/`Partial` sobre los tipos que ya existen, o `unknown` con un narrowing explícito —
nunca `any`, y nunca un `as` que solo silencia al compilador.

**Motivo:** el ban costó limpiar 183 sitios, y aun así el merge de `development` del 19/08 trajo
`any` nuevo en cinco archivos, escritos en paralelo mientras la limpieza pasaba por otra rama. La
regla se sostiene en cada rama o no se sostiene: reconciliar dos ramas donde una tipó y la otra
no es el conflicto más caro que tuvo este repo.

## Las páginas de `src/app/` son thin routes
<!-- sin check: convención estructural sobre dónde vive la lógica, requiere mirar el proyecto -->

Una página monta el componente de `src/features/<modulo>/` y nada más. La lógica vive en el feature.

## Un `route.ts` solo exporta handlers HTTP
<!-- sin check: restricción sobre el conjunto de exports del archivo, no una línea concreta -->

`export async function GET/POST/PUT/DELETE`. Los helpers van en otro archivo del mismo directorio.

**Motivo:** Next trata cualquier otro export de un `route.ts` como parte del contrato de la ruta.

## Las animaciones salen de `src/shared/motion`

<!-- check: block
     pattern: from\s+['"]framer-motion['"]
     files: .ts,.tsx
     except: /shared/motion
     version: 1
     test: falla :: import { motion } from 'framer-motion'
     test: pasa @src/shared/motion/index.tsx :: import { motion } from 'framer-motion'
-->

Nunca Framer Motion directo en un componente.

**Motivo:** un solo lugar donde ajustar duraciones y curvas, y un solo lugar donde apagarlas si
alguna vez hace falta respetar `prefers-reduced-motion`.

## Los permisos se preguntan, no se deducen
<!-- sin check: requiere leer el significado de la condición, no su forma -->

En componentes: `useApp().modules.includes('<slug>')`. En lógica pura:
`getModulesForRole(map, role).includes('<slug>')` de `src/shared/auth/permissions.ts`.

Nunca comparar contra el nombre de un rol. Los roles son dinámicos —los crea el admin desde
`/admin`— así que un `rol === 'colaborador'` hardcodeado es una condición que el admin puede
volver falsa sin tocar código.

## Supabase en el cliente: el singleton

<!-- check: block
     pattern: createClient\s*\(
     files: .ts,.tsx
     except: /shared/db/,/api/,instrumentation.ts
     version: 1
     test: falla :: const db = createClient(url, key)
     test: pasa :: import { supabase } from '@/shared/db/supabase'
-->

Se importa el cliente de `src/shared/db/supabase.ts`. No se instancia uno nuevo.

**Motivo:** `createClient()` no devuelve una vista de la misma conexión, arma un cliente
entero: su propia sesión, su propio refresco de token y su propio socket de Realtime. Dos
clientes en la misma pestaña compiten por renovar el token —el que pierde se queda con uno
vencido— y duplican cada suscripción, así que los handlers corren dos veces por evento. No
falla al escribirlo: falla al rato, en otra pantalla, y no se parece a su causa.

Vale para el cliente del **browser**. Las rutas API instancian el suyo con `service_role` a
propósito (`src/shared/db/supabaseAdmin.ts`), que es otra cosa y por eso está exceptuado.

## La llave `service_role` sólo se usa dentro de una ruta API

<!-- check: block
     pattern: supabaseAdmin|SUPABASE_SERVICE_ROLE_KEY
     files: .ts,.tsx
     except: /api/,/shared/db/,instrumentation.ts
     version: 1
     test: falla @src/features/x/hooks/useExport.ts :: import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
     test: pasa @src/app/api/admin/x/route.ts :: import { supabaseAdmin } from '@/shared/db/supabaseAdmin'
-->

`supabaseAdmin` saltea toda la RLS: es root de la base, no "otro cliente". Sólo tiene sentido
donde hay un guard que valida quién pide qué — una ruta API abierta con `requireAdmin()` /
`requireModule()`. En un componente del browser, además de no tener guard, **la llave viaja
dentro del bundle y queda pública**.

**Motivo:** `/api/mail/campaigns` fue un CRUD con service_role sin autenticar sobre datos reales.
Y el guard faltante no falla: funciona de más, y lo nota primero alguien de afuera.

## i18n: integrar, no ignorar

<!-- check: block
     pattern: i18n-ignore
     files: .ts,.tsx
     version: 1
     test: falla :: <Text i18n-ignore>Hola</Text>
     test: pasa :: <Text>{t('saludo')}</Text>
-->

Todo componente nuevo usa `useT()`/`t()` con sus claves en `es.json` **y** `en.json`. No se marca
con `i18n-ignore`.

**Motivo:** `i18n-ignore` no es una excepción, es deuda con nombre propio: el texto queda en un
solo idioma y nadie vuelve. Agregar la clave en los dos archivos cuesta dos líneas en el momento
en que se escribe el componente, y cuesta una búsqueda por todo el repo seis meses después.

## Nombres de columnas FK
<!-- sin check: requiere saber si la clave apuntada es natural o surrogate -->

`<entidad>_id` cuando la FK apunta a una **clave surrogate** (uuid), ej. `departamento_id`.
**Nombre natural** (sin `_id`) cuando apunta a una **clave natural sana**, ej. `usuarios.rol` →
`roles.key`, o `actividades.empresa` → `empresas.codigo`. El sufijo `_id` implica surrogate: no
usarlo para claves naturales.

Una clave natural es **sana** si cumple las tres: legible, `UNIQUE` + `NOT NULL`, y **no codifica
datos que ya existen por separado**. Ante una que falle alguna, surrogate.

**Motivo:** la tercera es la que se olvida. `usuarios.responsable_ref` (`DG_Ariana`) parecía una
clave natural, pero metía adentro el cargo y el nombre: se desincronizaba cuando la persona se
renombraba, y encima no era única ni obligatoria. Sacarla costó una fase entera de migración.

## Cada ruta API se gatea sola

<!-- check: block
     requires: export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)
     absent: requireAdmin|requireModule|requireAccess
     files: route.ts
     version: 1
     test: falla @src/app/api/admin/x/route.ts :: export async function POST() { return 1 }
     test: pasa @src/app/api/admin/x/route.ts :: export async function POST() { await requireAdmin() }
     test: pasa @src/app/api/admin/x/route.ts :: const helper = 1
-->

El matcher de `middleware.ts` excluye `/api` **a propósito**: una ruta API tiene que responder 401
en JSON, no redirigir a `/login`. Consecuencia directa: **el middleware no protege ninguna ruta
API**. Cada handler abre con su guard, antes de tocar nada.

- `requireAdmin()` — operaciones de admin.
- `requireModule('<slug>')` — el resto. Delega en `has_module()`, la misma función de Postgres que
  usan las policies de RLS, así que la ruta no puede desincronizarse de lo que la base permite.

Y si una ruta usa `SUPABASE_SERVICE_ROLE_KEY`, el guard no es opcional bajo ninguna
interpretación: service_role saltea la RLS, o sea que ahí no queda ninguna otra red.

**Motivo:** `/api/mail/send` estuvo abierto a internet aceptando `to`, `subject`, `html` y `from`
de cualquiera, contra la cuenta de Resend de la empresa y desde un dominio verificado a nombre de
Eminat. `/api/mail/campaigns` era un CRUD con service_role, sin autenticar, sobre datos reales.
Las dos venían de antes de que existiera `requireAdmin`, y nadie las volvió a mirar: **una ruta
sin guard no falla, funciona de más**, y por eso no se nota.

## Una ruta que nadie llama se borra, no se protege
<!-- sin check: juicio sobre los llamadores en todo el repo, no sobre el archivo -->

Al encontrar código muerto con permisos —una ruta sin llamadores, un handler service_role sin uso—
la respuesta es borrarlo. Protegerlo es conservar la superficie de ataque y además el trabajo de
mantenerla.

**Motivo:** `/api/mail/campaigns` no tenía un solo llamador; Research lee y escribe campañas por
`src/shared/data/research.ts`, bajo RLS. Guardarla "por si acaso" era pagar riesgo por cero uso.

## Las fechas del calendario se calculan en hora local

<!-- check: block
     pattern: toISOString\(\)\s*\.\s*split\(
     files: .ts,.tsx
     except: /shared/utils/dates
     version: 1
     test: falla :: d.toISOString().split('T')[0]
     test: pasa @src/shared/utils/dates/index.ts :: d.toISOString().split('T')[0]
-->

Para una fecha `YYYY-MM-DD` se usa `localDate()` / `localMonth()` de `src/shared/utils/dates`.
**Nunca `toISOString().split('T')[0]`.**

**Motivo:** `toISOString()` convierte a UTC primero. En UTC-4, a partir de las 20:00 devuelve el
día siguiente. Ya rompió dos cosas: la agenda de Medical mostraba las citas de mañana como las de
hoy, y una actividad cargada de noche nacía fechada mañana. Un bug que solo aparece después de
las 20:00 es de los que nadie reproduce en una demo.

## Ningún texto que ve un usuario se escribe inline

<!-- check: block
     detector: texto_sin_traducir
     files: .ts,.tsx
     version: 1
     test: pasa :: mostrarMensaje('ok', t('stratix.edit.saved'))
     test: pasa :: <div>{t('stratix.new.title')}</div>
     test: pasa :: <span className={s.x}>{nombre}</span>
     test: pasa :: <button onClick={cerrar}>✕</button>
     test: falla :: mostrarMensaje('ok', 'Role updated')
     test: falla :: <button className={s.b}>Guardar cambios</button>
     test: falla existente :: mostrarMensaje('ok', 'Role updated')
-->

Vale para los mensajes de error y de éxito, no solo para los componentes: `mostrarMensaje` y
compañía reciben `t('clave')`, con la clave en `es.json` **y** `en.json`.

**Qué mira el check:** dos formas, las dos inequívocas — un aviso al usuario cuyo segundo
argumento es un literal en vez de `t(...)`, y texto suelto entre etiquetas JSX
(`<button>Guardar</button>`). Pide cuatro letras seguidas, así que no marca `>x<`, `>-<` ni
`>3h<`; y salta el contenido de los template literals, porque el HTML de una plantilla
—`report-html`— no es algo que React renderice.

**Un dato interpolado no salva el string:** un template literal `Error: ${e.message}` es texto
duro con un hueco. La clave lleva el parámetro: `t('common.errorWithDetail', { detail: e.message })`.

**Motivo:** hay 44 archivos con texto hardcodeado, y el idioma cambia dentro del mismo archivo
— `useUserActions.ts` dice *"No se pudo cambiar el rol."* y tres líneas más abajo *"Role
updated"*. El usuario ve la mezcla justo cuando algo salió mal, que es el peor momento para
parecer improvisado. La regla existía desde antes marcada `sin check: requiere leer el
significado del string` — y era falso: las dos formas de arriba se detectan por sintaxis. Al
ponerle el check, lo primero que frenó fue código escrito ese mismo día.

## Los valores de dominio salen de constantes
<!-- sin check: requiere saber qué constante corresponde a cada valor de dominio -->

Un estado, una etapa, un tipo: se compara contra la constante del catálogo, nunca contra el
literal escrito a mano. Research lo hace con `STAGE` y Stratix con `ESTADO`, los dos en el mismo
formato: un objeto META del que derivan listas, colores y etiquetas.

**Motivo:** el día que el catálogo cambia un valor, el literal no da error de compilación: la
pantalla simplemente deja de contar esas filas. Un bug que no rompe nada y solo hace que los
números estén mal.

### El valor canónico NO es la etiqueta

La constante guarda **el dato**: lo que está en la base y contra lo que se compara. Lo que se
muestra sale de i18n, con una clave por valor y un helper que traduce (`estadoLabel(estado, t)`,
`stageLabel(stage, t)`). **Nunca se renderiza la constante.**

El catálogo se escribe como un solo objeto META —valor → `{ labelKey, color, … }`— y de ahí
derivan las listas, los colores y las etiquetas. Agregar un valor es agregar una fila, y el
compilador reclama lo que falte.

**Motivo:** los valores canónicos de este repo están en español porque así se guardaron
(`'Pendiente'`, `'Por aprobar'`). Al renderizarlos directo, el Kanban rotulaba sus columnas
"Pendiente" con la app en inglés: el dato se estaba usando de texto de interfaz. Pasó el
20/08/2026, al mismo tiempo que se creaba la constante para dejar de comparar contra literales —
las dos mitades del problema viven juntas.

## Lo que cuenta plata, horas o tareas lleva test
<!-- sin check: depende del propósito de la función, no de su forma -->

Toda función que suma, cuenta o decide qué entra en un total va acompañada de su `.test.ts`.

**Motivo:** son las que nadie mira dos veces y las que salen impresas en un reporte de pago. La
regla "listar sí, sumar no" —el reporte lista lo que la persona pidió pero suma solo lo que
ejecuta— es exactamente el tipo de decisión que un test congela y una refactorización silenciosa
deshace. Research ya tiene sus tests de cálculo; Stratix, que es donde está el reporte de pago,
no.

## Nada de `../../`: fuera del vecindario se importa con `@/`

<!-- check: contact
     pattern: from\s+['"]\.\./\.\./
     files: .ts,.tsx
     version: 1
     test: falla :: import { theme } from '../../theme'
     test: pasa existente :: import { theme } from '../../theme'
-->

- `./loQueSea` — mismo directorio. Bien.
- `../loQueSea` — un nivel arriba, dentro del mismo módulo. Aceptable.
- `../../` o más — **prohibido**. Se escribe `@/features/<modulo>/...` o `@/shared/...`.

**Motivo:** en cuanto subís dos niveles ya no se sabe desde dónde se está mirando: `../../theme`
puede ser el de Research o el de cualquiera, y hay que reconstruir la ruta mentalmente para
saberlo. Con `@/features/research/theme` se lee de una.

Y hay un motivo mecánico, más fuerte ahora: las reglas de este directorio hacen que los archivos
**se muevan** —un componente pasa a carpeta, un módulo sube a `src/shared/`—, y una ruta relativa
larga se rompe en cada mudanza, mientras que el alias sobrevive. Cuando `src/shared/lib/` se partió en
`hooks/` y `utils/`, los 29 archivos que importaban con `@/` se arreglaron con un `sed`; si
hubieran usado rutas relativas, cada uno habría necesitado contar niveles a mano.

Quedan 88 sitios con `../../` de antes. Se corrigen por contacto, como los estilos inline: el que
toca un archivo, le arregla los imports.

## Un directorio de `src/shared/` se importa por su barrel, no módulo por módulo

```ts
// ❌ una línea por archivo, y el que agrega el tercero suma otra
import { localDate } from '@/shared/utils/dates'
import { resolveToCanonical } from '@/shared/utils/canonical'

// ✅ una sola llamada al módulo
import { localDate, resolveToCanonical } from '@/shared/utils'
```

Cada directorio de `src/shared/` lleva su `index.ts` que **re-exporta** lo público de sus
módulos. `src/shared/data/index.ts` ya lo hace y su comentario dice el porqué; esto lo vuelve la
regla para el resto.

**Dos formas, y la elección no es de gusto:**

- **Re-exportación nombrada** —`export { localDate } from './dates'`— cuando los nombres ya son
  únicos y se explican solos. Es el caso de `utils`: `localDate`, `resolveToCanonical`,
  `parseDelimited` no se pisan con nada.
- **Namespace** —`export * as researchRepo from './research'`— cuando varios módulos tienen
  miembros que se llaman igual. Es el caso de `data`: cada repo tiene su `list`, su `insert` y su
  `update`, y sin el namespace el barrel sería una colisión de nombres.

**Dos cosas que un barrel no hace nunca:**

1. **No define nada.** Solo re-exporta. Un `index.ts` con lógica adentro es un módulo más que
   encima se llama como el directorio.
2. **No re-exporta un módulo que importe del barrel.** Ahí nace el ciclo, y los ciclos por barrel
   son de los que no se ven leyendo: el archivo A importa `@/shared/x`, el barrel de `x` exporta
   B, y B importa `@/shared/x`. Antes de agregar un módulo al barrel, verificar que no importe de
   su propio directorio por el alias.

**Los imports viejos se migran por contacto**, como los `../../` y los estilos inline: el que toca
un archivo, le arregla los imports. Nada de una migración masiva que nadie puede revisar.

**Motivo:** un módulo compartido que se usa de a poco genera una línea de import por función, y esa
lista crece sola — el que necesita la tercera utilidad agrega la tercera línea, sin decidir nada.
El barrel hace que **usar más de `src/shared/` no cueste más ruido**, que es justo lo que se quiere
incentivar: la alternativa a "importar es incómodo" no es importar menos, es reescribir la función
en el módulo, y así es como aparecen los tres `StatCard`.

**El costo, dicho:** un barrel de re-exportación nombrada arrastra a sus vecinos al grafo de
módulos hasta que el bundler los sacude. Con `export { x } from './y'` (nombrado, no
`export * from`) Next 14 lo resuelve bien, y por eso la forma nombrada es la default acá.

<!-- check: contact
     pattern: from\s+['"]@/shared/(utils|hooks|data|db)/[a-z]
     files: .ts,.tsx
     version: 1
     test: falla :: import { parseDelimited } from '@/shared/utils/delimited'
     test: pasa :: import { parseDelimited, localDate } from '@/shared/utils'
-->

## Tres tipos o más: van a su propio archivo

<!-- check: contact
     detector: tres_tipos_o_mas
     files: .ts,.tsx
     except: types.ts,/types/,.d.ts,/constants/
     version: 1
     test: falla :: type A = { x: string }; type B = { y: string }; interface C { z: string }
     test: falla :: type A = { x: 1 }; enum B { UNO }; const C = { x: 1 } as const
     test: falla :: const A = { x: 1 } as const; const B = ['a'] as const; const C = { y: 2 } as const
     test: pasa :: type A = { x: string }; type B = { y: string }
     test: pasa :: export type { Actividad } from '@/shared/context/loadAppData'
     test: pasa @src/features/medical/types.ts :: type A = { x: 1 }; type B = { y: 1 }; type C = { z: 1 }
     test: pasa @src/shared/constants/domain.ts :: type A = { x: 1 }; type B = { y: 1 }; type C = { z: 1 }
     test: pasa existente :: type A = { x: 1 }; type B = { y: 1 }; type C = { z: 1 }
-->

Un archivo que declara **tres o más** formas ya no es un módulo con sus tipos: es un módulo de
tipos con código adentro. Se mudan a `types.ts` —del módulo o del directorio— y el archivo los
importa.

**`type`, `interface` y enumeración cuentan igual.** No hay jerarquía entre ellas: las tres
describen un dominio en vez de ejecutarlo, y da lo mismo si la tercera forma es un `interface`
o el `as const` con el que este repo enumera (`ESTADO`, `VERIFICADO`). Un archivo de
enumeraciones ES un archivo de tipos, y su lugar es `src/shared/constants/` o el `types.ts`
del módulo — por eso `/constants/` está exceptuado: ahí el catálogo ya vive solo.

El archivo de tipos **no lleva carpeta** (`componentes.md`: una carpeta es para lo que puede
testearse, y un tipo no se ejecuta). El módulo ya tiene dónde: `src/features/<modulo>/types.ts`
existe en admin, medical, research, cobranzas y accounting.

**Qué no cuenta:** una re-exportación (`export type { X } from …`) no declara nada, y un
`types.ts` puede tener los que necesite — es su trabajo.

**Motivo:** los tipos son el contrato y el código es la implementación; mezclados, hay que
scrollear la definición de cinco formas antes de llegar a la primera función, y la forma que se
quiere leer nunca está donde se la busca. Y hay un motivo mecánico: un tipo que vive dentro del
archivo que lo usa **no se puede importar sin arrastrar el módulo entero** —con su import de
Supabase, sus constantes y sus efectos—, así que el que necesita solo la forma termina
declarándola de nuevo. Así aparecieron las tres formas de fila que hoy conviven en el importador.

**Se migra por contacto**, como los `../../` y el `style` inline: hoy hay 17 archivos así, y
varios son de los más tocados del repo (`AppContext.tsx`, `permissions.ts`, `loadAppData.ts`).
Mudar tipos es un cambio estructural: obligarlo en medio de otra tarea convierte un arreglo de
dos líneas en un refactor que nadie pidió.

## El "sin filtro" no se escribe a mano

<!-- check: block
     detector: centinela_sin_filtro
     files: .ts,.tsx
     except: /constants/
     version: 1
     test: falla :: const [f, setF] = useState('All')
     test: falla :: if (filtro !== 'Todos') return false
     test: falla :: const [t, setT] = useState<'all' | 'DATA'>('all')
     test: pasa :: const [f, setF] = useState(SIN_FILTRO)
     test: pasa :: if (filtro !== SIN_FILTRO) return false
     test: pasa :: // antes era un useState('General') con las pills
     test: falla existente :: const [f, setF] = useState('All')
-->

`'All'`, `'Todos'`, `'all'`, `'General'`, `'Ninguno'`: la ausencia de filtro es un valor de
dominio como cualquier otro y sale de `SIN_FILTRO` (o `TRIMESTRE_GENERAL`) de
`@/shared/constants/domain`. Lo que se MUESTRA sale de i18n (`common.all`), nunca el valor.

**Motivo:** es la regla de los valores de dominio, en el caso donde más se olvida — porque
`'All'` no parece un dato, parece una palabra. El repo tenía **tres literales para la misma
idea**: `'All'` en Stratix, `'Todos'` en Directorio, `'all'` en Accounting, cada uno comparado
por su cuenta en dos o tres archivos. Y el caso que lo delata: `SolicitudesListView` ya había
declarado `const TODOS = 'All'`, mientras `useStratixData` escribía `'All'` a mano dos veces
para el MISMO filtro — la constante existía y el hook no la usaba, que es exactamente lo que
pasa cuando el valor se puede teclear. En Directorio era peor: `'Todos'` era a la vez el valor
comparado **y** el texto que se pintaba en el chip, así que en inglés el chip decía "Todos".

## Lo que se devuelve se arma en una variable con nombre

<!-- check: block
     detector: objeto_literal_en_return
     files: .ts,.tsx
     version: 1
     test: pasa :: return { ok: true }
     test: pasa :: return { data, error, cargando }
     test: pasa :: const resultado = { a, b, c, d, e }; return resultado
     test: falla :: return { busqueda, filtro, setBusqueda, setFiltro }
     test: falla existente :: return { busqueda, filtro, setBusqueda, setFiltro }
-->

Un `return` con un objeto literal de **cuatro campos o más** se parte en dos: el objeto se arma
en una variable con nombre y el `return` devuelve esa variable.

```ts
// ❌ el contrato del hook está escrito adentro de la sentencia que lo devuelve
return {
  busqueda, filtro, setBusqueda, setFiltro, limpiar, filtrados, total: members.length,
}

// ✅ el contrato tiene nombre; el return es una línea
const resultado = { busqueda, filtro, setBusqueda, setFiltro, limpiar, filtrados, total: members.length }
return resultado
```

Se cuenta por CAMPOS, no por líneas: da igual si el objeto se escribió en un renglón o en diez.
Un `return { data, error, cargando }` se queda como está — la regla persigue el contrato largo,
no el literal de tres campos.

**Motivo:** ese objeto es **el contrato** —lo que el hook o la función le ofrece a quien la usa—
y merece leerse como una declaración, no como el final de una sentencia. Con nombre se puede
tipar (`const resultado: UseDirectorioFilter = …`) y el editor lo muestra al pasar el mouse; y en
el diff, agregar un campo toca la línea de la variable en vez de la del `return`, así que deja de
confundirse con un cambio en el flujo de salida. `useStratixData` devuelve treinta y pico de
campos en un literal: hoy no hay forma de ver ese contrato sin leer el final del archivo.

## Un archivo se lee de una sentada: 50 líneas, y 150 es el techo

<!-- check: block
     detector: archivo_extenso
     blando: 50
     exime: archivo-extenso
     version: 2
     files: .ts,.tsx
     test: pasa :: const x = 1
-->

<!-- check: block
     detector: archivo_indivisible
     duro: 150
     files: .ts,.tsx
     except: .test.
     version: 1
     test: pasa @src/features/x/utils/y/index.test.ts :: describe('x', () => {})
     test: pasa :: const x = 1
-->

Dos escalones, y la diferencia entre ellos es si se admite una excusa:

| líneas | qué pasa |
|---|---|
| **0–50** | pasa. Es la medida normal de este repo: la mediana son 29 líneas. |
| **51–150** | pasa **sólo con marca versionada y razón escrita** (abajo). |
| **más de 150** | no pasa. No hay marca que valga: se parte. |

**Un archivo de test también se firma, no se exceptúa.** Una suite crece con la cantidad de
casos y ésa es su virtud, así que pasar de 50 líneas ahí suele estar bien — pero se dice, con la
marca y su razón. Exceptuar la categoría entera habría abierto un agujero permanente e invisible
justo donde más código hay.

    // centinela-exime: archivo-extenso@1 — son casos de prueba, no lógica: partirlos
    // esconde qué está cubierto y qué no.

Lo único que el techo de 150 sí excluye son los tests, porque no admite marca y sin salida un
`escribirImport/index.test.ts` de 472 líneas de casos quedaría intocable para siempre.

Partir quiere decir **una responsabilidad por archivo**, cada una en su carpeta con su
`index.ts`, y el directorio que las agrupa con un barrel que sólo re-exporta:

```
hooks/
  index.ts              ← barrel: sólo re-exporta
  useTablero/index.ts   ← una responsabilidad, un archivo
  useKanban/index.ts
```

**Quién compone las piezas es el que las necesita juntas**, no un archivo orquestador puesto en
el medio: `useStratixData` era un hook de 339 líneas que devolvía cuarenta campos; hoy son cinco
hooks y quien los llama es `StratixProvider`, el componente que ve el módulo entero.

**La marca de exención lleva versión.**

```ts
// centinela-exime: archivo-extenso@1 — es una plantilla HTML: partirla en tres archivos
// dejaría el <head> en uno y el <body> en otro, que se lee peor, no mejor.
```

Tres partes, las tres obligatorias: **clave**, **@versión** y **razón**. Sin razón no exime nada
— lo que la marca protege no es el número, es que la decisión quede escrita para quien venga
después.

**El `@1` es la versión de ESTA regla**, la que declara su bloque `check:`. El día que la regla
cambie —otro umbral, otro criterio de qué cuenta como partido— se sube su `version:` y todas las
marcas viejas dejan de valer automáticamente: el archivo vuelve a frenar y alguien tiene que
mirar si la excusa sigue siendo cierta con las reglas nuevas.

**Motivo:** un archivo gordo es un imán de conflictos —el merge del 19/08 dio seis conflictos y
dos fueron los dos hooks gordos, porque todo pasa por ahí y dos ramas siempre tocan el mismo
archivo— y además esconde su propio tamaño: nadie abre 339 líneas y decide partirlas, se agregan
diez más.

El límite blando en 50 y el duro en 150 salen de medir el repo, no de una opinión: mediana 29,
p75 55, p95 159. Con 50 a secas, el 28% de los archivos necesitaría marca — y una excepción que
aplica a uno de cada cuatro archivos deja de ser excepción y se firma sin leer. Con el techo
duro arriba, la franja del medio es lo que de verdad admite discusión, y lo que la pasa hay que
partirlo aunque se tenga una buena historia.

**Y por eso la marca lleva versión:** sin ella, una excusa escrita hoy sigue silenciando el
check para siempre, incluso cuando la regla que la justificaba ya cambió. La deuda invisible es
peor que la deuda anotada.

## Un `index` de carpeta que agrupa sólo re-exporta

<!-- check: block
     detector: index_que_define
     agrupadores: hooks,utils,components,constants,context,data,modals,ui
     files: .ts,.tsx
     version: 1
     test: pasa @src/features/x/hooks/index.ts :: export { useTablero } from './useTablero'
     test: falla @src/features/x/hooks/index.ts :: export const TABS = ['a']; const helper = () => 1
     test: pasa @src/features/x/hooks/useTablero/index.ts :: export function useTablero() { const x = 1; return x }
     test: pasa @src/shared/components/ui/Modal/index.tsx :: export default function Modal() { const x = 1; return x }
     test: falla existente @src/features/x/utils/index.ts :: const helper = () => 1
-->

Hay dos clases de `index` y no hacen lo mismo:

| | qué es | qué hace |
|---|---|---|
| `hooks/index.ts`, `utils/index.ts` | la carpeta **agrupa** módulos | **sólo re-exporta** |
| `useTablero/index.ts`, `Modal/index.tsx` | la carpeta **ES** el módulo | lo implementa |

El primero no define, no compone y no orquesta: `export { x } from './x'` y nada más. Si hace
falta juntar varias piezas, eso lo hace **quien las usa**, no el barrel.

**Motivo:** un barrel con lógica adentro se vuelve un módulo más que encima se llama como el
directorio, y todo lo que lo importa —que es todo el módulo— pasa a depender de esa lógica. El
`useStratixData/index.ts` que compuso los cinco hooks duró exactamente una revisión: parecía
inofensivo (`...tablero, ...kanban`) pero convertía a cada consumidor en cliente del módulo
completo, cuando el Kanban sólo necesita el Kanban.
