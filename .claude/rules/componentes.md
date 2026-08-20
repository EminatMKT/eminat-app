# Componentes

## Un componente es una carpeta, no un archivo

De ahora en adelante, un componente nuevo se crea así:

```
Componente/
  index.tsx          ← el componente
  index.module.css   ← sus estilos
  index.test.tsx     ← su test
```

Se importa por la carpeta: `import Componente from '@/shared/components/Componente'`.

`.tsx` en el test, no `.ts`: si el test monta el componente, lleva JSX.

**Motivo:** las tres piezas de un componente se leen y se cambian juntas. Con archivos sueltos
quedan en tres puntos distintos del árbol y el test es el que se pierde.

### Una carpeta que agrupa NO es la carpeta de un componente

Son dos cosas distintas y no se mezclan:

- **Carpeta de agrupación** — nombre temático en minúsculas (`overview/`, `leads/`, `modals/`).
  Adentro solo van carpetas de componentes. **Nunca** tiene un `index.tsx` propio.
- **Carpeta de componente** — nombre del componente en PascalCase (`OverviewTab/`), y adentro
  `index.tsx` + `index.module.css` + `index.test.tsx`.

```
overview/              ← agrupa; no tiene index.tsx
  OverviewTab/
    index.tsx
    index.module.css
  TrimestreSelector/
    index.tsx
  TeamRankRow/
    index.tsx
```

**Dos `.tsx` no comparten carpeta.** Si en un directorio hay dos componentes, hay dos carpetas.
La única forma de que un `.tsx` conviva con otro archivo es que sean las piezas del MISMO
componente: `index.tsx` con su `index.module.css` y su `index.test.tsx`.

**Motivo:** un `index.tsx` colgado del grupo le roba el nombre al componente. `overview/index.tsx`
se importa como `./overview` y en el editor abre una pestaña que dice "index" — no se sabe cuál de
los cinco archivos `index.tsx` abiertos es. Con `overview/OverviewTab/index.tsx` la ruta dice el
nombre y el import también. Y si mañana el grupo necesita un segundo componente de primer nivel,
no hay dónde ponerlo sin mover el primero.

**Los componentes viejos se dejan como están.** Se migra el que se esté tocando por otro motivo,
no el repo entero de una: 209 archivos usan `style={{}}` hoy y una migración masiva es un diff que
nadie puede revisar.

## El atributo `style` está prohibido

Ninguna regla de diseño se escribe en el JSX. Ni colores, ni tamaños, ni espaciados, ni bordes,
ni layout. Todo eso vive en el `index.module.css` del componente:

```tsx
import s from './index.module.css'
export default function Panel({ children }) {
  return <div className={s.panel}>{children}</div>
}
```

**Motivo:** un objeto de estilos dentro del JSX tapa la estructura. Una fila de tabla con seis
props de layout inline hace que haya que leer 200 caracteres para encontrar el `{children}`. El
CSS aparte deja el `.tsx` mostrando **qué** se renderiza y el `.css` **cómo** se ve.

### La única excepción: pasar un DATO como variable CSS

Lo que sale de la base no puede estar en el `.css` —el ancho de una barra, el color de una marca—
porque no se conoce al escribirlo. Va como custom property, y el `.css` decide qué hacer con ella:

```tsx
<div className={s.bar} style={{ '--fill': `${pct}%`, '--color': colorMarca[codigo] } as CSSProperties} />
```
```css
.bar { width: var(--fill); background: var(--color); }
```

**Esto no reabre la puerta.** Solo se admite si el valor viene de los datos y **solo** para
declarar variables: en cuanto aparece una propiedad CSS real (`padding`, `display`, `fontSize`,
`borderRadius`) dentro de un `style`, está mal, aunque venga en el mismo objeto que una variable.
La prueba: si el valor se puede escribir en el `.css` sin conocer la fila de la base, va en el
`.css`.

**Motivo de la excepción:** sin ella la alternativa es una clase por valor posible, que no existe
cuando el valor sale de la base — o manipular el DOM por `ref`, que es peor que el problema.

### Los colores salen de variables CSS, no de objetos JS

`src/app/globals.css` ya define los tokens oscuros de la app en `:root` (`--bg`, `--s1`, `--s2`,
`--s3`, `--accent`, `--t1`, `--t2`, `--t3`). Un `.module.css` los usa directo: `color: var(--t1)`.

Los tokens **claros del tablero** todavía viven en JS (`src/shared/components/dashboard/theme.ts`).
El primer componente de tablero que se migre los pasa a variables CSS y deja el objeto JS leyendo
de ahí, no al revés: la fuente de verdad de un color tiene que ser el CSS.

## El test acompaña, pero no se inventa

El `index.test.tsx` cubre la **lógica** del componente: la que decide qué se muestra, cómo se
formatea un valor, cuándo se deshabilita algo. Un componente que solo acomoda markup no necesita
test — inventarle uno es escribir el render dos veces.

⚠️ **Falta la infraestructura para tests que renderizan.** Hoy vitest corre sin DOM: no hay
`jsdom` ni `@testing-library/react` instalados, así que un test que monte el componente no corre.
Mientras eso no esté, el test cubre las funciones puras que el componente use. Son dos
dependencias y cuatro líneas de `vitest.config.ts`: pedirlo cuando haga falta el primero.

## Lo que se repite en un `.map()` es un componente

Un bloque de markup dentro de un `.map()` o de un bucle no se escribe inline: se extrae a su
componente, con su carpeta.

```tsx
// ❌ el JSX del padre se lee mitad estructura, mitad detalle de una fila
{leyenda.map(([estado, color]) => (
  <div className={s.item} style={{ '--estado': color }}>
    <div className={s.muestra} />
    {estadoLabel(estado, t)}
  </div>
))}

// ✅ el padre dice QUÉ lista, y la fila sabe cómo se dibuja
{leyenda.map(([estado, color]) => <EstadoLeyendaItem key={estado} estado={estado} color={color} />)}
```

**Qué cuenta como bloque:** markup con estructura —más de un elemento— o un elemento con lógica
propia (clase condicional, variables CSS, handler). Un `<option>` que solo muestra su texto no lo
es, y hacerle un componente es ruido.

**Motivo:** la fila es lo que más cambia y es lo que hay que poder leer sola; mientras vive dentro
del padre, cada retoque de una celda obliga a releer el bucle entero y el diff toca el archivo que
todos los demás cambios también tocan. Además es la única forma de que la fila tenga su propio
`.module.css`: inline, sus estilos se mezclan con los del contenedor.

## El componente renderiza; todo lo demás vive afuera

Un componente es lo más chico posible: recibe props y devuelve markup. **El estado, los hooks, el
contexto y los helpers no viven adentro del `.tsx`** — van a su propio archivo, y si el módulo ya
tiene el directorio, adentro de él:

```
src/features/<modulo>/
  components/     ← .tsx, lo más chicos posible
  hooks/          ← useLoQueSea.ts
  context/        ← el provider y su hook de acceso
  utils/          ← funciones puras, con su .test.ts al lado
```

Un componente que declara seis `useState`, un `useEffect` y una función de cálculo no es un
componente: son tres cosas dentro de un archivo. El hook se extrae, y el `.tsx` queda mostrando
qué se renderiza.

**Motivo:** los archivos gordos son imanes de conflicto. El merge de `development` del 19/08 dio
seis conflictos y **dos fueron los dos hooks gordos** —`useResearchData.ts` (280 líneas) y
`useStratixData.ts` (286)—, justamente porque todo pasa por ahí y dos ramas siempre tocan el
mismo archivo. Un hook por responsabilidad se mergea solo.

Y hay un motivo más barato: una función pura en `utils/` se testea sin montar nada. La misma
lógica adentro de un `.tsx` necesita jsdom, testing-library y un render — que hoy ni siquiera
están instalados.

## Los hooks, contextos y utils pasan por el mismo juicio que los componentes

La pregunta de `arquitectura.md` —¿esto lo pediría otro módulo?— **no es solo para componentes**.
Vale igual para un hook, un contexto o una función de utilidad.

- Si es del módulo: `src/features/<modulo>/hooks/`, `context/`, `utils/`.
- Si otro módulo lo pediría: `src/shared/hooks/`, `src/shared/utils/`, o `src/shared/context/` si es estado
  global.

**Un directorio por tipo, del mismo nombre en los dos lados.** Un hook compartido va a
`src/shared/hooks/` porque un hook de módulo va a `src/features/<modulo>/hooks/`; una función pura va a
`src/shared/utils/` porque su equivalente de módulo va a `utils/`. Nada de bolsas mezcladas: `lib/`
existía y tenía adentro cuatro funciones puras y dos hooks, así que no se podía saber qué había
en un archivo sin abrirlo.

**Motivo:** `useUserPreference` nació en Research y hoy la usan Admin, Medical y Stratix — las
preferencias de UI no eran de Research, eran de la app. Al revés también cuenta: `useOrgCatalog`
sabe de empresas, departamentos y cargos, y no tiene nada que hacer fuera de Admin.

## La misma forma para cualquier módulo que pueda testearse

No es solo para componentes: **si un `.ts` puede tener un test automatizado, es una carpeta.**

```
dates/
  index.ts
  index.test.ts
```

El import no cambia —`@/shared/utils/dates` resuelve el `index.ts`—, así que convertir un archivo
suelto en carpeta no toca a ninguno de sus llamadores.

Se queda como archivo suelto lo que no se puede testear solo: un módulo de constantes, un archivo
de tipos, una re-exportación.

**Motivo:** con archivos sueltos el test queda como vecino y se pierde de vista — se ve
`filters.ts` en una lista de veinte archivos y no se sabe si tiene test sin buscarlo. Con la
carpeta, abrirla ya responde la pregunta, y el que borra el módulo se lleva el test con él en vez
de dejarlo huérfano.

## Un componente que solo devuelve otro no es un componente

Si el cuerpo entero es `return <Otro />`, el envoltorio sobra: se monta `<Otro />` directamente
donde estaba el envoltorio.

```tsx
// ❌ no aporta nada: un nombre, un archivo y un import de más
export default function EquipoTab() {
  return <Stratix360Roster />
}

// ✅ el que rendereaba la sección ES el roster
const tabViews = { equipo: <Stratix360Roster />, … }
```

Si el envoltorio existía porque **el nombre de adentro no dice lo que significa en ese lugar**, lo
que se hace es **renombrar el de adentro** — no agregar una capa para renombrarlo desde afuera.

**Excepción: las páginas de `src/app/`.** Ahí el envoltorio es el contrato con el router: la ruta
tiene que existir como archivo y su trabajo es montar el feature (ver la regla de thin routes en
`codigo.md`).

**Motivo:** un pasamanos hay que abrirlo para descubrir que no hace nada, y además miente sobre la
estructura — parece que Team tiene lógica propia cuando no tiene ninguna. Suelen ser restos: este
quedó cuando a `EquipoTab` se le sacó la barra de sub-vistas que duplicaba el sidebar.
