# Registro de pacientes — tabla real + import de eClinicalWorks / eClinPro / eMedicalPractice

**Fecha:** 2026-08-21
**Rama:** `feat/estructura-organizacional` (sin mergear)
**Módulo:** `medical`
**Archivo origen:** `EMINAT PT REGISTRY - ECW, ECLINPRO, EMED.xlsx` — 3 hojas, 5.072 filas

## Problema

El módulo Medical **no toca la base**. `useMedicalData` monta `generateDemoData()` en memoria,
no hay tabla `pacientes` en ninguna migración, y `addPaciente` escribe a un `useState`: crear un
paciente y recargar la página lo borra.

Al mismo tiempo hay un registro real de ~5.000 pacientes repartido en tres sistemas clínicos
distintos, en un Excel de tres hojas, que hoy no tiene forma de entrar al sistema.

Research ya resolvió el import genérico —parser de texto delimitado, mapeo de headers,
plan de insert/update, preview con resumen— pero apunta a una tabla real con RLS, que es
justamente lo que Medical no tiene.

Este spec cubre las dos mitades: la tabla y el import.

## Perfil del archivo (medido, no supuesto)

Las tres hojas son tres sistemas con tres formatos:

| | eClinicalWorks | eClinPro | eMedicalPractice |
|---|---|---|---|
| Filas | 285 | 3.521 | 1.266 |
| Nombre | `APELLIDO,NOMBRE` (285/285) | `Nombre - Apellido` (3.105) **o sin separador (416)** | `First Name` + `Last Name` |
| DOB | 285 | 3.480 (**41 vacías**) | 1.266 |
| Teléfono | 2 columnas, formato limpio | 2 columnas, notación científica | 1 columna, notación científica |
| Sexo | `M` / `F` | *(no trae)* | `Male` / `Female` |
| Email | 225 (78%) | 478 (**13%**) | 494 (39%) |
| ID propio | — | — | `Chart#`, 1.266 únicos |

**Total:** 5.072 filas, 5.031 con fecha de nacimiento.

### Anomalías que el import tiene que resolver

Ninguna es hipotética; todas salen de contar el archivo.

1. **416 nombres de eClinPro sin separador.** 100 de 2 palabras, 206 de 3, 97 de 4, 13 de 5+.
   `Dalia Tellez` parte bien; `Maria Elena Aranguren` y `Katia D Triana Perez` no.
2. **158 filas con anotaciones dentro del nombre.** 157 con `DUPLICADO ROCHE` pegado al
   apellido, y `Formato visitas no borrar - Prueba`, que no es un paciente. Más `1Reinier - t`,
   la única fila con dígitos en el nombre.
3. **4 fechas de nacimiento en el futuro:** `2067-09-28`, `2068-10-06`, `2067-07-23`,
   `2062-11-21`. Error de siglo al tipear.
4. **41 filas sin fecha de nacimiento** (eClinPro).
5. **30 teléfonos que no dan 10 dígitos**, incluido un `0.0` y cuatro de 11 dígitos con
   prefijo `1`. 4.673 de 4.717 vienen en notación científica (`9.547060773E9`).
6. **En eClinicalWorks, Home y Cell son el mismo número en 199 de 241 filas.**
7. **Emails compartidos entre pacientes distintos** — 7 en ECW, 4 en eClinPro, 6 en eMed.
   Son familias: el email **no puede llevar `UNIQUE`**.
8. **Todas las fechas vienen como serial de Excel** (`39872.0`), no como fecha.

### Duplicados reales

Con la clave por conjunto de partes del nombre + fecha de nacimiento, contando personas que
aparecen en más de una fuente:

```
coincidencia exacta (mismo conjunto de partes + DOB) ......... 726
coincidencia por 1er nombre + 1er apellido + DOB ............. 876
──────────────────────────────────────────────────────────────────
solo detectables contemplando nombres/apellidos compuestos ... 164
duplicados internos de una misma hoja ........................ 45  (ECW 1 · eClinPro 44)
```

Los 164 son el patrón cubano-venezolano: un sistema guarda el segundo nombre o el apellido
materno y otro no.

```
1964-09-13   ecw: rosa elvira / ardila de delgado
             eclinpro: rosa / ardila
             emed: rosa / ardila de delgado

1990-09-02   ecw: dugleidys carolina / faneites milano
             emed: dugleidys / faneites
```

De los 164, en 78 varía el nombre de pila y en 120 el apellido. **Sin contemplarlos, 164
personas entran duplicadas y nadie pregunta nada.**

5.072 filas convergen a ~4.100–4.250 pacientes según cuántas parciales se acepten.

## Decisiones

### 1. Tabla real, no persistencia en memoria

Solo `pacientes`. Citas, logs HIPAA, incidentes y capacitaciones **siguen siendo demo** en
esta etapa. Motivo: es lo mínimo que hace que los 5.000 pacientes sobrevivan a un F5, y
mover el módulo entero es otro trabajo.

### 2. `paciente_fuentes` como tabla hija, no `fuentes text[]`

La primera versión fue un array de fuentes en el paciente — es lo que se pidió literalmente.
Tiene un agujero concreto: la clave de identidad es **nombre + fecha de nacimiento**, o sea
datos editables. Al corregir un apellido mal tipeado la clave cambia, el import del mes
siguiente no reconoce a esa persona, la crea de nuevo y **vuelve a preguntar por un duplicado
ya resuelto**.

Se arregla guardando con qué clave llegó cada fuente, no solo qué fuentes tiene. Eso ya no es
un array: es una tabla hija, que además le da lugar al `Chart#` de eMedicalPractice y al
nombre original tal cual lo tenía cada sistema.

**Descartado:** `fuentes text[]` + `claves_origen text[]` en el paciente. Dos arrays que
tienen que mantenerse alineados por posición es peor que la tabla.

### 3. Sin tabla de excepciones para "no son la misma persona"

Cuando alguien decide que dos registros son personas distintas, se crea el paciente aparte.
Eso deja un paciente **de esa misma fuente con esa misma clave**, así que en el próximo import
la fila se reconoce a sí misma por `(fuente, clave_origen)` y actualiza sin preguntar.

La decisión queda registrada en el propio dato. No hace falta una lista de descartes que
alguien tenga que mantener.

### 4. `nombre` y `apellido` como texto libre — no se parte en cuatro columnas

Contemplar los nombres y apellidos compuestos **no** significa modelar
`primer_nombre` / `segundo_nombre` / `apellido_paterno` / `apellido_materno`.

- **Ninguna fuente trae el corte.** eMedicalPractice tiene un solo campo `Last Name` y adentro
  dice `ardila de delgado`.
- **No se puede derivar.** De los 196 apellidos multi-palabra de eMedicalPractice, 23 llevan
  partícula: `de la fuente`, `perez de goncalves`, `san jorge`, `de la vega`. Ahí el corte
  paterno/materno no es mecánico.
- Partirlo es **inventar un dato que el origen no tiene** — la misma clase de error que costó
  una fase entera de migración sacar de `responsable_ref`.

Lo compuesto se contempla donde importa: en el **matcheo** (§ Identidad) y en `nombre_origen`,
que preserva la cadena original por si el corte hace falta después.

### 5. `Age` no se guarda

eClinicalWorks trae `17 Y 5 M`. Es un atributo derivado de `fecha_nacimiento` y se calcula al
mostrarlo. Una columna que codifica un dato que ya existe por separado se desincroniza sola.

### 6. El import va por la UI, no por seed

Coherente con la regla del repo: un seed escribe filas que ningún formulario podría producir y
esconde los agujeros de la UI. El modal de import **es** la funcionalidad, no el andamio.

## Esquema

```sql
-- pnpm supabase migration new pacientes  →  supabase/migrations/<timestamp>_pacientes.sql

-- Los enums, declarados aparte y con nombre. Nombrados por lo que representan, no por
-- dónde se usan: `estado_paciente` sigue sirviendo cuando lo use una segunda tabla.
CREATE DOMAIN public.genero AS text
  CHECK (VALUE IN ('M','F','NB','ND'));
CREATE DOMAIN public.estado_paciente AS text
  CHECK (VALUE IN ('activo','inactivo','alta'));
CREATE DOMAIN public.fuente_paciente AS text
  CHECK (VALUE IN ('ecw','eclinpro','emed','manual'));

CREATE SEQUENCE public.pacientes_mrn_seq;

CREATE TABLE public.pacientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn               text UNIQUE NOT NULL
                      DEFAULT 'MRN-' || to_char(now(), 'YYYY') || '-' ||
                              lpad(nextval('public.pacientes_mrn_seq')::text, 5, '0'),
  nombre            text NOT NULL,
  apellido          text NOT NULL,
  fecha_nacimiento  date,
  genero            public.genero,
  telefono          text,
  telefono_alt      text,
  email             text,              -- SIN unique: hay familias que comparten correo
  seguro            text,
  seguro_id         text,
  direccion         text,
  estado            public.estado_paciente NOT NULL DEFAULT 'activo',
  alergias          text,
  condiciones       text,
  notas             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.paciente_fuentes (
  paciente_id   uuid NOT NULL REFERENCES public.pacientes(id) ON DELETE CASCADE,
  fuente        public.fuente_paciente NOT NULL,
  clave_origen  text NOT NULL,     -- identificador estable DE ESA FUENTE (ver § Identidad)
  nombre_origen text,              -- la cadena tal cual la tenía ese sistema
  ref_externa   text,              -- Chart# de eMedicalPractice; null en las otras
  importado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fuente, clave_origen)
);
CREATE INDEX paciente_fuentes_paciente_id_idx ON public.paciente_fuentes(paciente_id);

CREATE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- El slug se declara UNA vez y las policies se generan, como en dynamic_roles.sql.
-- El RAISE es el guard que ahí falta: ver la nota de abajo.
DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['pacientes','paciente_fuentes'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING (public.has_module(%L))', tbl, slug);
  END LOOP;
END $$;
```

**Sin policy `admin_all`.** La versión anterior de este spec creaba las dos, y la segunda no
hace nada: `has_module()` **ya** abre con `SELECT public.is_admin() OR …`, así que el admin pasa
por `mod_access`. Una policy de más no es inocua — es una regla que alguien va a mantener, y que
sugiere que el acceso de admin depende de ella cuando no.

La policy es `FOR ALL` sin `WITH CHECK`, y eso es correcto acá: Postgres usa la expresión de
`USING` también para el `INSERT`, y `has_module()` no mira la fila, así que sirve igual para
leer y para escribir.

### Por qué el slug va en una variable y con `RAISE`

Repetir `'medical'` en cuatro policies no es solo ruido: **un slug mal escrito no falla, se
vuelve invisible**.

`role_modules.module_slug` es `text NOT NULL`, sin FK y sin tabla de catálogo detrás — no hay
nada en la base que valide un slug. Y `has_module()` abre con `SELECT public.is_admin() OR …`,
así que una policy que dijera `has_module('medial')` **devolvería `true` para el admin**. El
admin es exactamente quien escribe y prueba la migración: vería la tabla funcionando perfecto
mientras está invisible para todos los demás.

El `RAISE EXCEPTION` cierra eso sin agregar ninguna tabla: si el slug no existe en
`role_modules`, la migración aborta en el momento de aplicarse en vez de dejar dos tablas
mudas. Cuesta tres líneas.

**Lo que no arregla, y queda anotado:** falta un catálogo `modules` con FK desde
`role_modules.module_slug`. Está fuera de scope de este spec — toca la migración de roles
dinámicos, que ya está en producción.

**`PRIMARY KEY (fuente, clave_origen)` es la garantía de idempotencia:** una fila de
eClinicalWorks apunta a un solo paciente, para siempre. Reimportar el mismo archivo actualiza,
nunca duplica ni vuelve a preguntar.

**La clave NO incluye `paciente_id`, y eso es deliberado.** La primera versión de este spec
usaba `PRIMARY KEY (paciente_id, fuente)` — "un paciente tiene a lo sumo una identidad por
sistema". Es falso: eClinPro tiene **dos personas con la misma fecha de nacimiento cargadas dos
veces con el nombre invertido** (`everett c lee` / `lee c everett`, `dunlap lateju` /
`lateju dunlap`). Son dos cadenas crudas distintas, o sea dos claves distintas, o sea dos
identidades de la **misma** fuente para el mismo paciente — y la clave con `paciente_id` las
rechazaría al fusionarlas. Con la clave sobre `(fuente, clave_origen)` un paciente acumula
todas las identidades que haga falta, y sigue siendo imposible que una fila de origen apunte a
dos pacientes.

Son dos casos, no 44. El número de 44 duplicados internos que aparece más arriba mide otra
cosa —personas repetidas dentro de una hoja— y la mayoría de esos son la misma fila dos veces,
que es el problema de la sección que sigue.

### Colisiones dentro del mismo lote

**47 filas del archivo son literalmente la misma fila repetida:** misma cadena de nombre, misma
fecha de nacimiento. 46 en eClinPro y 1 en eClinicalWorks (`perez pereyra sol a|2004-04-12`).

Calculan la **misma `clave_origen`**, así que un insert directo del lote choca contra la
`PRIMARY KEY` y **aborta a mitad de camino**. No es un caso de fusión: no son dos personas ni
dos identidades, es el export que trae la fila dos veces.

El plan las colapsa **antes de escribir**: dos filas con la misma `clave_origen` son una sola,
se quedan con la primera y las diferencias entre ellas —si las hay— se listan en el paso 4 como
choque, igual que cualquier otro. El resumen las cuenta aparte, en su propia línea: "47 filas
repetidas en el archivo". Descartarlas en silencio sería exactamente lo que la lección de
Research prohíbe.

### Nombres de columna

- `paciente_id` — surrogate uuid, lleva `_id`.
- `fuente` — clave natural sana (legible, del catálogo cerrado, no codifica nada que exista
  por separado), va sin sufijo. Mismo criterio que `actividades.empresa`.

### Catálogos de dominio

Cada enum se declara **dos veces y en dos lugares**, y las dos mitades tienen que listar lo
mismo:

- En SQL, como `DOMAIN` con nombre —`public.genero`, `public.estado_paciente`,
  `public.fuente_paciente`— arriba de la tabla, en la misma migración. Fija **qué se puede
  guardar**. Nunca en la línea de la columna.
- En TypeScript, como objeto META en `src/features/medical/constants.ts`, con `labelKey` y
  color por valor, y su helper (`generoLabel(v, t)`, `fuenteLabel(v, t)`). Fija **cómo se ve**.

El canónico es `'M'`; lo que se muestra sale de i18n. La constante nunca se renderiza.

**Esto rompe el `GENEROS` actual** (`'Masculino'`, `'Femenino'`, `'No binario'`,
`'Prefiere no decir'`), que se renderizaba directo desde la constante. Hay que tocar
`PacienteModal`, `PatientRow` y `demo-data`. Es la misma corrección que se hizo en Stratix el
20/08/2026.

## Identidad y duplicados

### Clave por fuente (idempotencia)

`clave_origen` es **el identificador más estable que ofrezca esa fuente**, y se calcula sobre
el dato **crudo**, nunca sobre el interpretado:

| Fuente | `clave_origen` |
|---|---|
| `emed` | el `Chart#` **normalizado a entero** — 1.266 valores, todos únicos. Un ID de verdad |
| `ecw`, `eclinpro` | `norm(cadena cruda del nombre)` + separador + `fecha_nacimiento` |
| `manual` | el `id` del paciente — no hay sistema externo del que derivar una clave |

`norm` = minúsculas, sin acentos, sin puntuación, colapsando espacios.

**El `Chart#` se normaliza a entero, y no es un detalle cosmético.** Excel lo guarda como número
y llega `2.0`, no `2`. Si un parser devolviera `'2.0'` y otro `'2'`, la misma persona tendría dos
claves distintas y el import la duplicaría — sobre la columna que es la identidad, que es el peor
lugar posible para una ambigüedad de formateo. Se normaliza con `String(Math.trunc(Number(v)))`
y se testea.

**`manual` usa el `id` del paciente**, no una clave derivada del nombre: un paciente cargado a
mano no viene de ningún sistema, así que no hay cadena cruda que reconocer la próxima vez. Su
fila en `paciente_fuentes` existe para que el matcheo sepa que ese paciente ya tiene una
identidad propia y no le invente una.

**Sobre la cadena original, no sobre el nombre partido.** Esto importa: en el paso 4 la persona
puede corregir cómo se partió `Maria Elena Aranguren`. Si la clave saliera del resultado de esa
corrección, el import del mes siguiente calcularía una clave distinta para la misma fila y la
crearía de nuevo. La cadena cruda no cambia nunca, así que la fila se reconoce a sí misma sin
importar cómo se haya interpretado.

La fecha vacía se admite: la clave sigue siendo estable **dentro de esa fuente**, que es todo
lo que se necesita para reconocer la fila la próxima vez.

Si `(fuente, clave_origen)` ya existe → esa fila **es** ese paciente: actualiza, no pregunta.

### Clave de candidatos (fusión entre fuentes)

Solo corre para filas que no se reconocieron a sí mismas. Dos niveles:

| Nivel | Regla | En el modal |
|---|---|---|
| **Exacta** | mismo **conjunto** de partes de nombre + apellido, y mismo DOB | pre-marcada para fusionar |
| **Parcial** | mismo primer nombre + primer apellido + DOB, conjuntos distintos | **sin marcar**, decisión explícita |

El conjunto es insensible al orden y a en qué campo cayó cada parte. Eso también agarra las
filas invertidas: `AIDA,MARTINEZ` en eClinicalWorks contra `First: Martinez / Last: Aida` en
eMedicalPractice es la misma persona, y los dos sistemas la tienen dada vuelta.

**Las filas sin fecha de nacimiento no generan candidatos** — entran como pacientes nuevos.
Son 41 y quedan contadas en el resumen, no descartadas en silencio.

**No se afloja más que esto.** Hay 813 combinaciones de apellido + fecha de nacimiento con dos
o más personas distintas: con una clave más laxa el sistema fusionaría hermanos y mellizos.

### Qué pasa al fusionar

1. Se conserva lo que el paciente ya tiene. Un campo con valor nunca se pisa.
2. Los campos vacíos se rellenan con lo que trae la fila nueva.
3. Se agrega la fila en `paciente_fuentes`.
4. **El nombre más completo gana, pero solo si el corto es subconjunto del largo.**
   `ardila` → `ardila de delgado` sube, porque es estrictamente más información.
   `castillo araiz` vs `castillo arauz` no es subconjunto: se conserva el existente y el
   choque se lista.
5. Todo choque de valores se muestra en el resumen. Nada se resuelve en silencio.

## El flujo del import

```
1  ARCHIVO      .xlsx (SheetJS) o CSV (delimited.ts, sin cambios)
2  HOJA         desplegable — solo aparece si el libro trae más de una
3  MAPEO        headers → columnas, auto-adivinado + columnas descartadas   ← ya existe
4  SANEAMIENTO  las filas con problema, editables o excluibles              ← nuevo
5  DUPLICADOS   exactas pre-marcadas · parciales sin marcar                 ← nuevo
6  RESUMEN      N nuevos · N fusionados · N actualizados · N excluidos
```

**Paso 2.** Va de a una hoja por vez, y no es una limitación: las tres tienen headers
distintos, así que cada una necesita su propio mapeo.

**Paso 4 — saneamiento.** No es un validador genérico: son los cuatro problemas medidos de
este archivo. Nombre partido de forma ambigua, fecha de nacimiento futura o ausente, teléfono
que no da 10 dígitos, fila que no es un paciente. Cada una muestra el valor crudo al lado del
interpretado, y se corrige en línea o se excluye.

La anotación `DUPLICADO ROCHE` se saca del apellido y se guarda en `notas` — no se descarta en
silencio. `Formato visitas no borrar - Prueba` no se importa.

**`telefono_alt` queda `null` si es igual a `telefono`.** En eClinicalWorks, Home y Cell son el
mismo número en 199 de 241 filas: copiarlo en las dos columnas inventaría un segundo teléfono
que no existe, y después alguien lo llamaría creyendo que probó dos vías.

Ninguna fila del archivo deja `nombre` o `apellido` vacíos con las tres reglas de parseo — lo
verifiqué sobre las 5.072. Aun así el paso 4 marca la fila si alguna queda vacía, porque las dos
columnas son `NOT NULL` y un archivo futuro no tiene por qué parecerse a este.

**Paso 5 — dos listas.** Arriba las exactas con contador y "desmarcar todas"; abajo las
parciales, sin marcar, con las dos filas enfrentadas para comparar.

**Paso 6.** El resumen cuenta filas y **también** lo que se dejó afuera, por categoría. La
lección de Research: un resumen que dice "3 a actualizar" mientras se descartaba media tabla
es peor que no tener resumen.

### Escritura

El plan se calcula entero antes de escribir nada: el paso 6 muestra el resultado final, no una
estimación. Después se escribe en lotes de ~500 contra Supabase, bajo RLS.

**No hay transacción, así que la escritura tiene que ser reanudable.** Son ~10 lotes por HTTP:
si el séptimo falla —timeout, corte de red, RLS— quedan 3.500 pacientes escritos y ninguna
forma de saber dónde cortó. Reintentar el archivo entero con un `INSERT` pelado chocaría contra
la `PRIMARY KEY` de todo lo ya escrito y volvería a abortar, esta vez en el lote 1.

La salida no es una transacción que no existe: es que **reintentar sea inofensivo**. Cada lote
va como `upsert` sobre `paciente_fuentes` con `onConflict: 'fuente,clave_origen'`, que es la
misma propiedad de idempotencia que ya tiene el import a nivel archivo, aplicada a nivel lote.
Un reintento reescribe lo que ya estaba y sigue por donde iba.

El orden importa: primero `pacientes` con `.select('id')` para recuperar los uuid generados,
después `paciente_fuentes` con esos ids. Un corte entre las dos mitades deja pacientes sin
identidad de origen — que el reintento arregla, porque el matcheo los encuentra por nombre+DOB
y les completa la fila que falta en vez de duplicarlos.

## Estructura de archivos

```
src/shared/import/
  parseWorkbook/     index.ts + index.test.ts      xlsx → { hojas[], headers, rows }
  buildImportPlan/   index.ts + index.test.ts      el de Research, identidad parametrizada
  ImportModal/       index.tsx + index.module.css  ← pasa a CSS Modules al mudarse
  SheetPicker/  SanitizeRow/  MergeCandidateRow/   las filas del .map, cada una su carpeta

src/features/research/
  utils/fields.ts                                  aporta LEAD_FIELD_DEFS + identidad por NCT#

src/features/medical/
  utils/normalizers/     index.ts + index.test.ts  serial→fecha, teléfono, género, limpiar nombre
  utils/pacienteIdentity/index.ts + index.test.ts  parseo por fuente, clave, matcheo, fusión
  utils/pacienteFields.ts                          PACIENTE_FIELD_DEFS
  data/pacientes.ts                                lectura/escritura Supabase
  hooks/usePacientes.ts
```

El componente compartido **no importa nada de `src/features/`**. Lo específico de cada archivo
vive en el `normalize` de su catálogo de campos: `APELLIDO,NOMBRE` y `Nombre - Apellido` se
parten ahí, el serial `39872` se convierte ahí, y `9.547060773E9` vuelve a ser teléfono ahí.

Al mudarse a `src/shared/`, `ImportModal` pasa a CSS Modules: hoy es todo `style={{}}` contra
`RESEARCH_THEME`, y en compartido no puede seguir importando el tema de Research.

Todo texto nuevo usa `useT()` con su clave en `es.json` **y** `en.json`, incluidos los mensajes
de error y de éxito.

## Tests

Obligatorios: los normalizadores y la identidad cuentan filas y deciden qué entra en un total.
Los casos salen del archivo real, no se inventan:

| Caso | Entrada | Esperado |
|---|---|---|
| Serial de Excel | `39872.0` | `2009-02-28` |
| Fecha futura | `2068-10-06` | marcada, no importada en silencio |
| Sin fecha | `''` | clave válida, sin candidatos |
| Notación científica | `9.547060773E9` | `(954) 706-0773` |
| Teléfono corto | `7.868181E8` | marcado, no truncado |
| Teléfono basura | `0.0` | marcado |
| Home == Cell | `879-657-8892` en las dos columnas | `telefono_alt` queda `null`, no se duplica |
| Chart# de Excel | `2.0` | `'2'` — nunca `'2.0'` |
| Fila repetida en el archivo | dos filas con la misma cadena y el mismo DOB | una sola, contada como repetida |
| Reintento de un lote | reescribir un lote ya escrito | upsert, sin violación de PK |
| Nombre ECW | `ACEBEY,JONATHAN` | apellido `Acebey`, nombre `Jonathan` |
| Nombre ECP con separador | `Javier - Andrade` | nombre `Javier`, apellido `Andrade` |
| Nombre ECP sin separador | `Maria Elena Aranguren` | marcado como ambiguo |
| Anotación | `Gustavo - Gonzalez DUPLICADO ROCHE` | apellido `Gonzalez`, nota `DUPLICADO ROCHE` |
| Fila que no es paciente | `Formato visitas no borrar - Prueba` | excluida |
| Género | `M` / `Male` / `Femenino` | `M` / `M` / `F` |
| Match exacto | `rosa / ardila de delgado` vs `ardila de delgado, rosa` | exacta |
| Match parcial | `rosa / ardila` vs `rosa elvira / ardila de delgado` | parcial |
| Homónimos | mismo apellido + DOB, nombre distinto | **no** es candidato |
| Idempotencia | reimportar la misma hoja | 0 nuevos, 0 preguntas |
| Idempotencia tras corregir | corregir un nombre ambiguo en el paso 4 y reimportar | 0 nuevos: la clave sale del crudo |
| Fusión de nombre | `ardila` + `ardila de delgado` | gana el largo |
| Fusión con choque | `castillo araiz` + `castillo arauz` | gana el existente, choque listado |

Verificación antes de dar nada por terminado: `npx tsc --noEmit`, `npx vitest run`,
`pnpm build:check` (nunca `next build` con el dev server levantado), y abrir el import en el
navegador con una hoja de prueba.

## Migración y despliegue

**Local:** `pnpm supabase migration up`. Nunca `db reset` — `config.toml` apunta `sql_paths` a
un `seed.sql` que no existe.

**Antes del push a dev o prod:** el backup cubre cero tablas porque las dos son nuevas y no hay
`SET NOT NULL` sobre datos existentes que pueda abortar a mitad de camino. **El paso no se
omite: se resuelve en vacío, y queda dicho.** Lo que sí lleva verificación es la corrida
posterior: conteo de filas, que la `PRIMARY KEY (fuente, clave_origen)` esté, y que las policies
respondan **desde una sesión que no sea admin** — con un usuario admin, `has_module()` devuelve
`true` por el short-circuit y la verificación no prueba nada.

### PHI: el archivo real va solo a producción

Son 5.072 personas con nombre, fecha de nacimiento, teléfono y correo, y el módulo tiene una
pestaña HIPAA al lado. La base `development` es una org free de Supabase.

**El archivo real se importa únicamente en producción.** Local y dev se prueban con un recorte
inventado que reproduzca las anomalías (nombres de los tres formatos, un serial, un teléfono
en notación científica, un duplicado exacto y uno parcial).

## Fuera de scope

- **Citas, logs HIPAA, incidentes y capacitaciones** siguen siendo demo.
- **Deshacer una fusión.** Hoy la salida es editar el paciente y crear el otro a mano. La
  tabla lo permite (basta borrar la fila de `paciente_fuentes`), pero no hay UI.
- **Export de pacientes.** Research lo tiene; acá no se pide todavía.
- **Deduplicar contra pacientes cargados a mano.** La fuente `manual` participa del matcheo
  igual que las otras, pero no hay un barrido retroactivo.
- **Búsqueda por similitud fonética** (Soundex, trigramas). Los dos niveles de clave cubren lo
  medido; agregar fuzzy sin un caso que lo pida es inventar recall que nadie verificó.

## Avisos (`.todo/TODO.md`)

1. **Medical deja de mostrar los 8 pacientes demo.** La pestaña Pacientes arranca vacía hasta
   el primer import.
2. **Las citas siguen siendo demo y hablan de gente que ya no está en la tabla.** Guardan
   `paciente_nombre` adentro, así que se siguen viendo, pero el detalle de un paciente real no
   va a mostrar citas. Deuda aceptada a sabiendas.
3. **`GENEROS` cambia de valores canónicos** (`'Masculino'` → `'M'`). Quien tenga un filtro o
   una vista apoyada en el texto viejo la va a ver vacía.
