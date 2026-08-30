# Componentes

## Un componente es una carpeta, no un archivo

<!-- sin check: el check de esta regla vive en proceso.md · "El que toca un archivo lo deja en la
     convención vigente" — el detector componente_fuera_de_carpeta mira el PATH, así que es el
     mismo chequeo para la forma y para la migración, y duplicarlo acá lo haría fallar dos veces
     por lo mismo. Esta sección estuvo marcada `sin check: convención estructural` hasta el
     25/08/2026 — esa exención era falsa, y mientras duró se editó DepartmentChip.tsx dejándolo
     suelto. El marcador quedó escrito como comentario común hasta el 29/08/2026, así que el
     motor lo leía como una regla SIN marcador: se descubrió al agregar la regla del `<button>`,
     porque el archivo entero dejó de poder editarse. -->

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

<!-- check: contact
     detector: style_inline
     files: .tsx
     version: 3
     test: pasa :: <div style={{ '--fill': pct }} />
     test: falla :: <div style={{ padding: 8 }} />
     test: falla :: <div style={{ '--fill': p, padding: 8 }} />
     test: pasa existente :: <div style={{ padding: 8 }} />
-->

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

<!-- check: contact
     pattern: ['"]#[0-9a-fA-F]{3,8}['"]
     files: .tsx
     except: /constants/
     version: 1
     test: falla :: const color = destructive ? '#F87171' : accent
     test: falla :: <div style={{ background: '#9CA3AF' }} />
     test: pasa :: const color = destructive ? 'var(--c-danger)' : accent
     test: pasa :: <div className={s.caja} />
     test: pasa existente :: const color = destructive ? '#F87171' : accent
-->

<!-- check: contact
     pattern: (?i)#[0-9a-f]{3,8}\b
     files: .css
     except: globals.css
     version: 1
     test: falla @src/features/x/components/Y/index.module.css :: .x { color: #34d399; }
     test: falla @src/features/x/components/Y/index.module.css :: .x { border-color: #D1D5DB; }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { color: var(--c-t1); }
     test: falla @src/features/x/components/Y/index.module.css :: .x { color: #fff; }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { color: var(--c-sobre-solido); background: color-mix(in srgb, var(--c-accent) 88%, var(--c-oscurecer)); }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { box-shadow: 0 1px 2px rgba(16,24,40,.12); }
     test: pasa existente @src/features/x/components/Y/index.module.css :: .x { color: #34d399; }
-->

`src/app/globals.css` ya define los tokens oscuros de la app en `:root` (`--bg`, `--s1`, `--s2`,
`--s3`, `--accent`, `--t1`, `--t2`, `--t3`). Un `.module.css` los usa directo: `color: var(--t1)`.

Los tokens **claros del tablero** todavía viven en JS (`src/shared/components/dashboard/theme.ts`).
El primer componente de tablero que se migre los pasa a variables CSS y deja el objeto JS leyendo
de ahí, no al revés: la fuente de verdad de un color tiene que ser el CSS.

**Motivo:** un hex hardcodeado en el `.tsx` es una segunda copia del color que vive fuera de la
paleta: el día que se cambie el tema o la paleta, ese componente no se entera, y nadie encuentra
todas las copias porque nunca hubo una lista de dónde están.

**Un hex en un `style` inline se escribe `var(--token)`, no el número.** Es CSS: una variable
funciona igual ahí que en un `.module.css`, así que no hace falta migrar el componente entero
para dejar de duplicar el color. `ConfirmModal` tenía `'#F87171'` —que es `--c-danger`— y
`'#9CA3AF'` —que es `--c-t3`—, o sea la paleta escrita dos veces con otro nombre.

**Dónde SÍ va un hex, y por eso el check exceptúa `/constants/`:** un catálogo de dominio. El
color de una modalidad de reunión o de una etapa de Research ES el dato —viaja a la base, se
elige desde un panel— y de ahí sale como variable CSS con la excepción de arriba. La diferencia
es quién lo decide: la paleta la decide el tema, el color de una marca lo decide el admin.

**Y en un `.module.css` vale exactamente igual**, que es donde más se acumuló: hay 38 archivos
con hex, y los que más se repiten son la paleta escrita de nuevo — `#34d399` dieciocho veces es
`--c-ok`, `#f87171` doce veces es `--c-danger`, `#D1D5DB` ocho es el borde. Cada copia es un
color que no se entera el día que cambie el tema.

**`#fff` y `#000` tampoco pasan, y ahí me equivoqué primero.** Los había exceptuado por
"primitivos": blanco es blanco. Lo preguntó Wagner —*"¿y si después integro el modo oscuro?"*— y
tiene razón: con un segundo tema son decisiones de tema disfrazadas. El texto de un botón
primario puede no ser blanco en oscuro, y peor, `color-mix(…, #000)` significa **"oscurecer 12%"**
— en un tema oscuro hay que ACLARAR, así que ese `#000` está codificando la dirección del hover.

Por eso `globals.css` define `--c-sobre-solido` y `--c-oscurecer`. El día que exista el bloque
oscuro, esos dos tokens cambian de valor y todos los hovers se dan vuelta solos; con el hex
escrito a mano habría que encontrarlo en 38 archivos, sabiendo cuáles son tema y cuáles no.

`globals.css` también queda afuera, obviamente: es donde la paleta se DEFINE.

Hay 77 `.tsx` con hex, así que es `contact`: frena lo que nace y lo viejo se migra por contacto.

## Las medidas van en `rem`, no en píxeles

<!-- check: block
     pattern: (?:^|[;{\s])(?:min-|max-)?(font-size|padding|margin|gap|border-radius|width|height|top|right|bottom|left|inset)[a-z-]*:\s*[^;]*\b\d+px
     files: .css
     version: 3
     test: falla @src/features/x/components/Y/index.module.css :: .x { font-size: 12px; }
     test: falla @src/features/x/components/Y/index.module.css :: .x { gap: 10px; }
     test: falla @src/features/x/components/Y/index.module.css :: .x { border-radius: 10px; }
     test: falla @src/features/x/components/Y/index.module.css :: .x { min-height: 32px; }
     test: falla @src/features/x/components/Y/index.module.css :: .x { max-width: 320px; }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { font-size: .75rem; gap: .5rem; }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { border: 1px solid var(--c-border); }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { border-top: 1px solid var(--c-border); }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { border-left: 3px solid red; }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { box-shadow: 0 1px 2px rgba(16,24,40,.04); }
     test: pasa @src/features/x/components/Y/index.module.css :: .x { outline: 2px solid var(--c-accent); outline-offset: 2px; }
     test: falla existente @src/features/x/components/Y/index.module.css :: .x { font-size: 12px; }
-->

Tamaños de letra, espaciados, radios y dimensiones se escriben en `rem`. Un `px` fija la medida
a la pantalla; un `rem` la ata al tamaño de letra que el usuario eligió en su navegador.

```css
/* ❌ el texto crece si el usuario sube la letra, el padding no: el texto se apreta contra el borde */
.card { font-size: 13px; padding: 12px; border-radius: 12px; }

/* ✅ la tarjeta entera escala junta */
.card { font-size: .8125rem; padding: .75rem; border-radius: .75rem; }
```

**Qué sigue en píxeles, a propósito:** `border`, `outline`, `box-shadow` y los `transform` de un
píxel. Son líneas de contorno, no medidas de contenido: un borde de 1px tiene que seguir siendo
de 1px aunque el usuario agrande la letra — si escala, se convierte en un marco grueso. El check
mira sólo las propiedades de tamaño y espaciado, así que esas pasan solas.

**Y vale igual para una medida que viaja como PROP**, que es donde el check de arriba no llega
porque sólo mira `.css`:

<!-- check: contact
     pattern: \b(?:width|height|maxWidth|minWidth)=\{[0-9]+\}
     files: .tsx
     version: 1
     test: falla :: <Modal width={480} onClose={x} />
     test: falla :: <Grafico height={220} />
     test: pasa :: <Modal anchoRem={30} onClose={x} />
     test: pasa :: <Icono size={18} />
     test: pasa :: <Grafico height={alto} />
     test: pasa existente :: <Modal width={480} onClose={x} />
-->

```tsx
// ❌ el modal no crece cuando el usuario agranda la letra: el texto se apretuja contra el borde
<Modal width={480} … />

// ✅ y el nombre dice la unidad, así nadie le pasa 480 pensando en píxeles
<Modal anchoRem={30} … />
```

**El nombre del prop lleva la unidad**, no sólo el valor: `width={30}` se lee como treinta
píxeles y se rompe en silencio. `size` queda afuera del check a propósito — el tamaño de un
ícono es un gráfico, como un borde, y la regla ya exceptúa esos.

**Motivo:** lo encontró Wagner mirando `Modal`, que llevaba `width = 480` desde siempre. El
check de `rem` no lo veía porque vive en el `.tsx`, y es exactamente la misma falla: la caja
queda clavada al monitor mientras el texto de adentro escala. Un modal es la peor versión del
problema, porque además tiene `max-height` — el texto crece, la caja no, y el formulario entero
se va al scroll.

**La conversión es mecánica** (`bun rules/px-a-rem.ts <archivo>` la hace y muestra el diff), pero
**revisala**: la base es 16px = 1rem, y algún valor pensado para una pantalla concreta puede
querer otro número en vez de su conversión exacta.

**Motivo:** hoy 62 de los 63 `.css` del repo tienen medidas en píxeles, así que esto se paga por
contacto y de a un archivo. Vale la pena porque es accesibilidad real y barata: quien sube el
tamaño de letra del navegador —por vista cansada, por una pantalla lejos— hoy consigue que el
texto crezca dentro de una caja que no crece, que es peor que no poder agrandarlo. Y el mismo
cambio arregla el tablero proyectado, que es donde este repo mira sus números.

<!-- check: contact
     pattern: #[0-9a-fA-F]{6}\b
     files: .tsx
     except: /shared/constants/
     version: 1
     test: falla :: <Bar dataKey="h" fill="#7C6FF7" />
     test: falla :: const estilo = { background: '#1a2b3c' }
     test: pasa :: <Bar dataKey="h" fill={meta.color} />
-->

## El test acompaña, pero no se inventa
<!-- sin check: criterio humano sobre qué lógica merece test -->

El `index.test.tsx` cubre la **lógica** del componente: la que decide qué se muestra, cómo se
formatea un valor, cuándo se deshabilita algo. Un componente que solo acomoda markup no necesita
test — inventarle uno es escribir el render dos veces.

⚠️ **Falta la infraestructura para tests que renderizan.** Hoy vitest corre sin DOM: no hay
`jsdom` ni `@testing-library/react` instalados, así que un test que monte el componente no corre.
Mientras eso no esté, el test cubre las funciones puras que el componente use. Son dos
dependencias y cuatro líneas de `vitest.config.ts`: pedirlo cuando haga falta el primero.

## Lo que se repite en un `.map()` es un componente
<!-- sin check: requiere leer la estructura del JSX y decidir si es un bloque -->

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

## Una función con cuerpo no se escribe dentro de una prop

<!-- check: block
     pattern: =\{\s*(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*\{
     files: .tsx
     version: 1
     test: falla :: onConfirm={async () => { await crear(); setAbierto(false) }}
     test: falla :: onChange={e => { setFecha(e.target.value); guardar() }}
     test: falla existente :: onClick={async () => { const r = await borrar(); if (r) cerrar() }}
     test: pasa :: onClick={() => setAbierto(true)}
     test: pasa :: onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
     test: pasa :: onConfirm={guardarEdicion}
-->

Una prop recibe **el nombre** de una función, o a lo sumo una flecha de **una sola expresión**.
En cuanto el cuerpo abre llaves —dos sentencias, un `await` y algo más, un `if`— esa función se
declara arriba, con nombre, y a la prop se le pasa el nombre:

```tsx
// ❌ el handler entero embutido en el JSX
<ConfirmModal onConfirm={async () => { await crearActividad(); setConfirmarGuardado(false) }} />

// ✅ la función arriba, con nombre; el JSX dice QUÉ pasa, no cómo
async function guardarEdicion() {
  await crearActividad()
  setConfirmarGuardado(false)
}
<ConfirmModal onConfirm={guardarEdicion} />
```

**Qué sigue permitido:** `onClick={() => setAbierto(true)}` y `onChange={e => setForm(...)}` —
una expresión, se lee de un vistazo y no tiene dónde esconder lógica.

**Motivo:** es la misma razón por la que el atributo `style` está prohibido y por la que un
bloque dentro de un `.map()` se extrae — el detalle tapa la estructura. Un `onClick` de seis
líneas empuja el resto del JSX fuera de la pantalla y obliga a leer la lógica entera para
encontrar qué componente sigue. Y hay dos motivos mecánicos que la flecha inline no da: una
función con nombre **se puede testear** y se puede pasar a dos props distintas, mientras que la
inline se copia; y en el diff, un cambio de lógica toca la línea de la función y no la del JSX,
así que deja de mezclarse con los cambios de markup en el mismo renglón.

## Un `.tsx` declara UN componente

<!-- check: block
     detector: dos_componentes_en_archivo
     files: .tsx
     version: 1
     test: falla :: function Uno() { return <p /> } function Dos() { return <p /> }
     test: falla :: export default function Uno() { return <p /> } const Dos = () => <p />
     test: pasa :: export default function Uno() { return <p /> }
     test: pasa :: function ayuda(x) { return x } export default function Uno() { return <p /> }
     test: falla existente :: function Uno() { return <p /> } function Dos() { return <p /> }
-->

Un archivo, un componente — el que le da nombre a la carpeta. Un segundo componente en el mismo
`.tsx`, aunque sea de tres líneas y aunque sólo lo use el primero, va a su propia carpeta.

**Motivo:** el componente de al lado es invisible. No aparece al buscar por nombre de archivo,
no puede tener su `index.module.css` ni su test, y cuando alguien lo necesita en otra pantalla
no sabe que existe: lo escribe de nuevo. Es la misma raíz que los tres `StatCard` del repo. Y
mientras vive ahí, cada cambio suyo toca el archivo del componente principal, así que dos
trabajos distintos chocan en el mismo diff.

## Una tabla de datos no se declara adentro de un componente

<!-- check: block
     detector: tabla_en_componente
     files: .tsx
     version: 1
     test: falla :: const filas = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }]
     test: pasa :: const filas = [{ a: 1 }, { a: 2 }, { a: 3 }]
     test: pasa :: const filas = camposDeActividad(act, { t, locale })
     test: falla existente :: const filas = [{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }, { a: 5 }, { a: 6 }]
-->

Un array de **seis o más** objetos declarado dentro de un `.tsx` es una tabla de datos, y su
lugar no es el cuerpo del componente:

- **Si es estática** (una lista de opciones, un catálogo): va a `src/shared/constants/` o al
  `constants/` del módulo.
- **Si se deriva de datos** —etiquetas traducidas, valores formateados—: va a `utils/` como
  **función pura, con su test**. No es una constante: es un cálculo que devuelve filas.

```tsx
// ❌ quince filas de etiqueta+valor antes de llegar al primer <div>
const fields = [
  { label: t('stratix.col.assignee'), value: miembrosPorId[act.responsable_id] ?? '—' },
  // …catorce más
]

// ✅ el componente pide las filas; cómo se arman se prueba sin montar nada
const fields = camposDeActividad(act, { t, locale, miembrosPorId })
```

**Motivo:** esas filas son **reglas de negocio disfrazadas de markup** — qué se muestra cuando el
campo está vacío, de dónde sale el trimestre si la fila no lo trae, que `verificado` no es un
booleano. Adentro del `.tsx` no se pueden testear (hoy vitest corre sin DOM) y hay que scrollear
quince líneas antes del primer elemento. Afuera, cada una de esas decisiones tiene su test: así
se encontró que la ficha decía "Verificada: Sí" para toda tarea.

## El JSX que se pasa por una prop es un componente

<!-- check: block
     detector: jsx_en_prop
     files: .tsx
     version: 1
     test: pasa :: header={<ActivityDetailHeader act={a} onCerrar={cerrar} />}
     test: pasa :: icon={<Check />}
     test: pasa :: label={<><b>{n}</b> pendientes</>}
     test: falla :: header={<div className={s.h}><span>{a.empresa}</span><b>{a.titulo}</b></div>}
     test: falla existente :: title={<div><p>uno</p><p>dos</p></div>}
-->

Cuando el valor de una prop es markup de **tres elementos o más**, eso ya es un componente: se le pone nombre, se le hace su carpeta y se pasa `<Header … />`.

```tsx
// ❌ quince líneas de estructura adentro de la llamada a otro componente
<Modal header={
  <div className={css.head}>
    <div className={css.chips}>…</div>
    <div className={css.acciones}>…</div>
  </div>
}>

// ✅ la prop dice QUÉ encabezado, no cómo se dibuja
<Modal header={<ActivityDetailHeader act={act} onCerrar={cerrar} />}>
```

**Se cuenta por elementos, no por líneas.** Una llamada a componente repartida en varios
renglones por sus props —`header={<Header a={1} b={2} c={3} />}`— es un solo elemento y está
bien; un `<><b>{n}</b> pendientes</>` son dos y tampoco molesta.

**Motivo:** es la misma raíz que la regla del `.map()` y la del handler inline — el bloque que
más cambia queda escondido adentro del que menos cambia. Y acá tiene un costo extra: mientras el
markup vive en la prop **no puede tener su `.module.css`**, así que sus estilos se mezclan con
los del componente que lo hospeda; separarlo después obliga a desenredar dos hojas de estilo,
no sólo a mover JSX.

## Dos bloques de markup parecidos se unifican, y el resultado va a `src/shared/`

<!-- check: contact
     detector: markup_sustancial
     exime: bloques-similares
     version: 2
     files: .tsx
     test: pasa :: export default function X() { return <Otro /> }
     test: pasa :: // centinela-exime: bloques-similares@2 — leí ui/, ninguna admite una fila de detalle\nreturn <div><span>a</span><b>c</b></div>
     test: falla :: return <div><span>a</span><b>c</b></div>
     test: falla :: // centinela-exime: bloques-similares@1 — marca vieja, la regla ya cambió\nreturn <div><span>a</span><b>c</b></div>
     test: pasa existente :: return <div><span>a</span><b>c</b></div>
-->

Al escribir un bloque de markup, la pregunta es si ya existe otro casi igual en el repo. Si lo
hay, no se copia: se unifica en **un** componente y, si el nombre natural no menciona ningún
módulo (una tarjeta de indicador, una fila de tabla, un panel recogible), su lugar es
`src/shared/components/` — con el prop que haga falta para cubrir las dos variantes, y **sólo**
ese (ver `arquitectura.md`).

**Antes de crear, se LEE el inventario entero — y la salida más probable es un prop.**

No alcanza con pensar un nombre y buscarlo: el componente que ya resuelve tu caso puede
llamarse distinto de como vos lo llamarías. Se lista lo que hay y se lee la lista:

```bash
ls src/shared/components/ui src/shared/components/dashboard src/shared/components/shell
```

Hoy son ~20 en `ui/` y entran en una pantalla. Leerlos cuesta menos que el primer bug que se
arregla dos veces.

**Y la pregunta no es "¿existe uno igual?" sino "¿el mío es este mismo, con un prop más?"** Ésa
es la salida más frecuente y la que se pasa por alto: `ColorBadge` no aceptaba un ícono,
`StatBox` no aceptaba un tamaño — a los dos les faltaba UN prop, y las dos veces la reacción
natural habría sido escribir uno nuevo al lado. Un componente al que le falta un prop **no es un
componente distinto**: es el mismo sin terminar. Tres salidas posibles, en este orden:

1. **Existe y sirve** → se usa. No se escribe nada.
2. **Existe y le falta algo** → se le agrega ESE prop y se usa. Es lo más común, y es lo que
   evita el tercer `StatCard`. Si el componente vive en un módulo, sube a `src/shared/` al
   hacerlo.
3. **No existe, o existe algo que responde a otra cosa** → recién ahí nace uno nuevo, y la marca
   dice qué se leyó y **por qué agregarle un prop al que existe habría sido peor**.

Eso último es lo que la marca tiene que contestar. "No encontré nada" no es una razón: es el
resultado de no haber mirado.

**Cómo se verifica, si la similitud no se puede detectar:** por FIRMA, no por contenido (ver
`proceso.md` · "La marca"). Un componente **nuevo** con markup de tres elementos o más frena
hasta que lleve su marca:

```ts
// centinela-exime: bloques-similares@2 — leí ui/ entero (20 componentes): StatBox y ColorBadge
// son los más cerca. A ColorBadge le bastaría un prop para el ícono, pero acá el bloque tiene
// dos filas y agregarle un layout entero lo convertiría en otra cosa. Nace aparte.
```

El hook no puede juzgar si la decisión es correcta —la similitud vive ENTRE archivos y el
centinela ve uno solo—, pero sí puede exigir que la búsqueda **ocurra** y quede escrita.

**Sólo frena en archivos nuevos** (`contact`): la pregunta "¿esto ya existe?" tiene sentido al
crear, no cada vez que se toca un componente que ya vive hace meses.

⚠️ Esto lo cubría `/nextjs-praxis-guard:praxis-similar-components` hasta el 25/08/2026, cuando el
plugin se desactivó en este repo. Lo que encuentre la revisión se anota en `.todo/TODO.md` (ya
hay una tanda del 20/08/2026 ahí).

**Qué NO es esto:** dos bloques que se parecen *hoy* pero responden a cosas distintas no se
unifican — unificar por parecido y no por significado produce el componente con quince props
que nadie entiende. La prueba es si un cambio de requisito los movería a los dos juntos.

**Motivo:** el repo tiene **tres `StatCard`** (accounting, admin, research) que hacen casi lo
mismo, y por eso un bug se arregla una vez y sobrevive dos. Se llegó ahí sin que nadie lo
decidiera: cada uno era "un bloquecito parecido a aquel" en el momento de escribirlo.

## El tipo de las props va arriba, no dentro de la firma
<!-- sin check: convención de orden dentro del archivo, no contenido prohibido -->

```tsx
// ❌ la firma se lee dos veces: los nombres y, entremedio, sus tipos
export default function Field({ label, required = false, children }: {
  label: string
  required?: boolean
  children: ReactNode
}) {

// ✅ el contrato arriba, la firma abajo
type Props = {
  label: string
  required?: boolean
  children: ReactNode
}

export default function Field({ label, required = false, children }: Props) {
```

El tipo se llama `Props` salvo que el componente exporte más de uno; ahí lleva el nombre del
componente (`FieldProps`) y se exporta si alguien lo necesita.

**Motivo:** el contrato del componente es lo primero que se busca al abrirlo, y embutido en la
firma queda partido entre la desestructuración y el tipo. Con seis props, la línea del `function`
se estira quince renglones y el cuerpo empieza donde ya nadie lo ve. Aparte, un tipo con nombre
se puede exportar y reusar; uno inline hay que copiarlo.

## Los `useState` se cuentan de a poco: los campos que van juntos viven en un objeto

<!-- check: block
     detector: demasiados_use_state
     exime: useState
     version: 1
     files: .ts,.tsx
     test: falla :: const [a, sa] = useState(''); const [b, sb] = useState('')
     test: pasa :: const [form, setForm] = useState(vacio)
     test: pasa :: // centinela-exime: useState@1 — la ficha y el formulario son dos cosas distintas\nconst [a, sa] = useState(''); const [b, sb] = useState('')
     test: pasa :: // el hook tenía useState() por campo: useState(a) useState(b)
     test: falla existente :: const [a, sa] = useState(''); const [b, sb] = useState('')
-->

**El umbral es UNO.** Se midió antes de fijarlo: de todos los archivos del repo con dos o tres
`useState`, **ninguno** era el caso que justifica tenerlos sueltos (un `loading` junto a un
`error`) — todos eran campos que viajan juntos. Con esa evidencia, dos ya es la excepción y le
toca justificarse, no ser el default.

**Cuando de verdad son independientes, se marca el archivo:**

```ts
// centinela-exime: useState@1 — la ficha abierta y el formulario son dos cosas distintas:
// se abren por caminos distintos y ninguna operación toca las dos.
const [form, setForm] = useState(formVacio)
const [modalVerAct, setModalVerAct] = useState<Actividad | null>(null)
```

La marca lleva **clave, versión y razón**, las tres obligatorias: sin razón no exime nada, y el
`@1` es la versión de esta regla — el día que cambie, su `version:` sube y las marcas viejas
dejan de valer solas, así que alguien tiene que releer si la excusa sigue siendo cierta. El
mecanismo completo está en `codigo.md` · "Un archivo se lee de una sentada".

⚠️ Estuvo marcada `sin check: umbral heurístico` hasta el 25/08/2026, y mientras tanto
`useStratixData` llegó a catorce `useState` y `useAppData` a veinte.

Vale igual para un componente y para un **hook personalizado** — el hook que declara diez
`useState` tiene el mismo problema que el componente. Un formulario no es un `useState` por campo.
Lo que se llena y se envía junto es **un** estado:

```tsx
// ❌ diez estados para lo que es un solo objeto
const [titulo, setTitulo] = useState('')
const [empresa, setEmpresa] = useState('')
const [responsableId, setResponsableId] = useState('')
// …y siete más

// ✅ un objeto con su tipo arriba, un solo setter
type Form = { titulo: string; empresa: string; responsableId: string }

const [form, setForm] = useState<Form>(emptyForm)
const set = (k: keyof Form) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
```

La cuenta que dispara la regla: **más de tres `useState` en el mismo componente u hook es sospechoso**.
Antes de sumar el cuarto, preguntarse cuáles cambian juntos y juntarlos en un objeto. Quedan como
`useState` separados solo los estados genuinamente independientes — un `loading`, un `error`, un
modal abierto — porque nunca viajan al mismo tiempo. En un hook la barra es más alta todavía: si el
objeto de estado crece, es señal de que parte del hook merece ser otro hook (una responsabilidad,
un archivo).

**Si los cuatro son genuinamente independientes, la salida NO es inventar un objeto.** Es que el
archivo tiene cuatro responsabilidades y le toca partirse: un hook por responsabilidad, que es lo
que dice el párrafo de arriba. Agrupar en un objeto campos que no viajan juntos es peor que
tenerlos sueltos — esconde el problema en vez de arreglarlo.

**Motivo:** cada `useState` suelto es una oportunidad más de que dos campos queden desincronizados
— el clásico es guardar a medias o resetear cinco setters donde uno bastaba. Con el objeto, resetear
es `setForm(emptyForm)` y precargar es asignar el objeto entero: una línea en vez de diez, y ninguna
posibilidad de olvidar un campo.

## El objeto de estado se desestructura una vez, no se lee por camino

<!-- check: block
     detector: estado_accedido_por_camino
     files: .ts,.tsx
     version: 1
     test: falla :: const [form, setForm] = useState(v); if (form.titulo) return form.empresa
     test: pasa :: const [form, setForm] = useState(v); const { titulo, empresa } = form; if (titulo) return empresa
     test: pasa :: const [actividades, setActividades] = useState([]); return actividades.length
     test: pasa :: const [acts, setActs] = useState([]); acts.map(a => a); acts.filter(Boolean)
     test: falla existente :: const [form, setForm] = useState(v); if (form.titulo) return form.empresa
-->

Juntar los campos en un objeto (la regla de arriba) no se paga escribiendo `form.` cincuenta
veces. Se desestructura **una sola vez**, junto al `useState`, y el resto del archivo usa los
nombres sueltos:

```ts
// ❌ el prefijo se repite y cada lectura vuelve a decir de dónde sale
const [criterios, setCriterios] = useState(SIN_CRITERIOS)
if (criterios.departamento !== SIN_FILTRO && m.departamento !== criterios.departamento) return false

// ✅ una línea dice de dónde salen; después se leen como lo que son
const [criterios, setCriterios] = useState(SIN_CRITERIOS)
const { busqueda, departamento } = criterios
if (departamento !== SIN_FILTRO && m.departamento !== departamento) return false
```

**Escribir sigue siendo por el setter** (`setCriterios(p => ({ ...p, busqueda }))`): lo que se
desestructura es la LECTURA. Y un estado que es un array no entra acá — `acts.map(...)`,
`acts.length` son el array mismo, no campos de un objeto.

**Motivo:** el prefijo repetido es ruido que además tapa el cambio real en el diff: una línea que
dice `criterios.departamento !== SIN_FILTRO && m.departamento !== criterios.departamento` obliga a
leerla dos veces para ver que compara dos cosas distintas. Con los nombres sueltos, la condición
se lee de una. Es la misma razón que la de los `style` inline y los handlers de bloque: el detalle
mecánico tapando lo que importa.

## El componente renderiza; todo lo demás vive afuera
<!-- sin check: convención estructural de distribución entre archivos -->

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
<!-- sin check: ubicación que depende de quién pide el módulo, no de la forma -->

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
<!-- sin check: estructura condicionada a la testeabilidad del módulo -->

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
<!-- sin check: hay que leer el cuerpo completo para ver que es un pasamanos -->

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

## Un contenedor compartido lleva `children`, no la lista de lo que va adentro

<!-- check: contact
     pattern: \w+(?:Label|Text|Title|Placeholder)\??:\s*string[\s\S]{0,400}?\w+(?:Label|Text|Title|Placeholder)\??:\s*string
     files: .tsx
     except: /features/
     version: 1
     test: falla @src/shared/components/ui/X/index.tsx :: type Props = {\n  cancelarLabel: string\n  confirmarLabel: string\n}
     test: pasa @src/shared/components/ui/X/index.tsx :: type Props = { children: ReactNode }
     test: pasa @src/shared/components/ui/X/index.tsx :: type Props = { label: string; onClick: () => void }
     test: pasa @src/features/x/components/Y/index.tsx :: type Props = {\n  cancelarLabel: string\n  confirmarLabel: string\n}
     test: pasa existente @src/shared/components/ui/X/index.tsx :: type Props = {\n  cancelarLabel: string\n  confirmarLabel: string\n}
-->

Cuando un componente de `src/shared/` empieza a recibir **dos o más rótulos** dejó de ser un
contenedor: está decidiendo QUÉ va adentro. Se parte en dos — el contenedor con `children`, y
las piezas como componentes sueltos.

El caso vivo es `ConfirmModal`: ocho props, dos de ellas rótulos (`confirmLabel`,
`confirmPhraseLabel`). Cada modal de confirmación del repo lo CONFIGURA en vez de componerlo, y
por eso el que necesita un tercer botón —o un pie con los botones alineados distinto— no puede
usarlo y escribe el suyo. `FilterBar` tiene el mismo problema con `clearLabel` y `resultsLabel`.

**Un rótulo solo no dispara la regla**, a propósito: `WarningCallout` recibe su `message` y está
bien — es un componente de UNA cosa, no un contenedor. Lo que delata al contenedor disfrazado es
el segundo rótulo: significa que adentro hay dos elementos distintos y el componente está
eligiendo por vos cuáles son y en qué orden van.

**Es `contact` y sólo rige en `src/shared/`:** los dos casos de arriba se migran cuando se los
toque. En `src/features/` no aplica — un componente de módulo puede fijar su contenido porque
tiene un solo consumidor conocido.

**Motivo:** el 29/08 se escribió un `ModalActions` con seis props —`cancelarLabel`,
`confirmarLabel`, `ocupado`, `ocupadoLabel`…— y no aguantó una revisión: con los botones fijos,
un diálogo de tres botones no entraba, así que el siguiente que lo necesitara iba a escribir el
pie a mano otra vez. Se rehízo con `children`.

**Y después se borró, que es la otra mitad de la lección.** Con `children` quedó siendo un `<div>`
con seis declaraciones de CSS y **un solo consumidor**: los 20+ pies de modal que supuestamente
unificaba nunca se migraron. Un contenedor compartido se gana el lugar cuando de verdad lo usan
dos; hasta entonces es una clase CSS en el archivo que la usa. Lo señaló Wagner preguntando si
servía para algo, y no servía.

Las dos mitades juntas: **si el contenedor fija su contenido, no compone; si no tiene dos
consumidores, no hace falta.** Un componente tiene que pasar las dos.

## Un `<button>` escrito a mano es `Button` al que le falta un prop

<!-- check: contact
     pattern: <button[\s>]
     files: .tsx
     except: /shared/components/ui/Button/
     exime: boton-a-mano
     version: 1
     test: falla :: return <button type="button" className={s.b} onClick={guardar}>{rotulo}</button>
     test: pasa :: return <Button kind="confirm" onClick={guardar} />
     test: pasa existente :: return <button onClick={guardar}>{rotulo}</button>
-->

Antes de escribir `<button>` en un `.tsx`, la pregunta es la de `arquitectura.md`: **¿el mío es
`Button` con un prop más?** Casi siempre sí — `Button` ya trae el ícono, el rótulo por defecto,
el `ocupado`, el `deshabilitado`, el tono y el anillo de foco, y agregarle una variante es
agregar **una fila** a `BUTTON_META`, no un componente.

**Cuándo un `<button>` a mano es lo correcto, y hay que decirlo con la marca:** cuando el botón
no es una ACCIÓN sino una **superficie** — la fila entera de una lista, una pestaña, un ítem del
rail, un chip que alterna. Ahí es un botón por accesibilidad (entra en el tab order, responde a
Enter) y no por ser un botón de la paleta: darle el padding, el ícono y el tono de `Button` lo
rompería. `TabButton`, `RailButton`, `PillToggle` y `FilaLista` son eso.

```ts
// centinela-exime: boton-a-mano@1 — no es una acción, es la SUPERFICIE: la fila entera es el
// botón para que abrirla funcione con el teclado. Con el estilo de `Button` sería un botón de
// barra, no una fila.
```

Es `contact` y no `block`: hay **82** `.tsx` con `<button>` a mano, y congelarlos costaría más de
lo que protege. Frena en lo que nace; lo viejo se migra por contacto.

**Motivo:** es la misma historia de los tres `StatCard` y de los cinco botones que se fusionaron
el 29/08 — cada `<button>` suelto nace como "un botoncito parecido a aquel" y se lleva su propio
padding, su propio radio y su propio `:focus-visible`, casi iguales pero no iguales. El costo no
se ve al escribirlo: se ve el día que cambia la paleta o el anillo de foco y hay que encontrar 82
lugares sabiendo cuáles son acciones y cuáles superficies. Y hay un costo que sólo tiene el
suelto: `Button` pone `type="button"` él mismo, y un `<button>` sin `type` dentro de un `<form>`
**envía el formulario** — un bug que no aparece hasta que alguien mete el botón en un formulario.

## Una familia de variantes es UN componente con unión discriminada, no N componentes

<!-- sin check: decidir si dos componentes son variantes de lo mismo pide leer qué hacen, no cómo se escriben -->

Los cinco botones de acción del repo —nuevo, editar, borrar, cancelar, confirmar— son **un solo**
`Button` con `kind`. No cinco componentes, y tampoco un `variant: string`.

Las dos piezas que lo hacen viable, y ninguna es opcional:

1. **La unión discriminada.** `kind: 'new' | 'edit' | 'delete' | 'cancel' | 'confirm'`, no
   `string`. Con `string`, `kind="nwe"` compila y devuelve un botón sin estilo — un fallo
   silencioso, que es exactamente lo que estas reglas persiguen. Con la unión, no compila.
2. **Un objeto META, no una cadena de `if`.** Lo propio de cada variante —ícono, rótulo por
   defecto, tono— vive en `BUTTON_META`, el mismo patrón con el que este repo enumera todo lo
   demás (`ESTADO`, `MODALIDAD`, `ROL_EN_REUNION`). Agregar una variante es agregar **una fila**,
   y `satisfies Record<ButtonKind, …>` hace que el compilador reclame la que falte.

**Y el tono se DERIVA del `kind`, no se pasa por prop.** Si `tono` fuera un prop, existiría
`<Button kind="delete" tono="primario" />`: un botón de borrar que no parece destructivo. Lo que
la variante significa no puede ser configurable desde afuera.

**Cuándo NO unificar:** cuando las variantes no comparten la forma —un botón y un chip no son
variantes de nada— o cuando cada una necesitaría props que las demás ignoran. La prueba sigue
siendo la de arriba: **¿un cambio de requisito las movería a todas juntas?** "Los botones son más
redondos" mueve a las cinco; "el primario lleva degradado" mueve a una fila del META, no a un
componente.

**Motivo, y esto incluye haberse equivocado primero.** El 29/08 se escribieron `CancelButton` y
`ConfirmButton` como componentes separados, argumentando que cada botón trae lo suyo (el `+` de
`NewButton`, el `✏️` de `EditButton`) y que fusionar produciría el componente con quince props.
Era falso en las dos mitades: "lo suyo" son tres campos que entran en una fila de un META, y la
unión discriminada da MÁS seguridad que cinco componentes, no menos. El costo real de la
separación estaba a la vista y no se miró: **cinco `.module.css` repitiendo el mismo padding, el
mismo radio, la misma tipografía y el mismo anillo de foco**, que es una duplicación que se
arregla una vez y sobrevive cuatro. Lo señaló Wagner, dos veces.

Queda dicho para la próxima: la pregunta no es "¿estos componentes son distintos?" sino "¿lo que
los distingue entra en una fila de un catálogo?". Si entra, son variantes.
