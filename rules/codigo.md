# Código

Estas reglas venían de la sección "Convenciones" de `CLAUDE.md`: son órdenes sobre cómo escribir,
no descripciones del proyecto, así que su lugar es este directorio.

## Los tipos no se aflojan para que compile

<!-- check: block
     pattern: :\s*any\b|\bas\s+any\b|<any>
     files: .ts,.tsx
     test: falla :: const x: any = 1
     test: falla :: foo(bar as any)
     test: pasa :: const x: Company = 1
     test: falla existente :: const x: any = 1
-->

`any` está prohibido por ESLint (`no-explicit-any: error`). Cuando un tipo no cierra, la salida es
`Pick`/`Omit`/`Partial` sobre los tipos que ya existen, o `unknown` con un narrowing explícito —
nunca `any`, y nunca un `as` que solo silencia al compilador.

**Motivo:** el ban costó limpiar 183 sitios, y aun así el merge de `development` del 19/08 trajo
`any` nuevo en cinco archivos, escritos en paralelo mientras la limpieza pasaba por otra rama. La
regla se sostiene en cada rama o no se sostiene: reconciliar dos ramas donde una tipó y la otra
no es el conflicto más caro que tuvo este repo.

## Las páginas de `src/app/` son thin routes

Una página monta el componente de `src/features/<modulo>/` y nada más. La lógica vive en el feature.

## Un `route.ts` solo exporta handlers HTTP

`export async function GET/POST/PUT/DELETE`. Los helpers van en otro archivo del mismo directorio.

**Motivo:** Next trata cualquier otro export de un `route.ts` como parte del contrato de la ruta.

## Las animaciones salen de `src/shared/motion`

<!-- check: block
     pattern: from\s+['"]framer-motion['"]
     files: .ts,.tsx
     except: /shared/motion
     test: falla :: import { motion } from 'framer-motion'
     test: pasa @src/shared/motion/index.tsx :: import { motion } from 'framer-motion'
-->

Nunca Framer Motion directo en un componente.

**Motivo:** un solo lugar donde ajustar duraciones y curvas, y un solo lugar donde apagarlas si
alguna vez hace falta respetar `prefers-reduced-motion`.

## Los permisos se preguntan, no se deducen

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

## i18n: integrar, no ignorar

<!-- check: block
     pattern: i18n-ignore
     files: .ts,.tsx
     test: falla :: <Text i18n-ignore>Hola</Text>
     test: pasa :: <Text>{t('saludo')}</Text>
-->

Todo componente nuevo usa `useT()`/`t()` con sus claves en `es.json` **y** `en.json`. No se marca
con `i18n-ignore`.

**Motivo:** `i18n-ignore` no es una excepción, es deuda con nombre propio: el texto queda en un
solo idioma y nadie vuelve. Agregar la clave en los dos archivos cuesta dos líneas en el momento
en que se escribe el componente, y cuesta una búsqueda por todo el repo seis meses después.

## Nombres de columnas FK

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

Vale para los mensajes de error y de éxito, no solo para los componentes: `mostrarMensaje` y
compañía reciben `t('clave')`, con la clave en `es.json` **y** `en.json`.

**Motivo:** hay 45 llamadas con el texto hardcodeado, y el idioma cambia dentro del mismo archivo
— `useUserActions.ts` dice *"No se pudo cambiar el rol."* y tres líneas más abajo *"Role
updated"*. El usuario ve la mezcla justo cuando algo salió mal, que es el peor momento para
parecer improvisado.

## Los valores de dominio salen de constantes

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
