# Registro de pacientes — tabla real + import de eClinicalWorks / eClinPro / eMedicalPractice

**Fecha:** 2026-08-21
**Rama:** `feat/estructura-organizacional` (sin mergear)
**Módulo:** `medical`
**Archivo origen:** `EMINAT PT REGISTRY - ECW, ECLINPRO, EMED.xlsx` — 3 hojas, 5.072 filas

> **Revisión 2** — este documento fue revisado por dos pasadas adversariales independientes
> (una contra el SQL ejecutado en Postgres local, otra contra el archivo real) que encontraron
> 32 defectos, cinco de ellos capaces de corromper datos en producción. Todos están aplicados.
> Los números de la revisión 1 estaban medidos con una regla de parseo defectuosa y **no son
> comparables** con los de acá.

## Problema

El módulo Medical **no toca la base**. `useMedicalData` monta `generateDemoData()` en memoria,
no hay tabla `pacientes` en ninguna migración, y `addPaciente` escribe a un `useState`: crear un
paciente y recargar la página lo borra.

Al mismo tiempo hay un registro real de ~5.000 pacientes repartido en tres sistemas clínicos
distintos, en un Excel de tres hojas, que hoy no tiene forma de entrar al sistema.

Research ya resolvió el import genérico —parser de texto delimitado, mapeo de headers, plan de
insert/update, preview con resumen— pero apunta a una tabla real con RLS, que es justamente lo
que Medical no tiene.

Este spec cubre las dos mitades: la tabla y el import.

## Perfil del archivo (medido, no supuesto)

| | eClinicalWorks | eClinPro | eMedicalPractice |
|---|---|---|---|
| Filas | 285 | 3.521 | 1.266 |
| Nombre | `APELLIDO,NOMBRE` (285/285) | `Nombre - Apellido` (3.105) **o sin separador (416)** | `First Name` + `Last Name` |
| DOB | 285 | 3.480 (**41 vacías**) | 1.266 |
| Teléfono | 2 columnas, formato limpio | 2 columnas, notación científica | 1 columna, notación científica |
| Sexo | `M` / `F` | *(no trae)* | `Male` / `Female` |
| Email | 225 (79%) | 478 (14%) | 494 (39%) |
| ID propio | — | — | `Chart#`, 1.266 únicos |

**Total:** 5.072 filas, 5.031 con fecha de nacimiento.

### Anomalías que el import tiene que resolver

Ninguna es hipotética; todas salen de contar el archivo.

1. **416 nombres de eClinPro sin separador**, y **312 de esos llevan la inicial del segundo
   nombre en segunda posición** (`SANDRA V NEGRETE`, `Katia D Triana Perez`). Una regla ingenua
   de "primer token = nombre, resto = apellido" mete la inicial dentro del apellido y rompe todo
   el matcheo — ver § Parseo del nombre.
2. **8 filas con encoding roto (mojibake UTF-8→latin-1):** `Yenni PeÃ±a`, `Maggie MuÃ±oz`,
   `Bethsabe EstupiÃ±an`, `Roberto PeÃ±a`, `Clara MuÃ±oz`, `Martin PeÃ±a`, `Julio PeÃ±a`,
   `Penelope PeÃ±a`. Siete tienen contraparte con el mismo DOB en otra hoja. Reparan limpio con
   `latin-1 → utf-8`.
3. **158 filas con anotaciones dentro del nombre.** 157 con `DUPLICADO ROCHE`, de las cuales
   **8 están en filas sin separador**, así que la anotación cae adentro del apellido junto con
   la inicial. Más `1Reinier - t`, la única fila con dígitos en el nombre.
4. **Dos filas que no son pacientes:** `Formato visitas no borrar - Prueba` (eClinPro) y
   **`T,TEMPLATES`** (eClinicalWorks, con DOB 1975-01-31, sexo M y un teléfono de Massachusetts
   — el único del archivo). La segunda pasa las tres reglas de parseo sin marcar nada.
5. **2.226 de 5.072 nombres están enteros en mayúsculas** (eClinPro 2.004, ECW 141, eMed 81) y
   7 enteros en minúsculas.
6. **4 fechas de nacimiento en el futuro:** `2067-09-28`, `2068-10-06`, `2067-07-23`,
   `2062-11-21`. Error de siglo al tipear.
7. **41 filas sin fecha de nacimiento**, todas en eClinPro.
8. **5.483 de 6.011 teléfonos vienen en notación científica** (`9.547060773E9`), y **30 no dan
   10 dígitos**: 23 de 9 dígitos, 4 de 11, 2 que son `0.0`, y **uno de 13** (`5.52199E12`, fila
   de `ELENA - GEZEL`). De los cuatro de 11 dígitos, **uno solo** tiene prefijo `1`
   (`17543678071`); los otros tres son un número válido con un dígito de más al final
   (`81370956960` = 813-709-5696 + `0`). Ver § Teléfonos: la regla obvia los rompe.
9. **En eClinicalWorks, Home y Cell son el mismo número en 199 de 241 filas.**
10. **Emails compartidos entre pacientes distintos** — 7 en ECW, 4 en eClinPro, 6 en eMed. Son
    familias: el email **no puede llevar `UNIQUE`**.
11. **Todas las fechas vienen como serial de Excel** (`39872.0`), no como fecha.
12. **186 apellidos multi-palabra en eMedicalPractice**, 26 con partícula (`de la fuente`,
    `perez de goncalves`, `san jorge`).

### Duplicados reales

Medido **con las reglas corregidas** de § Parseo y § Identidad (mojibake reparado, anotaciones
limpias, iniciales en el nombre, multiconjunto sin iniciales), contando personas que aparecen
en más de una fuente:

```
nivel EXACTO   (mismo multiconjunto de partes ≥2 letras + DOB) ....  805
nivel PARCIAL  (mismo primer nombre + primer apellido + DOB) ...... 1.023
──────────────────────────────────────────────────────────────────────────
que SOLO ve el parcial ...........................................  226
duplicados internos de una misma hoja ............................   47   (ECW 1 · eClinPro 44 · eMed 2)
filas literalmente repetidas .....................................   47
```

Fusionando solo lo exacto quedan **4.132 pacientes**; aceptando todas las parciales, ~3.900.

Los 226 del nivel parcial son el patrón cubano-venezolano —un sistema guarda el segundo nombre
o el apellido materno y otro no:

```
1964-09-13   ecw: rosa elvira / ardila de delgado
             eclinpro: rosa / ardila
             emed: rosa / ardila de delgado
```

**Con la regla de parseo de la revisión 1, 149 de estas personas no las agarraba ningún nivel**
y entraban duplicadas en silencio. El parseo corregido sube las exactas de 726 a 805.

## Decisiones

### 1. Tabla real, no persistencia en memoria

Solo `pacientes`. Citas, logs HIPAA, incidentes y capacitaciones **siguen siendo demo**. Es lo
mínimo que hace que los 5.000 pacientes sobrevivan a un F5; mover el módulo entero es otro
trabajo.

### 2. `paciente_fuentes` como tabla hija, no `fuentes text[]`

La primera versión fue un array de fuentes en el paciente. Tiene un agujero concreto: la clave
de identidad se apoya en el nombre, o sea en datos editables. Al corregir un apellido mal
tipeado la clave cambia, el import del mes siguiente no reconoce a esa persona, la crea de nuevo
y **vuelve a preguntar por un duplicado ya resuelto**.

Se arregla guardando con qué clave llegó cada fuente, no solo qué fuentes tiene. Eso ya no es un
array: es una tabla hija, que además le da lugar al `Chart#` y al nombre original de cada
sistema.

**Descartado:** `fuentes text[]` + `claves_origen text[]`. Dos arrays alineados por posición es
peor que la tabla.

### 3. Sin tabla de excepciones para "no son la misma persona"

Cuando alguien decide que dos registros son personas distintas, se crea el paciente aparte. Eso
deja un paciente **de esa misma fuente con esa misma clave**, así que en el próximo import la
fila se reconoce por `(fuente, clave_origen)` y actualiza sin preguntar.

La decisión queda registrada en el propio dato — **siempre que el dato sobreviva**, que es por
lo que el borrado no cascadea (§ Borrado).

### 4. `nombre` y `apellido` como texto libre — no se parte en cuatro columnas

Contemplar los nombres y apellidos compuestos **no** significa modelar
`primer_nombre` / `segundo_nombre` / `apellido_paterno` / `apellido_materno`.

- **Ninguna fuente trae el corte.** eMedicalPractice tiene un solo campo `Last Name` y adentro
  dice `ardila de delgado`.
- **No se puede derivar.** De los 186 apellidos multi-palabra de eMedicalPractice, 26 llevan
  partícula: `de la fuente`, `perez de goncalves`, `san jorge`. Ahí el corte no es mecánico.
- Partirlo es **inventar un dato que el origen no tiene** — la misma clase de error que costó
  una fase entera de migración sacar de `responsable_ref`.

Lo compuesto se contempla en el **matcheo** (§ Identidad) y en `nombre_origen`, que preserva la
cadena cruda por si el corte hace falta después.

### 5. `Age` no se guarda

eClinicalWorks trae `17 Y 5 M`. Es un atributo derivado de `fecha_nacimiento` y se calcula al
mostrarlo.

### 6. El import va por la UI, no por seed

Un seed escribe filas que ningún formulario podría producir y esconde los agujeros de la UI. El
modal de import **es** la funcionalidad, no el andamio.

### 7. Las enumeraciones van a un `DOMAIN` con nombre

`genero`, `estado` y `fuente` se declaran como `DOMAIN` arriba de la tabla, nunca en la línea de
la columna. Ver `.claude/rules/base-de-datos.md`.

## Esquema

```sql
-- pnpm supabase migration new pacientes  →  supabase/migrations/<timestamp>_pacientes.sql
--
-- IDEMPOTENTE: el workaround del repo cuando el historial de la CLI se desalinea es aplicar
-- el .sql por psql, así que todo objeto se crea con IF NOT EXISTS o dentro de un guard.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'genero') THEN
    CREATE DOMAIN public.genero AS text
      CONSTRAINT genero_valores CHECK (VALUE IN ('M','F','NB','ND'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_paciente') THEN
    CREATE DOMAIN public.estado_paciente AS text
      CONSTRAINT estado_paciente_valores CHECK (VALUE IN ('activo','inactivo','alta'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fuente_paciente') THEN
    CREATE DOMAIN public.fuente_paciente AS text
      CONSTRAINT fuente_paciente_valores CHECK (VALUE IN ('ecw','eclinpro','emed','manual'));
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.pacientes_mrn_seq;

CREATE TABLE IF NOT EXISTS public.pacientes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn               text UNIQUE NOT NULL
                      DEFAULT 'MRN-' || to_char(now() AT TIME ZONE 'America/New_York', 'YYYY')
                              || '-' || to_char(nextval('public.pacientes_mrn_seq'), 'FM000000'),
  nombre            text NOT NULL CONSTRAINT pacientes_nombre_no_vacio   CHECK (btrim(nombre)   <> ''),
  apellido          text NOT NULL CONSTRAINT pacientes_apellido_no_vacio CHECK (btrim(apellido) <> ''),
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

CREATE TABLE IF NOT EXISTS public.paciente_fuentes (
  -- NULL = tumba: la persona se borró a propósito y NO debe recrearse (ver § Borrado)
  paciente_id   uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  fuente        public.fuente_paciente NOT NULL,
  clave_origen  text NOT NULL,     -- identificador estable DE ESA FUENTE (ver § Identidad)
  nombre_origen text,              -- la cadena tal cual la tenía ese sistema
  ref_externa   text,              -- Chart# de eMedicalPractice; null en las otras
  importado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (fuente, clave_origen)
);
CREATE INDEX IF NOT EXISTS paciente_fuentes_paciente_id_idx
  ON public.paciente_fuentes(paciente_id);

CREATE OR REPLACE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON public.pacientes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- GRANTs explícitos. NO son opcionales: ver § Los GRANT.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes, public.paciente_fuentes
  TO authenticated, service_role;
GRANT USAGE ON SEQUENCE public.pacientes_mrn_seq TO authenticated, service_role;

-- El slug se declara UNA vez y las policies se generan, como en dynamic_roles.sql.
DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['pacientes','paciente_fuentes'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo % sin ningún rol asignado: o está mal escrito, o el admin '
                    'le quitó el módulo a todos los roles. Verificar antes de seguir.', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    -- El (SELECT …) NO es decorativo: fuerza un InitPlan. Ver § RLS por fila.
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING ((SELECT public.has_module(%L)))',
                   tbl, slug);
  END LOOP;
END $$;
```

### Los `GRANT`, y por qué local miente

`supabase/config.toml` tiene `auto_expose_new_tables` **comentado**, y su propio comentario dice
que sin ese flag *"new entities are NOT auto-exposed, matching the new cloud default"*.

En **local** la migración funciona igual, porque la base tiene *default privileges* heredados que
otorgan a `anon`/`authenticated`/`service_role`. En **dev y prod no**: cada request de PostgREST
devuelve `42501 permission denied for table pacientes`, y el `nextval` del MRN falla por falta de
`USAGE` sobre la sequence.

O sea: **todo el desarrollo y todo el QA pasan, y el módulo nace muerto en la nube.**
`20260624210414_dynamic_roles.sql` (líneas 128-129) ya hace los `GRANT` explícitos para sus dos
tablas; esta migración los copia. **No se granea a `anon`**: el default local le da hasta
`TRUNCATE`, que no pasa por RLS.

### RLS por fila: el `(SELECT …)` que multiplica por 575

`has_module()` es `STABLE SECURITY DEFINER` y hace un `EXISTS` con JOIN. Escrita pelada, el
planner la ejecuta **una vez por fila escaneada**. Medido en local con 5.000 filas:

```
USING (public.has_module('medical'))        → Filter: has_module(…)      195,4 ms
USING ((SELECT public.has_module('medical'))) → Filter: (InitPlan 1).col1   0,3 ms
```

El paréntesis fuerza un InitPlan y la función corre una sola vez. El patrón pelado se copió de
`dynamic_roles.sql`, donde no dolía porque `research_leads` tiene 35 filas; acá son 5.000 y
crece.

### El MRN

- `to_char(nextval(...), 'FM000000')` y **no** `lpad(…, 5, '0')`: `lpad` **trunca**, así que el
  paciente 100.000 recibiría el MRN del 10.000 y violaría el `UNIQUE`. Un MRN es un identificador
  de por vida; el error está escrito hoy aunque muerda en diez años.
- `now() AT TIME ZONE 'America/New_York'`: el servidor corre en UTC, así que `to_char(now(),'YYYY')`
  le pone `MRN-2027-…` a un alta del 31/12 a las 20:30 en Florida. Es el mismo bug que
  `codigo.md` prohíbe, reescrito en SQL.
- La sequence es **global y no se reinicia por año**, así que `MRN-2027-…` arranca donde quedó
  2026. El formato sugiere un contador anual que no existe; se acepta a sabiendas, porque el MRN
  solo necesita ser único.

### Sin policy `admin_all`

`has_module()` ya abre con `SELECT public.is_admin() OR …`, así que el admin pasa por
`mod_access`. Una policy de más no es inocua: es una regla que alguien mantiene y que sugiere
que el acceso de admin depende de ella.

La policy es `FOR ALL` sin `WITH CHECK`, y es correcto: Postgres copia la expresión de `USING` al
`WITH CHECK`, verificado rechazando `INSERT` y `UPDATE` con un rol `authenticated`.

### El guard del `RAISE`, y lo que no cubre

Valida que el slug tenga **algún rol asignado hoy**, no que sea válido — `role_modules` es data
que el admin edita desde `/admin`. Si le quitara `medical` al último rol que lo tiene, la
migración abortaría con el slug correcto. Por eso el mensaje nombra las dos causas.

Es el mejor guard disponible mientras no exista un catálogo `modules` con FK desde
`role_modules.module_slug` — anotado en `.todo/TODO.md`, fuera de scope porque toca la migración
de roles dinámicos, que ya está en producción.

### Borrado: `ON DELETE SET NULL`, no `CASCADE`

Con `CASCADE`, borrar un paciente se lleva sus filas de `paciente_fuentes` — que son el único
registro de "esta fila de origen ya se procesó". El próximo import no encuentra la clave y
**resucita a la persona** con MRN nuevo. Para 5.000 personas con PHI y una pestaña HIPAA al
lado, eso no puede pasar.

Con `SET NULL`, la fila sobrevive como **tumba**: `paciente_id IS NULL` significa "esto se borró
a propósito, no recrear". El import las cuenta en su propia línea del resumen —"N filas
correspondían a pacientes eliminados"— y no las toca.

### Nombres de columna

- `paciente_id` — surrogate uuid, lleva `_id`.
- `fuente` — clave natural sana, va sin sufijo. Mismo criterio que `actividades.empresa`.

### Catálogos de dominio

Cada enum se declara **dos veces y en dos lugares**, y las dos mitades listan lo mismo:

- En SQL, como `DOMAIN` con `CONSTRAINT` nombrado. Fija **qué se puede guardar**. El nombre del
  constraint es explícito porque el autogenerado (`genero_check`) hay que ir a buscarlo a
  `pg_constraint` para poder cambiar el dominio después.
- En TypeScript, como objeto META en `src/features/medical/constants.ts`, con `labelKey` y color
  por valor. Fija **cómo se ve**.

El canónico es `'M'`; lo que se muestra sale de i18n. La constante nunca se renderiza.

**Esto rompe el `GENEROS` actual** (`'Masculino'`, `'Femenino'`, …), que se renderizaba directo.
Hay que tocar `PacienteModal`, `PatientRow` y `demo-data`.

## Parseo del nombre

El orden **es** parte de la regla, porque cada paso condiciona al siguiente:

```
1  REPARAR ENCODING   'PeÃ±a' → 'Peña'   (latin-1 → utf-8, solo si el resultado es válido)
2  QUITAR ANOTACIÓN   'Gonzalez DUPLICADO ROCHE' → 'Gonzalez'   (a `notas`, no se descarta)
3  PARTIR             según la fuente
4  NORMALIZAR CAJA    'GONZALEZ ESPONDA' → 'Gonzalez Esponda'
```

**El paso 2 va antes del 3 y eso es load-bearing:** 8 de las 157 filas anotadas no tienen
separador, así que sin limpiar primero la anotación termina adentro del apellido
(`E Betancourt Alvarez DUPLICADO ROCHE`). Peor: el apellido anotado **contiene** al de su
contraparte, así que la regla de fusión lo promovería como "más completo" y guardaría
`MAESTRE DUPLICADO ROCHE`. Son 18 filas donde eso pasaría.

| Fuente | Regla |
|---|---|
| `ecw` | `APELLIDO,NOMBRE` — una sola coma en 285/285, ninguna parte vacía |
| `eclinpro` con `" - "` | `Nombre - Apellido` |
| `eclinpro` sin separador | nombre = primer token **+ las iniciales que le sigan**; apellido = desde el primer token de ≥2 letras |
| `emed` | columnas `First Name` / `Last Name` |

**La regla de las iniciales es la corrección más importante de esta revisión.** `SANDRA V NEGRETE`
tiene que dar nombre `Sandra V` y apellido `Negrete`; con "primer token = nombre, resto =
apellido" daba apellido `V Negrete`, y así **312 filas** quedaban con el apellido empezando en
una letra suelta. Eso rompía los dos niveles de matcheo a la vez —la inicial es un token extra
en el conjunto y es el "primer apellido" en el nivel parcial— y **149 personas entraban
duplicadas sin que nadie preguntara**.

Lo que la regla **no** resuelve: `Maria Elena Aranguren` sigue siendo ambiguo (¿`Maria` +
`Elena Aranguren` o `Maria Elena` + `Aranguren`?). Esas filas van al paso 4 del import para que
la persona decida.

**Normalización de caja:** 2.226 de 5.072 nombres están enteros en mayúsculas. Sin normalizar, la
tabla mostraría `GONZALEZ ESPONDA` al lado de `Gonzalez Esponda` según qué fuente cargó primero.
Se guarda en Title Case; la grafía original nunca se pierde, queda en `nombre_origen`.

## Teléfonos

`norm` de un teléfono: expandir la notación científica, quedarse con los dígitos, y **solo
entonces** decidir.

- **10 dígitos** → `(954) 706-0773`.
- **11 dígitos que empiezan en `1`** → sacar el `1`. Aplica a **uno solo** del archivo.
- **Cualquier otra longitud** → se guarda crudo y **la fila se marca en el paso 4**.

La regla que parecía obvia —"11 dígitos, sacar el primero"— **inventa teléfonos inválidos**: tres
de los cuatro de 11 dígitos son un número válido con un cero de más al final (`81370956960` =
813-709-5696 + `0`), y sacarles el primer dígito da `1370956960`, que no es un teléfono de nadie.
Por eso el default es marcar, no arreglar.

**`telefono_alt` queda `null` si es igual a `telefono`.** En eClinicalWorks son el mismo número
en 199 de 241 filas: duplicarlo inventaría una segunda vía de contacto, y alguien la llamaría
creyendo que probó dos.

## Identidad y duplicados

### Clave por fuente (idempotencia)

`clave_origen` es **el identificador más estable que ofrezca esa fuente**, calculado sobre el
dato **crudo**:

| Fuente | `clave_origen` |
|---|---|
| `emed` | el `Chart#` normalizado a entero — 1.266 valores, todos únicos |
| `ecw`, `eclinpro` | `norm(nombre crudo)` + `\|` + **el valor crudo de la celda de DOB** |
| `manual` | el `id` del paciente — no hay sistema externo del que derivar una clave |

`norm` = reparar mojibake, minúsculas, sin acentos, sin puntuación, espacios colapsados.
Verificado que **ningún nombre del archivo contiene `|`**, así que el separador es seguro.

**El `Chart#` se normaliza a entero.** Excel lo guarda como número y llega `2.0`, no `2`. Si un
parser devolviera `'2.0'` y otro `'2'`, la misma persona tendría dos claves — sobre la columna
que *es* la identidad. `String(Math.trunc(Number(v)))`, y se testea.

**El DOB entra crudo (`'39872'`), no interpretado (`'2009-02-28'`).** La revisión 1 usaba la
fecha resuelta y se contradecía sola: argumentaba tres veces que la clave sale del crudo "nunca
del interpretado", y la mitad de la clave *era* una interpretación. Con la fecha resuelta,
corregir una de las 4 fechas futuras en el paso 4 duplicaba al paciente en el import siguiente, y
cualquier bugfix en el conversor serial→fecha reclasificaba **las 5.031 filas con DOB de golpe**.

**Las filas sin DOB llevan el índice de fila al final de la clave.** Sin eso, dos homónimos sin
fecha calculan la misma clave y se funden sin que nadie opine: pasa de verdad con
`maitte ponce` y `teresa cabrera`, así que las 41 filas producirían 39 pacientes mientras el
resumen diría 41.

Si `(fuente, clave_origen)` ya existe → esa fila **es** ese paciente: actualiza, no pregunta.

### Colisiones dentro del mismo lote

**47 filas del archivo son la misma fila repetida** (46 en eClinPro, 1 en eClinicalWorks). Al
calcular la misma `clave_origen`, un insert directo choca contra la `PRIMARY KEY` y **aborta a
mitad de lote** — verificado: un upsert con la clave repetida da `ON CONFLICT DO UPDATE command
cannot affect row a second time`.

El plan las colapsa **antes de escribir**, y las cuenta en su propia línea del resumen.

**Pero 7 de las 47 no son idénticas: difieren en caja o acentos** (`NATHALIE - CEDEÑO` contra
`NATHALIE - CEDENO`, `JUAN CARLOS - PEREZ NOA` contra `Juan Carlos - Perez Noa`). Colisionan
recién después de `norm`. "Se queda la primera" elegiría el apellido por orden de archivo, así
que **la que conserva acentos gana**, y si las dos difieren en algo más que la caja la fila va al
paso 4 como choque.

### Clave de candidatos (fusión entre fuentes)

Solo corre para filas que no se reconocieron a sí mismas. **Se comparan multiconjuntos de tokens
de ≥2 letras** — las iniciales quedan afuera del núcleo comparable.

| Nivel | Regla | En el modal |
|---|---|---|
| **Exacta** | mismo multiconjunto de partes ≥2 letras, mismo DOB | pre-marcada para fusionar |
| **Parcial** | mismo primer nombre + primer apellido (ambos ≥2 letras) + DOB, núcleos distintos | **sin marcar**, decisión explícita |

**Multiconjunto y no conjunto.** Con conjuntos, `Hernandez Hernandez` y `Hernandez` son iguales,
así que `Hernandez Hernandez,Raul` (ECW) caía como **exacta pre-marcada** contra `Raul Hernandez`
de las otras dos fuentes — y la regla de fusión después promovía el apellido duplicado contra el
voto de 2 de 3. Pasa con `Sardina Sardina`, `Garcia Garcia` y 9 filas más con token repetido.
Con multiconjuntos esos grupos bajan a parcial, que es donde tienen que decidirse.

**Sin iniciales en el núcleo.** Es la otra mitad del arreglo del parseo: `Rosa F Martinez Amaro`
y `ROSA FRANCISCA MARTINEZ AMARO` no comparten el token `f`, pero sí el núcleo.

El multiconjunto es insensible al orden y a en qué campo cayó cada parte, así que también agarra
las filas invertidas: `AIDA,MARTINEZ` en eClinicalWorks contra `First: Martinez / Last: Aida` en
eMedicalPractice es la misma persona con los dos sistemas equivocados igual.

**Una exacta con teléfono Y email disjuntos NO se pre-marca: baja a parcial.** Son 4 grupos, y
son justo los que más merecen una mirada — dos registros cuya única evidencia de identidad es el
nombre y la fecha, con datos de contacto que no coinciden en nada:

```
MAYDELIN,FELIX  (ecw)   7868138344  raulalejandro.turbo@gmail.com
Felix Maydelin  (emed)  7868138344  raulalejandro.turbo@gmail.com
Maydelin Felix  (emed)  7864846208  maydelinfa@gmail.com          ← ¿otra persona?
```

**Las filas sin fecha de nacimiento no generan candidatos** — entran como pacientes nuevos, y se
cuentan en el resumen.

**No se afloja más que esto.** Hay **97 combinaciones de apellido + fecha con dos o más personas
distintas** (familias, mellizos): con una clave más laxa el sistema fusionaría hermanos. De los
40 grupos con primer nombre distinto, la mayoría son erratas de la misma persona
(`henry`/`hnery`, `jackeline`/`jacqueline`) y solo ~5 son candidatos plausibles a hermano —
`garcia laura/lucia 1989-01-09`, `patino mirna/vilma 1970-07-11`.

*(La revisión 1 decía 813. Ese número contaba **filas**, así que la misma persona presente en dos
hojas contaba como dos personas distintas. La conclusión no cambia; el número estaba 8× inflado.)*

### Qué pasa al fusionar

1. Se conserva lo que el paciente ya tiene. Un campo con valor nunca se pisa.
2. Los campos vacíos se rellenan con lo que trae la fila nueva.
3. Se agrega la fila en `paciente_fuentes`.
4. **El nombre se resuelve como UNA partición, no como dos campos independientes**, y solo se
   promueve el más completo si su núcleo (sin iniciales) contiene estrictamente al otro.
   `ardila` → `ardila de delgado` sube. `castillo araiz` vs `castillo arauz` no es subconjunto:
   gana el existente y el choque se lista.
5. Todo choque de valores se muestra en el resumen. Nada se resuelve en silencio.

**Por qué "una partición y no dos campos":** comparando nombre y apellido por separado, el
sistema promovía el más largo de cada lado sin mirar el otro, y las iniciales terminaban en los
dos:

```
ECW      'Candia,Maria F'   → nombre 'Maria F'  apellido 'Candia'
eClinPro 'MARIA F CANDIA'   → nombre 'MARIA'    apellido 'F CANDIA'
  resultado de la revisión 1:  "Maria F" / "F Candia"     ← la inicial duplicada
```

Son 10 grupos afectados, 8 con la inicial repetida en los dos campos.

## El flujo del import

```
1  ARCHIVO      .xlsx (SheetJS) o CSV (delimited.ts, sin cambios)
2  HOJA         desplegable — solo aparece si el libro trae más de una
3  MAPEO        headers → columnas, auto-adivinado + columnas descartadas   ← ya existe
4  SANEAMIENTO  las filas con problema, editables o excluibles              ← nuevo
5  DUPLICADOS   exactas pre-marcadas · parciales sin marcar                 ← nuevo
6  RESUMEN      por categoría, incluido todo lo que se dejó afuera
```

**Paso 2.** Una hoja por vez: las tres tienen headers distintos, así que cada una necesita su
propio mapeo.

**Paso 4 — saneamiento.** No es un validador genérico: son los problemas medidos de este archivo.

| Marca | Cuántas |
|---|---|
| Encoding roto (`Ã`, `Â`) | 8 |
| Nombre ambiguo (sin separador y sin inicial que lo resuelva) | ~104 |
| Fecha de nacimiento futura | 4 |
| Sin fecha de nacimiento | 41 |
| Teléfono que no da 10 dígitos ni 11-con-1 | 30 |
| Fila que no parece un paciente | 2 |
| `nombre` o `apellido` vacío tras el parseo | 0 hoy, se marca igual |

La detección de "no es un paciente" **no puede ser una lista de una cadena**: `T,TEMPLATES` pasa
las tres reglas de parseo sin marcar nada. Se marca cualquier fila con un token de 1–2 caracteres
en nombre o apellido, y la persona decide — `FE - PENA LOBAINA` sí es alguien.

**Paso 5 — dos listas.** Arriba las exactas con contador y "desmarcar todas"; abajo las
parciales, sin marcar, con las dos filas enfrentadas.

**Paso 6.** El resumen cuenta filas y **también** lo que se dejó afuera, por categoría: nuevas,
fusionadas, actualizadas, repetidas en el archivo, excluidas a mano, y correspondientes a
pacientes eliminados. La lección de Research: un resumen que dice "3 a actualizar" mientras se
descartaba media tabla es peor que no tener resumen.

## Escritura

El plan se calcula entero antes de escribir nada. Después se escribe en lotes de ~500.

### Leer con paginación, o el matcheo ve el 24% de la tabla

`supabase/config.toml` tiene **`max_rows = 1000`**. PostgREST trunca la respuesta y devuelve
**200 OK** con `Content-Range: 0-999/*` — no es un error y supabase-js no lo reporta.

Con 4.132 pacientes, el matcheo client-side se calcularía contra 1.000: los otros 3.132 no
generarían candidatos, entrarían como nuevos, y el upsert de `paciente_fuentes` les movería la
identidad al paciente nuevo dejando el viejo huérfano. **Duplicación masiva en silencio, que es
exactamente lo que este spec existe para evitar.**

Los pacientes se leen con `.range()` en bucle hasta agotar. Y antes del push hay que **verificar
el `db-max-rows` de dev y prod**, que es un setting del Dashboard que nadie tiene fijado por
escrito.

### El reintento tiene que ser inofensivo, y para eso el uuid lo genera el cliente

No hay transacción: son ~10 lotes por HTTP. La revisión 1 ponía el `upsert` **solo** sobre
`paciente_fuentes` y dejaba `pacientes` como `insert(...).select('id')` — que no es idempotente,
porque `pacientes` no tiene ninguna clave natural única sobre la que hacer `onConflict`.

El escenario: falla el lote 7 tras escribir los 500 pacientes y antes de sus identidades. Se
reintenta → **500 pacientes duplicados** con MRN nuevos, y el upsert de `paciente_fuentes` mueve
las claves a los uuid nuevos dejando los 500 originales huérfanos, sin fuente, invisibles para
todo import futuro y presentes en la lista. Y la defensa que escribí —"el reintento lo arregla
porque el matcheo los encuentra"— contradecía la línea de arriba: si el plan ya se calculó, el
matcheo no vuelve a correr.

**El cliente genera el `id` uuid** y las dos tablas van como `upsert`: `pacientes` con
`onConflict: 'id'`, `paciente_fuentes` con `onConflict: 'fuente,clave_origen'`. Un reintento
reescribe lo mismo y sigue. **El plan se recalcula en cada reintento**, contra el estado real de
la base.

Eso además elimina el `.select('id')` para recuperar los uuid generados, que asumía que la fila
*i* del `RETURNING` corresponde a la fila *i* del payload. Postgres no contrata ese orden: de
facto hoy coincide —verificado— que es justo lo que haría el bug invisible hasta que no lo sea.
Pegar la identidad de origen al paciente equivocado, en una tabla de PHI, sin que nada falle, es
el peor resultado posible de todo este trabajo.

### Todas las columnas en cada objeto

PostgREST exige que todos los objetos de un array de inserción tengan **el mismo conjunto de
claves**, o devuelve `PGRST102 / "All object keys must match"`. Como solo el 14% de eClinPro trae
email y `telefono_alt` se omite cuando es igual a `telefono`, cada fila se arma con **todas** las
columnas y `null` explícito.

*(NO VERIFICADO: no se pudo ejercitar PostgREST autenticado. Se confirma con un POST real de dos
objetos con claves distintas y un JWT de usuario.)*

### SheetJS y las fechas crudas — VERIFICADO (21/08/2026)

El otro supuesto que este spec marcaba como no verificado ya está comprobado: con
`XLSX.read(buf, { cellDates: false, raw: true })` y
`sheet_to_json(hoja, { header: 1, raw: false, defval: '' })`, **las fechas salen como el serial
crudo** (`'39872'`), no como `Date`. Se ejercita con un test que construye un libro en memoria y
lo lee de vuelta.

Importa porque la clave de identidad se calcula sobre ese crudo: si SheetJS hubiera devuelto
`Date`, la clave habría cambiado de formato y el import habría **duplicado los 4.132 pacientes**
en vez de reconocerlos.

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
  utils/normalizers/     index.ts + index.test.ts  mojibake, serial→fecha, teléfono, caja, género
  utils/pacienteIdentity/index.ts + index.test.ts  parseo por fuente, clave, matcheo, fusión
  utils/pacienteFields.ts                          PACIENTE_FIELD_DEFS
  data/pacientes.ts                                lectura paginada + upsert por lotes
  hooks/usePacientes.ts
```

El componente compartido **no importa nada de `src/features/`**. Lo específico de cada archivo
vive en el `normalize` de su catálogo de campos.

Al mudarse a `src/shared/`, `ImportModal` pasa a CSS Modules: hoy es todo `style={{}}` contra
`RESEARCH_THEME`, y en compartido no puede seguir importando el tema de Research.

Todo texto nuevo usa `useT()` con su clave en `es.json` **y** `en.json`, incluidos los mensajes
de error y de éxito.

## Tests

Obligatorios: los normalizadores y la identidad cuentan filas y deciden qué entra en un total.
Los casos salen del archivo real.

| Caso | Entrada | Esperado |
|---|---|---|
| Serial de Excel | `39872.0` | `2009-02-28` |
| Fecha futura | `2068-10-06` | marcada, no importada en silencio |
| Sin fecha | `''` | clave válida con índice de fila, sin candidatos |
| Dos homónimos sin fecha | `maitte ponce` ×2 | dos pacientes, no uno |
| Mojibake | `PeÃ±a` | `Peña`, y misma clave que `PEÑA` |
| Notación científica | `9.547060773E9` | `(954) 706-0773` |
| 11 dígitos con `1` | `17543678071` | `(754) 367-8071` |
| 11 dígitos sin `1` | `81370956960` | marcado — **no** `1370956960` |
| 13 dígitos | `5.52199E12` | marcado |
| Teléfono basura | `0.0` | marcado |
| Home == Cell | mismo número en las dos columnas | `telefono_alt` `null` |
| Nombre ECW | `ACEBEY,JONATHAN` | apellido `Acebey`, nombre `Jonathan` |
| Nombre ECP con separador | `Javier - Andrade` | nombre `Javier`, apellido `Andrade` |
| **Inicial en ECP sin separador** | `SANDRA V NEGRETE` | nombre `Sandra V`, apellido `Negrete` |
| Ambiguo de verdad | `Maria Elena Aranguren` | marcado como ambiguo |
| Anotación sin separador | `Rodrigo E Betancourt Alvarez DUPLICADO ROCHE` | apellido `Betancourt Alvarez`, nota aparte |
| Caja | `GONZALEZ ESPONDA` | `Gonzalez Esponda` |
| Filas que no son pacientes | `T,TEMPLATES` · `Formato visitas no borrar - Prueba` | las dos marcadas |
| Chart# de Excel | `2.0` | `'2'` — nunca `'2.0'` |
| Género | `M` / `Male` / `Femenino` | `M` / `M` / `F` |
| Match exacto | `rosa / ardila de delgado` vs `ardila de delgado, rosa` | exacta |
| Match parcial | `rosa / ardila` vs `rosa elvira / ardila de delgado` | parcial |
| **Apellido repetido** | `Hernandez Hernandez,Raul` vs `Raul \| Hernandez` | parcial, **no** exacta |
| **Exacta con contacto disjunto** | mismo nombre y DOB, teléfono y email distintos | parcial, sin pre-marcar |
| Homónimos | mismo apellido + DOB, nombre distinto | **no** es candidato |
| Fila repetida en el archivo | dos filas con la misma cadena y el mismo DOB | una sola, contada como repetida |
| Repetida con acento | `CEDEÑO` vs `CEDENO` | una sola; gana la acentuada |
| Idempotencia | reimportar la misma hoja | 0 nuevos, 0 preguntas |
| Idempotencia tras corregir nombre | corregir un ambiguo en el paso 4 y reimportar | 0 nuevos |
| **Idempotencia tras corregir fecha** | corregir una fecha futura y reimportar | 0 nuevos |
| Reintento de lote | reescribir un lote ya escrito | upsert, sin violación de PK |
| Paciente borrado | borrar y reimportar su hoja | no se recrea; se cuenta como tumba |
| Fusión de nombre | `ardila` + `ardila de delgado` | gana el largo |
| Fusión con choque | `castillo araiz` + `castillo arauz` | gana el existente, choque listado |
| **Fusión con inicial** | `Candia,Maria F` + `MARIA F CANDIA` | `Maria F` / `Candia` — la inicial no se duplica |

Verificación antes de dar nada por terminado: `npx tsc --noEmit`, `npx vitest run`,
`pnpm build:check` (nunca `next build` con el dev server levantado), y abrir el import en el
navegador con una hoja de prueba.

## Migración y despliegue

**Local:** `pnpm supabase migration up`. Nunca `db reset` — `config.toml` apunta `sql_paths` a un
`seed.sql` que no existe.

**Antes del push a dev o prod:** el backup cubre cero tablas porque las dos son nuevas y no hay
`SET NOT NULL` sobre datos existentes que pueda abortar. **El paso no se omite: se resuelve en
vacío, y queda dicho.**

Verificación posterior, en este orden:

1. Conteo de filas y que la `PRIMARY KEY (fuente, clave_origen)` exista.
2. **Que las policies respondan desde una sesión que NO sea admin.** Con un usuario admin
   `has_module()` devuelve `true` por el short-circuit y la verificación no prueba nada.
3. **Que los `GRANT` estén** (`\dp public.pacientes`). Es lo único que separa "anda en local" de
   "anda en la nube".
4. El `db-max-rows` del proyecto en el Dashboard.

### PHI: el archivo real va solo a producción

Son 5.072 personas con nombre, fecha de nacimiento, teléfono y correo, y el módulo tiene una
pestaña HIPAA al lado. La base `development` es una org free de Supabase.

**El archivo real se importa únicamente en producción.** Local y dev se prueban con un recorte
inventado que reproduzca las anomalías: los tres formatos de nombre, un mojibake, una inicial sin
separador, un serial, un teléfono de 11 dígitos sin prefijo 1, un duplicado exacto y uno parcial.

## Fuera de scope

- **Citas, logs HIPAA, incidentes y capacitaciones** siguen siendo demo.
- **Deshacer una fusión.** La tabla lo permite (borrar la fila de `paciente_fuentes`), pero no
  hay UI.
- **Export de pacientes.** Research lo tiene; acá no se pide todavía.
- **Catálogo `modules` con FK desde `role_modules.module_slug`.** Toca la migración de roles
  dinámicos, que ya está en producción. Anotado en `.todo/TODO.md`.
- **Corregir las erratas de tipeo entre fuentes** (`henry`/`hnery`, `jackeline`/`jacqueline`).
  Quedan como personas distintas hasta que alguien las una a mano.
- **Búsqueda por similitud fonética** (Soundex, trigramas). Los niveles de clave cubren lo
  medido; agregar fuzzy sin un caso que lo pida es inventar recall que nadie verificó.

## Avisos (`.todo/TODO.md`)

1. **Medical deja de mostrar los 8 pacientes demo.** La pestaña Pacientes arranca vacía hasta el
   primer import.
2. **Las citas siguen siendo demo y hablan de gente que ya no está en la tabla.** Guardan
   `paciente_nombre` adentro, así que se siguen viendo, pero el detalle de un paciente real no va
   a mostrar citas. Deuda aceptada a sabiendas.
3. **`GENEROS` cambia de valores canónicos** (`'Masculino'` → `'M'`). Un filtro o una vista
   apoyada en el texto viejo se va a ver vacía.
4. **Los nombres se guardan en Title Case**, no como venían. `GONZALEZ ESPONDA` se ve
   `Gonzalez Esponda`; la grafía original queda en `paciente_fuentes.nombre_origen`.
