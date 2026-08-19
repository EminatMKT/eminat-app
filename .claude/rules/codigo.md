# Código

Estas reglas venían de la sección "Convenciones" de `CLAUDE.md`: son órdenes sobre cómo escribir,
no descripciones del proyecto, así que su lugar es este directorio.

## Los tipos no se aflojan para que compile

`any` está prohibido por ESLint (`no-explicit-any: error`). Cuando un tipo no cierra, la salida es
`Pick`/`Omit`/`Partial` sobre los tipos que ya existen, o `unknown` con un narrowing explícito —
nunca `any`, y nunca un `as` que solo silencia al compilador.

**Motivo:** el ban costó limpiar 183 sitios, y aun así el merge de `development` del 19/08 trajo
`any` nuevo en cinco archivos, escritos en paralelo mientras la limpieza pasaba por otra rama. La
regla se sostiene en cada rama o no se sostiene: reconciliar dos ramas donde una tipó y la otra
no es el conflicto más caro que tuvo este repo.

## Las páginas de `app/` son thin routes

Una página monta el componente de `features/<modulo>/` y nada más. La lógica vive en el feature.

## Un `route.ts` solo exporta handlers HTTP

`export async function GET/POST/PUT/DELETE`. Los helpers van en otro archivo del mismo directorio.

**Motivo:** Next trata cualquier otro export de un `route.ts` como parte del contrato de la ruta.

## Las animaciones salen de `shared/motion`

Nunca Framer Motion directo en un componente.

**Motivo:** un solo lugar donde ajustar duraciones y curvas, y un solo lugar donde apagarlas si
alguna vez hace falta respetar `prefers-reduced-motion`.

## Los permisos se preguntan, no se deducen

En componentes: `useApp().modules.includes('<slug>')`. En lógica pura:
`getModulesForRole(map, role).includes('<slug>')` de `shared/auth/permissions.ts`.

Nunca comparar contra el nombre de un rol. Los roles son dinámicos —los crea el admin desde
`/admin`— así que un `rol === 'colaborador'` hardcodeado es una condición que el admin puede
volver falsa sin tocar código.

## Supabase en el cliente: el singleton

Se importa el cliente de `shared/db/supabase.ts`. No se instancia uno nuevo.

## i18n: integrar, no ignorar

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
