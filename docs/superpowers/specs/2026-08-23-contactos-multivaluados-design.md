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
  fuente       public.fuente_paciente,   -- NULL = lo cargó una persona, no un import
  clave_origen text,                     -- qué fila de ese sistema lo trajo
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

- **Paciente nuevo:** gana la **primera ranura de mapeo con valor** (`telefono`, y si vino vacía,
  `telefono_2`). Es arbitrario, y está bien que lo sea: los dos números quedan guardados igual, y
  el principal es solo cuál se muestra primero.
- **Paciente que ya existía:** **no se toca**. El principal sigue siendo el que tenía; el número
  entrante se suma como contacto. Es la misma regla de hoy —el existente gana— y se conserva a
  propósito: un import no debería cambiarle el teléfono de cabecera a un paciente que alguien ya
  venía usando.

**El momento es ahora o nunca barato.** `20260821212925_pacientes.sql` **no se pusheó a dev ni a
prod**. Sacar la columna hoy es un renglón; después de subir 4.132 pacientes es una migración de
datos con backup y precheck.

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

**El problema es una línea, y no es de Medical.** En el motor compartido:

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
llama). **Research no declara ninguna**, así que nunca ve un array y su comportamiento no cambia.

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

Con esto, los 76 casos quedan reconstruibles: *"eClinicalWorks dijo una fecha, eClinPro dijo otra,
y coinciden en el teléfono"* — que es la evidencia para decidir si fue una fusión correcta con una
fecha mal cargada, o dos personas distintas mal unidas.

### 4. `choques` deja de tirarse a la basura

`escribirImport` recibe hoy `{ paciente, choques }` y usa solo el primero.

- Los campos de contacto (`telefono`, `email`) **dejan de generar choque**: pasan a ser filas de
  `paciente_contactos`. No son un conflicto, son información.
- Lo que quede como choque real —hoy: `fecha_nacimiento` y `genero`— **tiene que llegar al
  usuario**: sale por `ResultadoEscritura` y se cuenta en el resumen del paso 6 del modal.

Esto es la regla del spec anterior aplicada a un caso que se le escapaba: **nada se descarta sin
aparecer en una de esas líneas**. Un choque descartado es un dato descartado.

---

## Qué se toca

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<nueva>.sql` | `tipo_contacto`, `paciente_contactos` + RLS/GRANT, `DROP COLUMN telefono_alt`, `ADD COLUMN dob_origen` |
| `src/features/medical/types.ts` | `PacienteContacto`; sacar `telefono_alt` de `Paciente`; `dob_origen` en `PacienteFuente` |
| `src/features/medical/data/pacientes.ts` | listar y upsertear contactos |
| `src/features/medical/utils/pacienteIdentity/` | contacto deja de ser choque; `fusionar` devuelve además los contactos acumulados |
| `src/shared/import/buildImportPlan/` | acumular en vez de pisar cuando el campo es `multi` |
| `src/shared/import/ImportModal/` | `ImportFieldDef.multi`; avisar colisión en campo no-multi |
| `src/features/medical/utils/pacienteFields/` | `multi: true` en teléfono y email; sacar el hack de `guessMapping` |
| `src/features/medical/utils/pacienteImportPlan/` | borrar la regla Home==Cell; leer el array de contactos por fila |
| `src/features/medical/utils/escribirImport/` | escribir `paciente_contactos`; propagar `choques` a `ResultadoEscritura` |
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
4. **Un choque de DOB visible**: importar dos filas de la misma persona con fechas distintas y
   comprobar que el resumen lo dice y que `dob_origen` quedó guardado en las dos filas de
   `paciente_fuentes`.

## Lo que este diseño NO hace

- **No resuelve las contradicciones, las registra.** Nadie va a poder decir desde la UI "esta
  fecha es la correcta" — eso es otro trabajo, y hasta que exista, la fecha que gana sigue siendo
  la del paciente existente.
- **No deshace una fusión equivocada.** Deja la evidencia para diagnosticarla. Separar dos
  pacientes mal unidos es una operación distinta y no está en este alcance.
- **No hace multivaluados a dirección, seguro ni alergias.** Cuando alguno empiece a llegar por un
  import o a cargarse a mano dos veces, se agrega `tipo` al dominio y entra en la misma tabla —
  que es la ventaja de que `tipo_contacto` sea un `DOMAIN` con nombre.
