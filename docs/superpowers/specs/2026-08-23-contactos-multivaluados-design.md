# Contactos multivaluados y datos que se contradicen

**Fecha:** 2026-08-23
**Estado:** diseño aprobado, sin implementar
**Depende de:** `2026-08-21-pacientes-import-design.md` (el registro de pacientes y su import)

## El problema

Wagner lo encontró probando el import a mano: cuando dos filas coinciden en un paciente y
traen teléfonos distintos, **uno de los dos se pierde**.

La primera descripción fue "el sistema sobreescribe". Es al revés, y la dirección importa:
`fusionarCampoSimple` (`pacienteIdentity/index.ts:233`) **se queda con el valor existente y
descarta el entrante**, anotándolo en una lista de `choques`.

Y hay una segunda mitad, peor:

```ts
// escribirImport/index.ts:109
for (const m of miembros) acumulado = fusionar(acumulado, recortar(m.entrante)).paciente
```

`.paciente` se usa; **`.choques` se descarta entero**. Ningún otro archivo del repo lo lee.
O sea que hoy el segundo teléfono se pierde *y el registro de que existió también*. No hay
error, no hay aviso, y no queda nada para investigar después.

Eso es exactamente lo que impide corregir una fusión equivocada: si el sistema unió a dos
personas distintas, el dato que lo delataría —el teléfono que no coincidía— ya no está.

## Lo medido, antes de decidir

Contra las 5.072 filas del archivo real, contando sin imprimir ningún valor:

### Multivaluado de verdad — todos los valores son ciertos a la vez

| Dato | Casos |
|---|---|
| **Teléfono** | **681 personas (16% del registro)** con más de un número distinto, hasta **4** |
| **Email** | 28 personas |

### Contradictorio — la persona tiene uno solo y las fuentes no coinciden

- **Fecha de nacimiento: 76 casos.** Núcleos de nombre con dos DOB distintos **que comparten
  teléfono**: la misma persona, con una fecha mal cargada en alguno de los sistemas.
  (Otros 59 núcleos tienen dos DOB y **no** comparten teléfono — esos son homónimos distintos,
  no contradicciones, y el matcheo hace bien en tratarlos como personas separadas.)
- **Sexo: 0 casos.** Ni una contradicción en 5.072 filas. **No se construye nada para esto.**

### Lo que no entra

`direccion`, `seguro`, `seguro_id`, `alergias`, `condiciones` y `notas` **no vienen en el
archivo**: las tres hojas traen nombre, DOB, sexo, teléfonos y email, nada más. Hacerlos
multivaluados hoy es generalidad especulativa.

Verificado que mientras tanto no hay riesgo: como el import nunca los trae, `fusionar` recibe
`entrante === undefined` y conserva el existente. Alergias en particular importaba —perder una
alergia no es un problema de datos sino de seguridad del paciente— y por esta vía no puede pasar.

## La distinción que ordena todo el diseño

**Multivaluado** y **contradictorio** parecen el mismo problema —los dos pierden un dato— pero
piden mecanismos opuestos:

- Un paciente con dos teléfonos: **los dos son verdad**. Se guardan los dos y listo.
- Un paciente con dos fechas de nacimiento: **una es falsa**. Guardarlas como si las dos fueran
  ciertas sería mentir en una tabla clínica. Lo que hay que conservar es **qué dijo cada
  sistema**, para que alguien pueda decidir después.

Meter las dos cosas en la misma tabla haría que el sistema afirme que un paciente nació dos veces.

---

## Diseño

### 1. `paciente_contactos` — lo genuinamente plural

```sql
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_contacto') THEN
    CREATE DOMAIN public.tipo_contacto AS text
      CONSTRAINT tipo_contacto_valores CHECK (VALUE IN ('telefono','email'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.paciente_contactos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id  uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  tipo         public.tipo_contacto NOT NULL,
  valor        text NOT NULL
    CONSTRAINT paciente_contactos_valor_no_vacio CHECK (btrim(valor) <> ''),
  fuente       public.fuente_paciente NOT NULL DEFAULT 'manual',
  clave_origen text,                     -- qué fila de ese sistema lo trajo (NULL si es manual)
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (paciente_id, tipo, valor, fuente)
);
```

**`valor` se guarda normalizado** (por `normalizarTelefono` / trim+lowercase del email), no crudo.
El `UNIQUE` compara texto: sin normalizar, `(305) 555-0101` y `3055550101` serían dos contactos
distintos del mismo número.

**`fuente` va adentro del `UNIQUE`, a propósito.** Si eClinicalWorks *y* eClinPro traen el mismo
número, quedan **dos filas** — y que dos sistemas coincidan en un teléfono es la mejor evidencia
de que la fusión estuvo **bien**. Sacando `fuente` del `UNIQUE` esa coincidencia se borraría, que
es justo la información que este trabajo existe para conservar.

**`fuente` es `NOT NULL` con default `'manual'`, y no nullable — corrección de la revisión.**
La primera versión de este spec usaba `NULL` para "lo cargó una persona". Está mal, y la revisión
lo probó contra el Postgres local: **en un índice único, dos `NULL` nunca chocan**, así que ni el
`INSERT` ni un `ON CONFLICT (paciente_id, tipo, valor, fuente)` detectan que ya existe. Verificado:
tres guardados del mismo teléfono con `fuente = 'ecw'` dejan **1** fila; los mismos tres con
`fuente = NULL` dejan **3**.

O sea que el constraint no protegía justo el caso para el que se lo puso. `'manual'` ya existe en
el `DOMAIN fuente_paciente`, así que usarlo cuesta cero y hace que la deduplicación funcione
igual para lo cargado a mano que para lo importado. (`UNIQUE NULLS NOT DISTINCT` sería la otra
salida —Postgres 15+, y el servidor acá es 17— pero deja la columna nullable sin necesidad.)

**`ON DELETE CASCADE`, a diferencia del `ON DELETE SET NULL` de `paciente_fuentes`.** La asimetría
es deliberada y conviene dejarla escrita: en `paciente_fuentes` la fila huérfana **es** la tumba
que evita que un import futuro recree un paciente borrado a mano. Un teléfono huérfano no cumple
ninguna función equivalente — no identifica nada y no protege de nada.

RLS y `GRANT` siguen el patrón de la migración de pacientes: `has_module('medical')` generado
desde un `DO` block con el slug en una variable y el `RAISE EXCEPTION` si no existe
(ver `.claude/rules/base-de-datos.md`).

### 2. `pacientes.telefono_alt` se elimina

Era el parche para "una persona tiene dos números", que es exactamente lo que la tabla nueva
modela bien. Tener las dos cosas sería el mismo dato en dos lugares.

- **`pacientes.telefono` se queda** como el valor **principal**: lo que muestran las listas y
  contra lo que busca el buscador, sin join. La tabla nueva acumula **todo lo visto, incluido el
  principal**.
- **`pacientes.email` igual**: principal en la columna, todos en la tabla.

**Cuál de varios teléfonos queda como principal — dicho explícitamente, porque si no cada quien
asume otra cosa:**

- **Paciente nuevo:** gana el **primer valor no vacío en el orden de las columnas del archivo**
  — o sea `values.telefono[0]`, con el array armado en el orden en que el mapeo recorre las
  columnas (ver 2.b). Para eClinicalWorks eso es `Home Phone` antes que `Cell Phone`, por el orden
  en que vienen en la hoja. Es arbitrario y está bien que lo sea: los dos números quedan guardados
  igual, y el principal solo decide cuál se muestra primero.
- **Paciente que ya existía y YA tenía principal:** **no se toca**. El número entrante se suma
  como contacto. Es la misma regla de hoy —el existente gana— y se conserva a propósito: un import
  no debería cambiarle el teléfono de cabecera a un paciente que alguien ya venía usando.
- **Paciente que ya existía y tenía el principal VACÍO:** lo recibe. Es la regla general del spec
  anterior —los campos vacíos se rellenan con lo que trae la fila nueva— y sigue valiendo. Sin
  esta aclaración, "no se toca" leído literal congelaría el teléfono en `null` para siempre
  mientras la tabla de contactos se llena, que no es lo que nadie quiere. No es hipotético: con
  4.132 pacientes y datos parciales por fuente, pasa seguro.

**El momento es ahora o nunca barato.** `20260821212925_pacientes.sql` **no se pusheó a dev ni a
prod**. Sacar la columna hoy es un renglón; después de subir 4.132 pacientes es una migración de
datos con backup y precheck.

⚠️ **Ojo con el estado de la base local al aplicar esto.** Hoy local **no** está vacía: tiene
**287 pacientes, 284 identidades de eClinicalWorks y 42 filas con `telefono_alt` cargado**, de una
prueba manual de import. Un `DROP COLUMN telefono_alt` sobre ese estado **se lleva esos 42 valores
sin backfill**. No es grave —son datos de prueba y se reconstruyen reimportando la hoja, porque
`(fuente, clave_origen)` ya existe— pero hay que hacerlo a propósito y en este orden: aplicar la
migración, reimportar el archivo de prueba, y recién ahí verificar. Y el
`supabase/rollback/predump-*` que hay tomado es de cuando había **3** pacientes: correr
`deshacer-import-local.sh` con ese dump **borra los 287**. Tomar uno nuevo antes de tocar nada.

**La migración es nueva, no se edita la vieja.** `20260821212925_pacientes.sql` ya está aplicada
en local y commiteada: reescribirla desalinea el historial de la CLI, que en este repo ya es un
problema anotado.

**Consecuencia buena que hay que aprovechar:** la regla *"telefono_alt se apaga si coincide con
telefono"* (`pacienteImportPlan/index.ts:96`, la del "Home == Cell" que aparece en 199 de 241
filas de ECW) **se borra**. El `UNIQUE (paciente_id, tipo, valor, fuente)` hace ese trabajo en la
base. Es lógica de aplicación que pasa a ser una restricción — y era una de las que la revisión
por mutación marcó como no cubierta por ningún test.

### 2.b Varias columnas del archivo alimentando un mismo atributo

eClinicalWorks trae `Home Phone` **y** `Cell Phone`; eClinPro trae `Phone - Cell` y `Phone - Home`.
Las dos columnas son teléfonos del mismo paciente y las dos tienen que entrar.

**La raíz es una línea del motor compartido — pero el trabajo NO es de una línea.** La primera
versión de este spec decía "el problema es una línea", y la revisión tuvo razón en que esa frase
entierra el tamaño real: ver "Lo que `indexOf` rompe", más abajo. La raíz sí está acá:

```ts
// buildImportPlan/index.ts:22
mapping.forEach((col, idx) => {
  if (col) values[col] = coerce(col, (fila[idx] ?? '').trim())
})
```

`values` es un `Record`: **dos columnas apuntando al mismo campo se pisan, gana la última, en
silencio.** Eso ya pasa hoy y para cualquier campo. Es la razón por la que existe el
`telefonoUsado ? 'telefono_alt' : 'telefono'` de `pacienteFields/index.ts:63` — `telefono_alt`
nunca fue un concepto de dominio, nació para **esquivar esta colisión**.

**Un valor por celda, varias celdas por atributo.** Medido sobre las 5.072 filas: **cero** celdas
de teléfono o email traen dos valores adentro (un solo email con un separador, 1 de 478 — una coma
mal puesta). Así que **no** hace falta partir celdas; construirlo sería especulativo.

**El mecanismo: lo declara el catálogo, lo ejecuta el motor.**

```ts
export type ImportFieldDef = { column: string; labelKey: I18nKey; multi?: boolean }
```

```ts
mapping.forEach((col, idx) => {
  if (!col) return
  const v = coerce(col, (fila[idx] ?? '').trim())
  if (!esMulti(col)) { values[col] = v; return }      // igual que hoy
  const acc = (values[col] ??= []) as unknown[]
  if (v !== null && v !== '' && !acc.includes(v)) acc.push(v)
})
```

`buildImportPlan` recibe qué columnas acumulan (derivado de los `fieldDefs` por el módulo que lo
llama). **Research no declara ninguna**, así que nunca ve un array: la acumulación (2.b) no lo
toca.

**Pero el aviso de colisión de 2.c sí lo alcanza**, y la primera versión de este spec decía que
Research "no cambia" a secas. Es incondicional en el componente compartido, así que un CSV de
Research cuyos alias legacy (`CSV_ALIASES`) manden dos encabezados al mismo campo va a mostrar un
aviso que hoy no existe. Es la corrección que corresponde y no un problema: hoy ese CSV pierde una
columna en silencio.

Tres cosas se caen solas:

- **No hay ranuras numeradas.** Las dos columnas de ECW mapean a `telefono`, las dos. La pantalla
  de mapeo no necesita ningún casillero nuevo: hoy ya permite elegir el mismo destino dos veces,
  solo que uno se perdía.
- **El hack de `guessMapping` desaparece**: la segunda columna de teléfono mapea a `telefono`.
- **`.includes(v)` resuelve "Home == Cell"** (199 de 241 filas de ECW) en memoria, así que el
  resumen cuenta honesto. El `UNIQUE` de la base queda como red, no como mecanismo.

`values.telefono` pasa a ser `string[]` para los campos `multi`. `ImportPlan` no cambia de tipo
—ya es `Record<string, unknown>`—; los consumidores de Medical toman `[0]` como principal y el
array entero para los contactos.

#### Lo que `indexOf` rompe, y por qué esto no es quirúrgico

`pacienteImportPlan/index.ts` no le pasa el mapeo crudo al motor: intercala `augmentar()`. Y
**cuatro sitios** ubican la columna de teléfono con `mapping.indexOf(COL_TEL)`, que devuelve
**solo la primera** ocurrencia. En cuanto `Home Phone` y `Cell Phone` mapeen los dos a `telefono`
—que es exactamente lo que `multi: true` habilita— esos `indexOf` siguen viendo una sola columna.

El más peligroso es `detectPacienteAnomalies`: hoy valida el formato del teléfono recorriendo
`[iTel, iTelAlt]`. Al desaparecer `telefono_alt` y no reescribir el `indexOf`, **la validación de
la segunda columna deja de correr en silencio** — el paso 4 dejaría de marcar teléfonos inválidos
que hoy sí marca. Es una regresión muda, del mismo tipo que este proyecto ya cazó tres veces.

Los cuatro sitios (`augmentar`, `camposParaCandidato`, `detectPacienteAnomalies` y `PACIENTE_KEYS`)
pasan de "índice de una columna" a "lista de índices". No es opcional ni cosmético: sin eso el
cambio compila y pierde validaciones.

#### Dedup antes del upsert, o el lote aborta

Dos filas distintas del archivo que el matcheo fusiona al mismo paciente (`agruparPorId`, el caso
`MARIA GARCIA` / `MARIA G GARCIA`) pueden aportar **el mismo teléfono desde la misma fuente**. En
un solo `upsert` eso es dos veces la misma clave, y Postgres corta el lote entero:

```
ERROR 21000: ON CONFLICT DO UPDATE command cannot affect row a second time
```

Es el **mismo error** que ya rompió el lote de `pacientes` y que se arregló con `agruparPorId`.
`paciente_contactos` necesita su equivalente: deduplicar por `(paciente_id, tipo, valor, fuente)`
**en memoria**, antes de mandar el lote. El `UNIQUE` es la red, no el mecanismo — un `UNIQUE` no
te salva de mandarle dos filas iguales en el mismo comando.

#### El array no puede llegar crudo a la pantalla de comparación

`ImportModal` le pasa `entrante={m.values}` a `MergeCandidateRow` **antes** de que nada extraiga
el principal (`pacienteEntranteDe` corre recién en `onConfirm`). Su `fmt()` hace `String(v)`, así
que un array se vería como `"9547060773,3055550101"` — y la comparación contra el candidato, que
sí es escalar, marcaría **distinto** casi siempre. Justo en el paso donde una persona decide si
dos registros son la misma. El pegamento de Medical resuelve el principal antes de armar
`m.values` para el paso 5.

### 2.c Colisión en un campo que NO es multivaluado

La otra mitad del mismo bug, que **existe hoy**: si alguien mapea dos columnas a `nombre`, una se
descarta sin decir nada. Es la regla del spec anterior otra vez —**nada se descarta sin aparecer
en una de esas líneas**— y acá se rompe en silencio.

El modal avisa cuando dos columnas del archivo apuntan al mismo campo **no** multivaluado, con las
dos columnas nombradas. No lo bloquea: puede ser deliberado. Pero lo dice.

### 3. `paciente_fuentes.dob_origen` — lo contradictorio

Una columna al lado de `nombre_origen`, que ya hace exactamente esto para el nombre: guardar
**qué dijo cada sistema**, en crudo.

```sql
ALTER TABLE public.paciente_fuentes
  ADD COLUMN IF NOT EXISTS dob_origen text;
```

Es `text` y no `date` a propósito: guarda **el valor crudo tal como vino** —un serial de Excel,
un texto, o basura— porque el punto es poder reconstruir qué decía el archivo, no tener una fecha
válida. Una fecha ilegible es justamente el caso que hay que poder investigar.

Con esto queda registrado *"eClinicalWorks dijo una fecha, eClinPro dijo otra"* — la evidencia
para decidir si fue una fusión correcta con una fecha mal cargada, o dos personas mal unidas.

### 3.b El gate del DOB se abre por teléfono — corrección de la revisión

**La primera versión de este spec prometía algo imposible.** Decía que los 76 casos iban a
aparecer como choque en el resumen del paso 6. No pueden: `candidatos()` tiene un gate absoluto
en `pacienteIdentity/index.ts:211`:

```ts
for (const paciente of pacientes) {
  if (paciente.fecha_nacimiento !== fila.fecha_nacimiento) continue   // ← DOB idéntico o nada
```

El filtro corre **antes** de mirar el nombre y vale igual para `exacta` y para `parcial`. Dos
filas con fechas distintas nunca son candidatas, nunca llegan a `fusionar()`, nunca generan un
choque. `dob_origen` sí quedaría grabado, pero solo alcanzable por una consulta SQL a mano.

**Y eso destapa un problema más grande que este spec: los 76 casos hoy entran como 76 pares de
pacientes duplicados.** No es una promesa incumplida a futuro — es duplicación que el import
produce ahora, en el registro real.

**El cambio:** cuando el núcleo del nombre coincide **y comparten al menos un teléfono**, hay
candidato **`parcial`** aunque el DOB difiera.

- **`parcial`, nunca `exacta`.** `exacta` sigue siendo nombre + DOB, y sigue viniendo pre-marcada.
  Un candidato por teléfono llega **sin marcar**: el sistema propone, la persona decide. Es la
  regla del spec anterior, aplicada al caso donde más falta hace.
- **El teléfono compartido es el que hace la diferencia**, y está medido: de los 135 núcleos con
  más de un DOB, **76 comparten teléfono** y **59 no**. Los 59 siguen siendo personas distintas y
  el matcheo hace bien en no tocarlos. Sin la condición del teléfono, el cambio fusionaría
  homónimos.
- **El riesgo que queda, dicho:** un padre y un hijo con el mismo nombre y el teléfono de casa.
  Caen como candidato **parcial sin marcar**, con las dos fechas enfrentadas en pantalla — que es
  exactamente la información que hace obvio que son dos personas. El diseño no lo resuelve solo;
  lo pone donde alguien lo ve.
- **No cambia el caso sin DOB.** `candidatos()` abre con `if (!fila.fecha_nacimiento) return []`
  y **eso se queda como está**: acá se abre el gate para filas que *tienen* DOB y no coinciden, no
  para las que no lo tienen. Ampliarlo a las 41 filas sin DOB es otra decisión, y no está en este
  alcance.

Recién con este cambio el choque de `fecha_nacimiento` se vuelve alcanzable, y el criterio de
verificación #4 deja de ser imposible.

### 4. `choques` deja de tirarse a la basura

`escribirImport` recibe hoy `{ paciente, choques }` y usa solo el primero.

- Los campos de contacto (`telefono`, `email`) **dejan de generar choque**: pasan a ser filas de
  `paciente_contactos`. No son un conflicto, son información.
- Lo que quede como choque real —hoy: `fecha_nacimiento` y `genero`— **tiene que llegar al
  usuario**: sale por `ResultadoEscritura` y se cuenta en el resumen del paso 6 del modal.

Esto es la regla del spec anterior aplicada a un caso que se le escapaba: **nada se descarta sin
aparecer en una de esas líneas**. Un choque descartado es un dato descartado.

### 5. El alta manual entra al mismo camino — hallazgo de la revisión

Sin esto, el bug original vuelve por la puerta de al lado. `PacienteModal` liga el input de
teléfono a `form.telefono` y guarda con un `.update(data)` crudo (`data/pacientes.ts`), **sin
pasar por `fusionar()` ni por `escribirImport`**. O sea: alguien corrige o cambia el teléfono de
un paciente a mano y **el anterior se pisa y se pierde**, que es literalmente el problema que este
spec existe para arreglar.

Al guardar, si el teléfono o el email cambian respecto de lo que había, **el valor viejo y el
nuevo quedan los dos en `paciente_contactos`** con `fuente = 'manual'`. El principal pasa a ser
el nuevo — acá sí, porque una edición a mano es una decisión explícita de una persona, a
diferencia de un import.

Se incluye en el alcance en vez de declararlo como deuda: dejar afuera justo el camino que
reproduce el bug original haría que el spec arregle el síntoma y no la causa.

---

## Qué se toca

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<nueva>.sql` | `tipo_contacto`, `paciente_contactos` + RLS/GRANT, `DROP COLUMN **IF EXISTS** telefono_alt`, `ADD COLUMN IF NOT EXISTS dob_origen` |
| `src/features/medical/types.ts` | `PacienteContacto`; sacar `telefono_alt` de `Paciente`; `dob_origen` en `PacienteFuente` |
| `src/features/medical/data/pacientes.ts` | listar y upsertear contactos |
| `src/features/medical/utils/pacienteIdentity/` | contacto deja de ser choque; `fusionar` devuelve además los contactos acumulados; **`candidatos()` abre el gate del DOB por teléfono compartido (3.b)** |
| `src/features/medical/components/PacienteModal` + `data/pacientes.ts` | el alta/edición manual escribe a `paciente_contactos` (§5) |
| `src/shared/import/MergeCandidateRow/` | el paso 5 no puede recibir un array crudo |
| `src/features/medical/demo-data.ts` | saca `telefono_alt` de los 8 literales tipados como `Paciente` |
| `src/shared/import/buildImportPlan/` | acumular en vez de pisar cuando el campo es `multi` |
| `src/shared/import/ImportModal/` | `ImportFieldDef.multi`; avisar colisión en campo no-multi |
| `src/features/medical/utils/pacienteFields/` | `multi: true` en teléfono y email; sacar el hack de `guessMapping` |
| `src/features/medical/utils/pacienteImportPlan/` | borrar la regla Home==Cell; **los 4 `indexOf(COL_TEL)` pasan a lista de índices**; leer el array de contactos por fila |
| `src/features/medical/utils/escribirImport/` | escribir `paciente_contactos` **dedupeando el lote en memoria**; propagar `choques` a `ResultadoEscritura` |
| `src/features/medical/components/` | el detalle del paciente muestra los contactos con su procedencia; el resumen del import cuenta los choques |
| `src/shared/i18n/locales/{es,en}.json` | claves nuevas, en los dos idiomas |

## Verificación

Además de `pnpm typecheck && pnpm test && pnpm build:check`:

1. **Contra el archivo real, en local.** Es la única prueba que ejercita los 681 casos. Después
   del import: `SELECT count(*) FROM paciente_contactos WHERE tipo='telefono'` tiene que ser
   **mayor** que el número de pacientes, y ningún paciente puede quedar sin al menos un contacto
   si su fila traía teléfono. Deshacer con `supabase/rollback/deshacer-import-local.sh`.
2. **Reimportar el mismo archivo no debe crear contactos nuevos.** El `UNIQUE` lo garantiza en la
   base; el test comprueba que la aplicación no lo intente igual y falle.
3. **El caso "Home == Cell"** (199 de 241 filas de ECW): tiene que producir **un** contacto, no
   dos, ahora sin código que lo fuerce.
4. **Un choque de DOB visible** — alcanzable solo con el cambio de 3.b: importar dos filas del
   mismo nombre, **mismo teléfono** y fechas distintas, y comprobar que (a) aparece como candidato
   **parcial y sin marcar**, (b) al fusionarlo el resumen del paso 6 cuenta el choque, y (c)
   `dob_origen` quedó guardado en las dos filas de `paciente_fuentes`. Con el gate viejo este caso
   ni siquiera generaba candidato.
5. **Que 3.b no fusione homónimos**: dos filas del mismo nombre con fechas distintas y **teléfonos
   distintos** tienen que seguir siendo dos pacientes, sin candidato. Son los 59 casos medidos.
6. **El alta manual acumula**: editar el teléfono de un paciente desde `PacienteModal` y comprobar
   que el anterior quedó en `paciente_contactos` con `fuente = 'manual'`, y que el principal pasó
   a ser el nuevo.
7. **Un contacto manual repetido no duplica**: guardar dos veces el mismo teléfono a mano tiene que
   dejar **una** fila. Es el caso que el `UNIQUE` con `fuente = NULL` no cubría.

## Lo que este diseño NO hace

- **No resuelve las contradicciones, las expone.** Con 3.b el caso llega a la pantalla como
  candidato parcial y el choque se cuenta, pero nadie puede decir desde la UI "esta fecha es la
  correcta": la que gana sigue siendo la del paciente existente. Elegir la buena es otro trabajo.
- **No abre el matcheo a las filas sin DOB.** `candidatos()` sigue devolviendo `[]` cuando la fila
  no trae fecha. Las 41 filas sin DOB del archivo se siguen reconociendo solo por
  `(fuente, clave_origen)`, como hasta ahora.
- **No deshace una fusión equivocada.** Deja la evidencia para diagnosticarla. Separar dos
  pacientes mal unidos es una operación distinta y no está en este alcance.
- **No hace multivaluados a dirección, seguro ni alergias.** Cuando alguno empiece a llegar por un
  import o a cargarse a mano dos veces, se agrega `tipo` al dominio y entra en la misma tabla —
  que es la ventaja de que `tipo_contacto` sea un `DOMAIN` con nombre.
