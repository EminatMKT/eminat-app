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
     test: falla @rules/x.md :: ## Regla sin check
     test: pasa @rules/x.md :: texto suelto antes del primer encabezado
     test: pasa @rules/x.md :: ## Regla exenta <!-- sin check: criterio humano -->
-->

**Motivo:** una regla sin verificación depende de que quien edita se acuerde de ella — y de ley
se olvida. El centinela ya corre antes de cada Write/Edit: un check cuesta cinco líneas y la regla
pasa a obedecerse sola. La exención explícita deja rastro de qué quedó fuera y por qué, en vez de
un silencio que nadie distingue de un olvido.

## No se dice "funciona" sin haber corrido algo
<!-- sin check: regla de comportamiento del agente, no de contenido de código -->

Antes de dar algo por terminado: `npx tsc --noEmit` y `npx vitest run`. Si el cambio es visual,
se abre en el navegador. **Y si no se abrió, se dice que no se abrió** — nunca se presenta como
verificado lo que solo compiló.

Vale igual para lo que reportan otros agentes o herramientas: se confirma antes de repetirlo.

**Motivo:** "compila" y "funciona" son dos afirmaciones distintas, y la segunda es la que se cree
el que la lee. Un `tsc` limpio no dice nada de un dropdown que se ve elegido mientras el estado
está vacío — ese bug pasó todos los tipos y todos los tests durante meses.

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

<!-- check: contact
     pattern: (//|\{/\*|/\*)\s*(TODO|FIXME)
     files: .ts,.tsx
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
