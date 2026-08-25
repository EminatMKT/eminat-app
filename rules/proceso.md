# Proceso

## Toda regla nueva nace con su check
<!-- sin check: es la meta-regla que exige los checks; exigirse a sí misma no verifica nada -->

Escribir la regla y el check es un solo gesto: si la regla se puede verificar, el check va en el
mismo commit que la regla, no "después". Si no da para frenar (`contact`/`block` no la expresan,
o haría falta un detector nuevo del centinela), la sección sale con su marcador
`<!-- sin check: <razón> -->` y queda anotada para cuando el motor pueda con ella.

<!-- check: block
     detector: regla_sin_check
     paths: rules/
     files: .md
     except: README.md
     version: 1
     test: falla @rules/x.md :: ## Regla sin check
     test: pasa @rules/x.md :: texto suelto antes del primer encabezado
     test: pasa @rules/x.md :: ## Regla exenta <!-- sin check: criterio humano -->
-->

**Motivo:** una regla sin verificación depende de que quien edita se acuerde de ella — y de ley
se olvida. El centinela ya corre antes de cada Write/Edit: un check cuesta cinco líneas y la regla
pasa a obedecerse sola. La exención explícita deja rastro de qué quedó fuera y por qué, en vez de
un silencio que nadie distingue de un olvido.

## La marca: cuando no se puede verificar el contenido, se verifica la firma

<!-- check: block
     detector: marca_sin_inventario
     files: .ts,.tsx
     except: rules/centinela/detectores/,rules/EXENCIONES.md
     version: 1
     test: pasa :: const x = 1
     test: falla :: // centinela-exime: archivo-extenso@1 — razón buena pero el archivo no está en la tabla
     test: pasa @src/features/stratix-mkt/utils/report-html/index.ts :: // centinela-exime: archivo-extenso@1 — es UNA plantilla HTML
     test: falla existente :: // centinela-exime: useState@1 — razón buena pero sin fila en el inventario
-->

<!-- check: block
     detector: marca_mal_formada
     files: .ts,.tsx,.md
     except: rules/centinela/
     version: 1
     test: pasa :: // centinela-exime: useState@1 — la ficha y el formulario son dos cosas
     test: pasa :: // centinela-exime: archivo-extenso@2 - es una plantilla HTML
     test: pasa :: const x = 1
     test: falla :: // centinela-exime: useState — sin versión no vale
     test: falla :: // centinela-exime: archivo-extenso@1
     test: falla existente :: // centinela-exime: useState — sin versión no vale
-->

Hay reglas que un detector no puede juzgar mirando un archivo: si este markup se parece a otro
del repo, si estas dos responsabilidades son de verdad una sola. Antes esas reglas salían con
`<!-- sin check: … -->` y quedaban libradas a la memoria. **Ahora tienen una tercera salida: se
verifica que alguien las haya revisado y firmado.**

```ts
// centinela-exime: bloques-similares@1 — busqué StatCard, MetricBox y las tarjetas del
// tablero de Research: ninguna admite una fila de detalle, así que este nace aparte.
```

**Formato, y las tres partes son obligatorias:**

| parte | qué es | si falta |
|---|---|---|
| `clave` | qué regla se está firmando (la que declara `exime:`) | no exime |
| `@versión` | la versión de esa regla, la que declara `version:` | no exime |
| `— razón` | qué se revisó y por qué se decidió así | no exime |

**Una regla la habilita declarando `exime: <clave>` y `version: N` en su bloque `check:`.** Las
dos, no una: el self-check falla si hay `exime:` sin `version:`, porque sin versión la marca no
caduca nunca y la caducidad es lo único que impide que una excusa dure para siempre.

El motor mira la marca ANTES que al detector y compara **por igualdad exacta**, no "mayor o
igual": una marca `@0` sobre una regla `@1` no vale, y una `@99` tampoco. Con `>=` alcanzaba con
firmar un número grande para no caducar jamás — un escape permanente disfrazado de firma.

Las claves son **por regla**: una marca de `useState@1` no exime de `archivo-extenso`, aunque
esté en el mismo archivo. Un archivo que incumple dos reglas lleva dos marcas y dos filas en el
inventario.

Cuando una regla cambia se sube su `version:` y **todas sus marcas caducan de golpe**: los
archivos vuelven a frenar y alguien tiene que releer si la excusa sigue siendo cierta con la
regla nueva.

**Y la marca se paga en visibilidad: además del comentario, el archivo va listado en
`rules/EXENCIONES.md`.** Sin la fila, la marca no vale. Es la única contra que tiene el
mecanismo: escribir un comentario no cuesta nada, y un escape gratis convierte cualquier regla
en una sugerencia. Agregar una fila a una tabla versionada, en cambio, entra en el diff, se
revisa como código y se ve crecer.

**Se firma una decisión, no se pide permiso.** Una marca sin razón no es una marca: por eso el
check de arriba frena una marca mal escrita. Es el fallo más traicionero del mecanismo — una
marca a medias no exime de nada y el archivo frena por la regla original, sin que nadie relacione
una cosa con la otra.

**Motivo:** entre "la regla se cumple" y "la regla no se puede verificar" faltaba un escalón, y
sin él la mitad de las reglas del repo vivía en el segundo. La firma no prueba que la decisión
sea correcta —eso ningún hook puede—, prueba que **se tomó**: que alguien miró, decidió y dejó
escrito qué miró. Con el versionado, además, esa firma tiene fecha de vencimiento: la deuda
anotada envejece a la vista, en vez de volverse permanente el día que se escribió.

## No se dice "funciona" sin haber corrido algo
<!-- sin check: regla de comportamiento del agente, no de contenido de código -->

Antes de dar algo por terminado: `npx tsc --noEmit` y `npx vitest run`. Si el cambio es visual,
se abre en el navegador. **Y si no se abrió, se dice que no se abrió** — nunca se presenta como
verificado lo que solo compiló.

Vale igual para lo que reportan otros agentes o herramientas: se confirma antes de repetirlo.

**Motivo:** "compila" y "funciona" son dos afirmaciones distintas, y la segunda es la que se cree
el que la lee. Un `tsc` limpio no dice nada de un dropdown que se ve elegido mientras el estado
está vacío — ese bug pasó todos los tipos y todos los tests durante meses.

## Una herramienta se prueba corriéndola, y se prueba que FALLA cuando debe

<!-- sin check: es la obligación de ejecutar algo, y lo que la verifica es justamente la corrida
     del self-check (`bun rules/centinela/main.ts --self-check`), que el hook ya exige -->

Vale para todo lo que no es la app: el centinela, un script de migración, un chequeo de CI. Dejar
de darlo por hecho tiene dos pasos, y el segundo es el que se saltea:

1. **Correrlo.** Un script que nadie ejecutó no está terminado, está escrito.
2. **Romper a propósito lo que debería detectar y ver que lo detecta.** Una herramienta de
   control que nunca se vio fallar puede estar devolviendo "todo bien" porque no mira nada.

**Al tocar `rules/centinela/`, el paso 1 es `bun rules/centinela/main.ts --self-check`**, antes de
seguir con cualquier otra cosa.

**Y una herramienta de control nunca se traga sus propios errores.** Si un detector explota, el
centinela reporta `(CHECK ROTO)` y frena; no lo saltea. Un `catch { continue }` ahí convierte un
detector con un bug en un detector que "no dispara nunca", que es la peor forma de fallar que
puede tener un guardia: silenciosa y del lado que parece bueno.

**Y un verificador que no corre en el gate es un verificador apagado.** Vale para los tres:
las reglas (`pnpm rules:check`), los tipos (`pnpm typecheck`) y los tests (`pnpm test`) van en
`.githooks/pre-push` **y** en `.github/workflows/ci.yml`. El hook local se saltea con
`--no-verify`; el gate duro es CI.

<!-- check: block
     detector: gate_incompleto
     verificadores: rules:check,typecheck,test
     paths: .github/,.githooks/
     files: .yml,pre-push
     version: 1
     test: falla @.githooks/pre-push :: echo 'reglas + typecheck + tests'; pnpm typecheck && pnpm test
     test: pasa @.githooks/pre-push :: pnpm rules:check && pnpm typecheck && pnpm test
     test: falla @.github/workflows/ci.yml :: - run: pnpm typecheck
     test: pasa @.github/workflows/ci.yml :: run pnpm rules:check; run pnpm typecheck; run pnpm test
     test: pasa @src/features/x/y.ts :: pnpm typecheck
-->

**Motivo:** el 25/08/2026 se editó `detectores.ts` con un reemplazo por índices que borró dos
funciones y una constante. El `tsc` del proyecto no lo vio —el centinela corre con Bun, fuera del
`tsconfig` de la app— y el self-check **tampoco**, porque `revisar()` envolvía cada check en un
`try { … } catch { continue }`: el detector roto se comportaba exactamente igual que uno que no
encuentra nada. Dos reglas quedaron mudas y sólo se descubrió al correr un script de medición a
mano. Se arregló el `catch` para que grite, y se verificó rompiendo un detector a propósito y
comprobando que el self-check falla.

## Un commit es una unidad revisable, y el mensaje dice el porqué
<!-- sin check: práctica de git que ocurre fuera de los archivos -->

Un commit resuelve **una** cosa. Si el mensaje necesita un "y además", son dos commits.

El cuerpo del mensaje explica **por qué** se hizo, contra qué protege y qué se decidió descartar.
El qué ya lo dice el diff.

**Motivo:** el repo se revisa por mensajes, no por diffs — el diff de un refactor de 18 archivos
no explica ninguna decisión. Y mezclar cosas rompe la única herramienta barata que hay para
deshacer: un revert de un commit mixto se lleva puesto lo que no tenía nada que ver.

### Nada de `git add -A`: se stagea por ruta

```bash
git add ruta/uno.ts ruta/dos.css                  # los nuevos, que commit no toma solo
git commit ruta/uno.ts ruta/dos.css -m "…"        # la ruta TAMBIÉN en el commit
```

**La ruta va en el `commit`, no solo en el `add`.** Es la única forma mecánica de que no entre
otra cosa: `git commit` con rutas ignora el resto del índice. Con `git add` solo, cualquier cosa
stageada antes viaja igual, y mirar `git status` no alcanza si se lo corre en el mismo comando
que el commit — la salida se lee cuando ya pasó.

**El commit se revisa antes de hacerlo, no después.** `git status -s` con el índice ya armado
dice exactamente qué va a entrar; si aparece un archivo que el mensaje no menciona, o sobra el
archivo o falta un commit.

**La trampa es `git commit` sin rutas: commitea el índice ENTERO.** Cualquier cosa stageada antes
—un `git mv` o un `git rm` de un paso anterior— se sube sola y en silencio, aunque el `git add`
inmediatamente anterior haya nombrado solo dos archivos.

**No hay que acordarse de mirarlo:** `rules/centinela/main.ts` imprime el índice —y los
títulos de este archivo— justo antes de cada `git commit`.

**Motivo:** el 20/08/2026 pasó **cuatro veces en el mismo día**. Un `fix(lint)` de cuatro archivos
se llevó puesta la mudanza entera de los componentes de Stratix, que estaba stageada de antes;
un refactor se llevó las reglas nuevas; y un fix de build se llevó un fix de navegación. Las tres
veces hubo que deshacer y rearmar los commits, que cuesta más que stagear bien la primera vez —
y si alguno se hubiera pusheado, ya no había forma barata de separarlos.

## Un cambio que altera lo que alguien ya vio se avisa
<!-- sin check: obligación de comunicación junto al commit, no de código -->

Si un cambio mueve cifras, cambia un comportamiento o rompe una costumbre de alguien que ya usa
el sistema, el aviso se escribe **junto al commit**, en `.todo/TODO.md`, con qué cambió y qué va
a ver distinto.

**Motivo:** el tablero de Research pasó a contar las fases de otra manera (un estudio
`Phase 1/Phase 2` cuenta ahora en las dos barras) y los indicadores empezaron a responder a los
filtros, que además se recuerdan entre sesiones. Todo correcto, y aun así Federico abre el
tablero, ve otros números y concluye que se rompió. El aviso escrito después de la reunión llega
tarde.

## La UI que ocultó dirección se comenta, no se borra
<!-- sin check: la regla manda comentar código a propósito; un check lo confundiría con deuda -->

Cuando se quita un bloque de UI por pedido de alguien —no por estar mal— se comenta el componente
y su invocación, con **el motivo y la fecha**. No se borra.

**Motivo:** esas decisiones se revierten. Top Sponsors y los chips de país están comentados desde
la reunión del 20/07 y restaurarlos es descomentar un renglón; borrados, serían arqueología de
git para alguien que ni sabe que existieron.

## Lo que se decidió y no se hizo, se anota

Una decisión tomada y no ejecutada, un pendiente que quedó bloqueado por alguien, una deuda que
se aceptó a sabiendas: va a `.todo/TODO.md` con su motivo y su fecha. No a la memoria de la
conversación.

**Motivo:** `.todo/` es lo único que sobrevive a que se cierre la sesión. Todo lo demás hay que
reconstruirlo leyendo commits.

## El que toca un archivo lo deja en la convención vigente

<!-- check: block
     detector: componente_fuera_de_carpeta
     files: .tsx
     version: 1
     test: falla @src/features/directorio/components/DepartmentChip.tsx :: export default function DepartmentChip() { return <p /> }
     test: pasa @src/features/directorio/components/DepartmentChip/index.tsx :: export default function DepartmentChip() { return <p /> }
     test: pasa @src/app/(app)/page.tsx :: export default function Page() { return <p /> }
     test: falla existente @src/features/directorio/components/DepartmentChip.tsx :: export default function DepartmentChip() { return <p /> }
-->

Las convenciones de este directorio no se aplican sólo a lo que nace: **abrir un archivo para
cambiarlo es el momento de ponerlo al día**. Un componente suelto pasa a su carpeta con su
`index.module.css`; los `style` inline y los `../../` de ESE archivo se arreglan; los imports
sueltos de `src/shared/` pasan por el barrel.

**El alcance es el archivo que ya estabas tocando, nada más.** No se aprovecha para migrar los
vecinos ni el módulo entero: eso produce el diff de cuarenta archivos que nadie revisa, que es
justo lo que estas reglas tratan de evitar.

**Lo mecánico lo frena el centinela** (hoy: 150 componentes sueltos contra 102 ya en carpeta).
Lo demás —los estilos, los imports— depende de que se mire el archivo al abrirlo.

**Motivo:** una convención que sólo rige para el código nuevo nunca llega al viejo, y el repo
queda partido en dos mitades con dos estilos; a los seis meses ya no se sabe cuál es la vigente.
Migrar por contacto reparte el costo entre quienes ya tienen el archivo abierto y el contexto en
la cabeza, en vez de juntarlo en una migración masiva que nadie va a hacer nunca. Pasó el mismo
25/08/2026: se editó `DepartmentChip.tsx` para sacarle un literal y se lo dejó suelto y con
`style` inline — el archivo estaba abierto, el cambio costaba dos minutos, y aun así se pasó por
alto. Por eso ahora lo pregunta el hook y no la memoria.

<!-- check: contact
     pattern: (//|\{/\*|/\*)\s*(TODO|FIXME)
     files: .ts,.tsx
     version: 1
     test: falla :: // TODO: mover esto a shared cuando madure
     test: falla :: { /* FIXME revisar el caso del borde */ }
     test: pasa :: const todoList = [] // la palabra suelta no es un comentario pendiente
-->

## El build de verificación no se corre contra el `.next` del dev server
<!-- sin check: regla de comando y entorno, no de contenido -->

Para verificar se usa `pnpm build:check`, que escribe en `.next-verify/`. **Nunca `next build` a
secas con `pnpm dev` levantado.**

**Motivo:** los dos comandos comparten `.next/`. Un `next build` corrido con el server levantado
le pisa los artefactos, y a partir de ahí el dev sirve **503 en sus propios chunks**
(`main-app.js`, `app/layout.js`, `layout.css`): la app queda en "Cargando…" para siempre y no
tira ningún error en consola, así que parece un bug del código. Pasó el 20/08/2026 y costó media
hora de diagnóstico que no tenía nada que ver con el cambio que se estaba probando.

`next.config.js` lee `NEXT_BUILD_DIR`, así que la separación está hecha en el repo y no depende
de que alguien se acuerde.
