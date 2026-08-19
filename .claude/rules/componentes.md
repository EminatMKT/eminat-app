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

**Los componentes viejos se dejan como están.** Se migra el que se esté tocando por otro motivo,
no el repo entero de una: 209 archivos usan `style={{}}` hoy y una migración masiva es un diff que
nadie puede revisar.

## Los estilos van en CSS Modules, no en `style={{}}`

```tsx
import s from './index.module.css'
export default function Panel({ children }) {
  return <div className={s.panel}>{children}</div>
}
```

**Motivo:** un objeto de estilos dentro del JSX tapa la estructura. Una fila de tabla con seis
props de layout inline hace que haya que leer 200 caracteres para encontrar el `{children}`. El
CSS aparte deja el `.tsx` mostrando **qué** se renderiza y el `.css` **cómo** se ve.

### Los valores que cambian en runtime pasan por variables CSS

Lo que sale de los datos —el ancho de una barra, el color de una marca, una opacidad calculada—
no puede estar en el `.css`. Va como custom property y el `.css` la consume:

```tsx
<div className={s.bar} style={{ '--fill': `${pct}%`, '--color': colorMarca[codigo] } as CSSProperties} />
```
```css
.bar { width: var(--fill); background: var(--color); }
```

**Motivo:** es el único `style` que queda justificado — pasa un dato, no una regla de diseño. Sin
esto la alternativa es una clase por valor posible, que no existe cuando el valor sale de la base.

### Los colores salen de variables CSS, no de objetos JS

`app/globals.css` ya define los tokens oscuros de la app en `:root` (`--bg`, `--s1`, `--s2`,
`--s3`, `--accent`, `--t1`, `--t2`, `--t3`). Un `.module.css` los usa directo: `color: var(--t1)`.

Los tokens **claros del tablero** todavía viven en JS (`shared/components/dashboard/theme.ts`).
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
