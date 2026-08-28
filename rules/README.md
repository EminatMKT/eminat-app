# Reglas de código — eminat-app

Acá van las reglas que Wagner va dictando sobre cómo escribir código en este repo. Se cargan
solas: `CLAUDE.md` importa este archivo, y este importa los demás.

**Para agregar una regla:** escribirla en el archivo temático que le corresponda de la lista de
abajo. Si no encaja en ninguno, crear uno nuevo y agregarlo a esa lista — sin la línea `@`, el
archivo existe pero nadie lo lee.

**Qué va acá y qué va en `CLAUDE.md`:** `CLAUDE.md` describe **cómo es** el proyecto (stack,
entornos, módulos, estructura). Acá van las **órdenes sobre cómo trabajar**: qué hacer, qué no
hacer, y por qué. Si una regla contradice a `CLAUDE.md`, gana la de acá y hay que corregir
`CLAUDE.md`.

Cada regla lleva su **motivo**. Una regla sin motivo se obedece mal: sin saber contra qué
protege, no se sabe cuándo aplica ni cuándo dejó de tener sentido.

## Una regla se puede hacer verificable desde acá mismo

**Toda regla nueva intenta nacer con su check** — y si no puede llevarlo, sale con su marcador
de exención. La regla completa (con el hook que la obliga) vive en `proceso.md`.

El centinela (`rules/centinela/`, motor en Bun compartido por todos los CLIs) corre antes de cada
Write/Edit y **no contiene ninguna regla**: las lee de estos archivos. Para que una regla se
verifique sola, se le agrega un bloque dentro de su propia sección:

```markdown
## Los tipos no se aflojan para que compile

<!-- check: block
     pattern: :\s*any\b|\bas\s+any\b
     files: .ts,.tsx
     except: /shared/utils/dates
     version: 1
-->

`any` está prohibido por ESLint…

**Motivo:** …
```

El mensaje que ve quien la incumple es el **Motivo** de esta misma sección. Cambiar el motivo
acá cambia lo que dice el hook: no hay un segundo lugar donde mantener el texto.

Dos modos:

| modo | qué hace | cuándo |
|---|---|---|
| `block` | corta la operación | la regla no admite matices (`any`, una ruta API sin guard) |
| `contact` | corta sólo en archivos **nuevos** | la regla dice "se migra por contacto" (`style` inline, `../../`) |

No hay un modo "avisar y dejar pasar": un centinela que susurra se ignora, que es justo lo que
hacía la versión anterior volcando diecisiete títulos en cada edición. Si una regla no da para
frenar, no le pongas check — dejala escrita y ya.

**`block` sólo para lo inequívoco.** Medido al escribirlo: poner `style` inline en `block`
habría bloqueado 163 de los 385 archivos del repo — o sea, habría hecho imposible tocar la
mitad del código en nombre de una regla que dice explícitamente que NO se migra de una. Un
falso positivo que frena el trabajo hace más daño que la regla que protege.

Una clave por línea: el separador no puede ser `|` porque los regex lo usan para alternancia.

Campos: `pattern` (regex que dispara), `detector` (nombre de una función del centinela, para lo que
un regex no expresa —la excepción de las variables CSS, por ejemplo—), `requires` (sólo evalúa
si esto está), `absent` (dispara si esto NO está), `files` y `except` (sufijos y subcadenas de
ruta) y `paths` (subcadenas de ruta que amplían el alcance más allá de `src/`, ej. las migraciones
en `supabase/migrations/`). Aparte está `comando`: en vez de mirar un archivo, mira la **línea de
Bash** antes de ejecutarla — para prohibiciones que nunca llegan a escribirse (`supabase db reset`).

**Todo check lleva sus `test:`**, una línea por caso, dentro del mismo bloque:

```markdown
<!-- check: block
     pattern: :\s*any\b|\bas\s+any\b
     files: .ts,.tsx
     version: 1
     test: falla :: const x: any = 1
     test: pasa :: const x: Company = 1
-->
```

Formato: `test:` + `falla` o `pasa`, opcionalmente `existente` (para los checks `contact`: el
mismo contenido en un archivo que ya existe), opcionalmente `@ruta/de/archivo.ts` cuando la regla
filtra por ruta —; después de `::`, el contenido a evaluar. La ruta default es un `.tsx` genérico
de features.

`bun rules/centinela/main.ts --self-check` corre todos esos tests y verifica que toda regla con
check tenga su **Motivo**. Falla en voz alta: es la herramienta con la que se editan las reglas.

@arquitectura.md
@base-de-datos.md
@codigo.md
@componentes.md
@proceso.md
@seguridad.md
@ui.md
