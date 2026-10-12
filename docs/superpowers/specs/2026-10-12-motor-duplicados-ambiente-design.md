# Motor de duplicados ambiente, con memoria del descarte — Diseño

**Origen:** idea de Wagner, 2026-09-10, anotada en el TODO central como "importante, no urgente"
(FamilySearch-style: al crear una entidad, avisar que puede que ya exista y ofrecer fusionarla, en
vez de forzar la decisión en el momento de la carga). Inspirada en que, al importar pacientes de
eClinicalWorks/eClinPro/eMedicalPractice, la única ventana para decidir duplicados es *durante* el
import (`docs/superpowers/specs/2026-08-21-pacientes-import-design.md`), y a los médicos les da
hueva resolverlo ahí: quieren hacerlo después, con los datos ya cargados.

**Principio rector, no cuestionable:** el programa sugiere, la persona decide. Ninguna fusión
corre sola; siempre la confirma alguien.

**Nota sobre el nivel de detalle de este documento (después de 5 rondas de revisión adversarial):**
las primeras versiones de este spec incluían sketches de SQL línea por línea para las seis
funciones del motor. Cinco rondas de revisión encontraron, en ese nivel de detalle, una
contradicción que volvía la fusión inutilizable, tres bugs de ambigüedad de identificador, y dos
condiciones de carrera reales — cada ronda de arreglo introducía algo nuevo de la misma gravedad.
Ese nivel de detalle es código, no diseño, y el lugar correcto para escribirlo (y para que un test
real lo agarre en minutos, no en rondas de jueces) es el plan de implementación con TDD. Este
documento fija la arquitectura, el modelo de datos, y los **requisitos e invariantes** que la
implementación tiene que cumplir — no el código exacto. Cada requisito de abajo nombra el motivo
concreto por el que existe, para que la Tarea de implementación no tenga que adivinar ni
redescubrirlo.

## Alcance de este documento

El motor se diseña pensando en **dos consumidores**: Medical (`pacientes`) y Reuniones (`temas`,
que hoy solo detecta coincidencia exacta por empresa+título normalizado en `tema_para_acta()` —
la difusa no existe). Pero **la implementación de esta vuelta construye y cablea solo Medical**.
Reuniones queda documentado como consumidor futuro, sin tareas propias todavía — es un segundo
sub-proyecto con su propio spec cuando llegue el momento, principalmente porque `reunion_temas.
tema_id` es `ON DELETE RESTRICT` (`supabase/migrations/20260911130100_temas_catalogo.sql`) y la
fusión transaccional ahí tiene una forma distinta a la de Medical.

## Lo que ya existe y se reusa

Verificado en código (no solo en el TODO):

- `src/shared/import/` — máquina de import agnóstica de dominio: `identity.ts` (la abstracción
  `Identity<Row>`), `buildImportPlan/`, `ImportModal/`, y lo más relevante acá, `MergeCandidateRow/`
  + `MergeFieldRow/` — la grilla que compara dos registros campo por campo y resalta diferencias.
- `src/features/medical/utils/pacienteIdentity/index.ts` — la identidad de pacientes: `candidatos()`
  compara **una fila entrante** contra la base, en dos niveles (`exacta`/`parcial`) por núcleo de
  nombre (multiconjunto de tokens ≥2 letras, sin iniciales) + fecha de nacimiento, con reglas
  afinadas contra datos reales medidos (`contactoDisjunto`, `telefonoCompartido`, `ANOTACIONES`).
  `fusionar()` decide campo por campo con una regla fija: el que tiene valor gana, solo se rellenan
  los vacíos (incluye `id`/`mrn`/`created_at`/`updated_at` en su salida, porque recorre
  `Object.keys` de ambos objetos sin filtrar — el adapter de Medical tiene que excluir esas
  columnas antes de construir `p_valores_finales`, ver § Las seis RPC del motor).
- Este matcheo **solo corre durante el import** (`pacienteImportPlan/` → `PacientesImportModal`).
  No hay pantalla fuera de ese flujo, ni comparación base-contra-base, ni memoria de "esto ya se
  revisó y no es un duplicado".

## Investigación de referencia

Antes de fijar el diseño se investigó cómo lo resuelven sistemas reales (récord linkage / EMPI en
salud, librerías de deduplicación, CRMs con gestión de duplicados, y proyectos open source con
fusión de registros). Resumen de lo que cambió el diseño:

- **Fellegi-Sunter** (el modelo académico estándar de record linkage, usado por Splink del MoJ UK y
  exigido por OpenHIE para un Client Registry) pondera cada campo por su poder discriminante y
  arma tres bandas: auto-match, auto-reject, y una zona gris → revisión humana. Confirma el
  principio "sugiere, no decide", pero el modelo completo (pesos estimados con EM) necesita datos
  de entrenamiento que no hay y es una máquina probabilística — **se descarta para esta vuelta**:
  queda nombrado acá para que, si alguien lo propone de nuevo sin un motivo nuevo (ej. volumen que
  crece un orden de magnitud, o F1 medido pobre), la respuesta ya esté escrita.
- **Blocking es obligatorio en todo sistema real** (OpenHIE, Dedupe.io, AHRQ/Link Plus, CDC/NCHS):
  nadie compara todo-contra-todo. El bucket más común en salud es apellido fonético + DOB (o año
  de nacimiento). AHRQ recomienda NYSIIS sobre Soundex para apellidos hispanos — la población real
  de este archivo (Hernandez, Garcia, Candia, Sardina...).
- **Snapshot-based revert** (Aidbox MPI/MDM: restaura desde datos de auditoría, no desde una copia
  viva en paralelo) valida el diseño de la tabla de auditoría de fusiones tal como se armó antes
  de investigar (`duplicados_fusiones`, ver § Modelo de datos).
- **Ningún sistema open source revisado (OpenMRS, Odoo, Dolibarr, SuiteCRM) tiene un revert preciso
  de una fusión.** OpenMRS lo dice explícitamente en su UI ("Merging cannot be undone!"). El diseño
  de este documento queda, en ese punto, por encima de la práctica real — no por debajo.
- Los tres proyectos que SÍ reasignan FKs (OpenMRS, Odoo, Dolibarr) lo hacen en una transacción
  única (lógica de app transaccional o, en este caso, función de base). Confirma la decisión de
  usar una función Postgres y no varias llamadas secuenciales desde el cliente — la misma lección
  que ya costó cara una vez en este proyecto (ver § Las seis RPC del motor).
- Fuentes citadas por los agentes de investigación: [Splink (MoJ UK)](https://dataingovernment.blog.gov.uk/2022/09/23/splink-fast-accurate-and-scalable-record-linkage/),
  [OpenHIE Client Registry](https://wiki.ohie.org/x/D47DAQ), [AHRQ Link Plus blocking](https://hcup-us.ahrq.gov/datainnovations/raceethnicitytoolkit/or16.jsp),
  [CDC/NCHS linkage methodology](https://www.cdc.gov/nchs/data/datalinkage/2016-nhcs-cms-linkage-methodology.pdf),
  [Aidbox merge/unmerge](https://www.health-samurai.io/docs/aidbox/modules/mpi/merging-and-unmerging-records-usdmerge-and-usdunmerge),
  [OpenMRS PatientServiceImpl.mergePatients](https://github.com/openmrs/openmrs-core/blob/master/api/src/main/java/org/openmrs/api/impl/PatientServiceImpl.java),
  [Odoo base_partner_merge.py](https://raw.githubusercontent.com/odoo/odoo/19.0/odoo/addons/base/wizard/base_partner_merge.py),
  [HubSpot Duplicate Manager](https://knowledge.hubspot.com/records/manage-duplicate-records?re=true),
  [Salesforce Duplicate Record Sets](https://help.salesforce.com/s/articleView?id=duplicate_management_duplicate_record_sets.htm&type=5).

## Diseño genérico (principios SOLID) — para que sirva a cualquier módulo futuro

A pedido explícito de Wagner: el motor se diseña como una pieza reusable de `src/shared/`, no
como una feature de Medical con nombres de paciente hardcodeados. Esto no es generalización
especulativa — el repo ya tiene el mismo patrón probado en producción en
`src/shared/import/identity.ts` (`Identity<Row>`, que Research y Medical implementan cada uno por
su lado); este motor replica esa forma, no inventa una nueva.

- **S — Responsabilidad única.** El motor (`src/shared/dedup/`) resuelve SOLO la parte ambiente:
  cola de pendientes, memoria del descarte, auditoría y la transacción de fusión/revert. Nunca
  sabe qué es un "paciente" o un "tema" — eso es responsabilidad exclusiva del adapter de cada
  módulo. Cambiar cómo se detecta un duplicado de paciente no toca el motor; cambiar cómo se
  auditan las fusiones no toca a Medical.
- **O — Abierto/cerrado.** Agregar un consumidor nuevo (Reuniones, o cualquier módulo futuro) es
  escribir un adapter nuevo + una fila en `duplicados_entidades` (abajo) — cero cambios al motor
  ni a los adapters existentes.
- **L — Sustitución.** Cualquier adapter que cumpla el contrato es intercambiable: el motor nunca
  tiene un `if (entidad === 'pacientes')` en ningún punto. Si lo tuviera, sería la señal de que
  algo del dominio se filtró al motor.
- **I — Segregación de interfaces.** El contrato no es una interfaz gorda: comparar (`candidatos`)
  y fusionar valores (`fusionar`) son las dos únicas piezas que un adapter de TypeScript
  implementa. Qué tablas hijas reapuntar al fusionar NO vive en TypeScript ni se le confía al
  cliente — vive en configuración de base (ver abajo), precisamente para no convertir esa pieza
  en una superficie de ataque.
- **D — Inversión de dependencias.** El motor depende de la interfaz `DedupStrategy<T>`, nunca de
  Medical ni de Reuniones directamente — la misma regla que ya rige el repo entero (`src/shared/`
  no importa de `src/features/`). Cada feature inyecta su adapter al montar el componente de la
  bandeja; el motor nunca importa un adapter por nombre.

### El contrato (`src/shared/dedup/strategy.ts`)

```ts
export type NivelCandidato = 'exacta' | 'parcial'

export interface DedupStrategy<T> {
  entidad: string                        // 'pacientes', 'temas', ... — clave de duplicados_entidades
  candidatos(item: T, existentes: readonly T[]): { nivel: NivelCandidato; item: T }[]
  fusionar(existente: Partial<T>, entrante: Partial<T>): { resultado: Partial<T>; choques: string[] }
}
```

El adapter de Medical envuelve lo que ya existe (`pacienteIdentity.candidatos`/`fusionar`) sin
reescribirlo — adapta la forma del resultado al contrato genérico **y excluye explícitamente**
`id`/`mrn`/`created_at`/`updated_at` de lo que `fusionar()` produce antes de construir
`p_valores_finales` (ver por qué en § Lo que ya existe y se reusa y en § Las seis RPC del motor).

**Por qué el blocking y las tablas hijas a reasignar NO viven en este contrato de TypeScript:**
aceptar nombres de tabla/columna como dato desde el cliente, aunque se escapen con `format('%I',
...)`, abre una superficie donde cualquiera con el módulo del dominio podría apuntar la fusión a
una tabla que no debería tocar. Esa configuración vive del lado servidor, cargada solo por
migración (`duplicados_entidades`, nunca por un endpoint que la acepte del browser) — el patrón
que ya sigue el resto del esquema para todo lo sensible.

**El hecho del que depende toda esta genericidad:** `duplicados_entidades` tiene RLS activado y
CERO policies de escritura para cualquier rol de cliente (`authenticated`, `anon`) — solo
`service_role` vía migración puede escribirla (DDL completo en § Modelo de datos). Si esa tabla
alguna vez quedara alcanzable por un `UPDATE` del cliente — a `hijos`, a `funcion_candidatos` o a
la columna `modulo` — las RPC del motor dejarían de ser genéricas y seguras y pasarían a ser,
según el campo tocado, un `UPDATE` arbitrario de tabla, un primitivo de ejecución arbitraria de
función, o un bypass del chequeo de módulo. Es la única frontera de la que depende la seguridad
de todo el diseño genérico.

## Decisiones fijadas (y por qué)

| Decisión | Elegido | Por qué |
|---|---|---|
| Permiso para decidir un par (fusionar/descartar/revertir) | Cualquiera con el módulo `medical` para esa entidad | Mismo gate que el resto de Medical — es parte de operar el módulo, no una función de admin. Simétrico entre fusionar y revertir. |
| Disparo de la detección | Incremental (cada alta/import) + botón manual de escaneo completo | Lo incremental es casi gratis (ya existe para import, se extiende a alta manual) y cubre todo lo nuevo. El escaneo manual es la única forma de encontrar los duplicados que YA existen hoy entre los ~7.100 — correrlo solo no silencioso evita que alguien "no sepa que podría tardar". |
| Algoritmo de clasificación | Se mantiene `pacienteIdentity` (núcleo+DOB, exacta/parcial) | Ya está afinado contra datos reales medidos del archivo real. Un score Fellegi-Sunter es más fiel al estándar pero exige entrenamiento que no hay, para un volumen (~7-10k) donde la ganancia no se nota. |
| Blocking key | **Dual**: `dmetaphone(apellido)` (nativo, `fuzzystrmatch`) UNIÓN `nysiis(apellido)` (función propia) — ambos + año de nacimiento + inicial de `nombre` | `dmetaphone` es gratis. NYSIIS da mejor cobertura específica para apellidos hispanos según la investigación. Se implementan los dos desde el arranque en vez de arrancar con uno y medir después. La inicial de `nombre` acota buckets de apellido+año comunes (ver § Modelo de datos). |
| Modelo de seguridad de las RPC del motor | `SECURITY DEFINER` en las seis, `EXECUTE` revocado de `PUBLIC` y otorgado solo a `authenticated`, con el chequeo de módulo como primer paso útil siempre | El motor es genérico por `entidad` — no puede tener `'medical'` hardcodeado en ningún `GRANT`. Cada función resuelve `modulo` desde `duplicados_entidades` y llama `has_module(modulo)` antes de tocar nada. |
| Convención de nombres de parámetro/variable en las RPC del motor | Prefijo `p_` en parámetros, `v_` en variables locales derivadas — mismo convenio que `has_module(p_slug text)` | No es cosmético: sin prefijo, un parámetro o variable con el mismo nombre que una columna de la tabla que la función toca es ambiguo bajo el default de PL/pgSQL (`variable_conflict = error`), y la función aborta en cada llamada. Cinco rondas de revisión encontraron esta clase exacta de bug tres veces (una en un parámetro, una en una variable local, una en una subconsulta correlacionada) — es un requisito no negociable, no una preferencia de estilo. |
| Mutua exclusión entre las tres RPC que mutan un par | Un único mecanismo de lock, tomado por las tres (`registrar_candidato_duplicado`, `decidir_descarte_duplicado`, `fusionar_duplicado`) sobre el par normalizado, antes de leer o escribir nada | Bajo READ COMMITTED, dos de estas funciones corriendo a la vez sobre el mismo par pueden no ver el cambio sin commitear de la otra. Dos mecanismos de lock distintos (ej. un advisory lock en dos de las tres y un `FOR UPDATE` de fila en la tercera) NO dan exclusión mutua entre las tres — solo entre las que comparten el mismo mecanismo. Este punto falló una vez en una ronda de revisión anterior y es el motivo por el que queda como requisito explícito, no como detalle de cada función por separado. |
| Validación de `p_valores_finales` en `fusionar_duplicado` | Cuatro reglas independientes (ver § Las seis RPC del motor), con las columnas de identidad/auditoría excluidas de la regla de completitud | Extiende a los valores el único borde de seguridad del diseño genérico — hasta ahora limitado a nombres de tabla/columna. Sin las reglas, cualquiera con el módulo `medical` podía escribir cualquier valor en cualquier columna del ganador, o perder en silencio un valor real por omisión. La exclusión de columnas de identidad/auditoría de la regla de completitud no es opcional: sin ella, esa regla y la que prohíbe tocar columnas de identidad se vuelven mutuamente imposibles de satisfacer, porque esas columnas SIEMPRE difieren entre dos filas distintas — este error concreto apareció en una ronda de revisión y es la razón por la que esta interacción queda nombrada explícitamente acá. |
| Chequeo de "fusión posterior" en `revertir_fusion_duplicado` | Solo cuenta fusiones posteriores **vigentes** (no revertidas) | Sin excluir las ya revertidas, una fusión posterior deshecha bloquea para siempre el revert de una anterior, aunque ya no tenga ninguna incidencia sobre el estado actual. |
| Borrado del perdedor tras fusionar | `DELETE` dentro de la misma transacción, con snapshot previo **y `perdedor_id` propio** (columna indexada) en `duplicados_fusiones` | Snapshot permite revert preciso sin dejar un paciente fantasma visible en los listados normales. `perdedor_id` como columna indexada (no solo dentro del snapshot `jsonb`) es lo que permite que el chequeo de revert sea un lookup indexado y no un scan. |
| Limpieza de referencias colgantes tras fusionar | Se limpia **toda** fila de `duplicados_pendientes`/`duplicados_descartes` que mencione al perdedor, no solo la del par procesado | Sin FK (no hay FK polimórfica posible), cualquier otra fila que emparejara al perdedor con un tercero no relacionado queda huérfana para siempre si no se limpia explícitamente. |
| Elegir campo por campo al fusionar | Extender `MergeFieldRow` con un control por celda, prop opcional default apagada | Research sigue usando el modo actual sin tocar nada; la bandeja ambiente lo prende. Un solo componente, no uno duplicado. |
| Dónde vive la bandeja | Pestaña nueva en `/medical` | Navegación propia, sin competir por espacio con el listado de Pacientes. |
| Ejecución de la fusión | Función Postgres (RPC), transaccional — nunca llamadas secuenciales desde el cliente | Ya hubo un incidente de 3.409 pacientes huérfanos exactamente por ese patrón (ver TODO central, ítem abierto). |
| Deshacer un descarte ("no son la misma") | Sin ventana de tiempo, vía RPC dedicada | Descartar nunca tocó datos del item — no hay nada que revertir salvo la supresión misma. Más permisivo que el límite de 14 días de HubSpot, y más simple. |
| Forma de las tablas y de las RPC | Genéricas, con discriminador `entidad` — no "pacientes" hardcodeado | SOLID (ver sección propia): el motor es una pieza de `src/shared/`, reusable por cualquier módulo futuro sin tocar su código. |

## Modelo de datos

Cuatro tablas nuevas, genéricas (discriminador `entidad`), con la misma convención
`IF NOT EXISTS` que el resto del esquema (ver cualquier migración existente, ej.
`supabase/migrations/20260821212925_pacientes.sql`).

```sql
-- Qué entidades participan del motor, y qué tablas hijas hay que reapuntar al fusionar. Se carga
-- por migración (INSERT), NUNCA desde un endpoint que acepte esto del cliente — es la frontera de
-- seguridad que hace seguro el resto de la genericidad (ver § Diseño genérico).
CREATE TABLE IF NOT EXISTS public.duplicados_entidades (
  entidad            text PRIMARY KEY,            -- 'pacientes', 'temas', ...
  tabla              text NOT NULL,               -- 'pacientes'
  modulo             text NOT NULL,               -- 'medical' — el slug que las seis RPC chequean con
                                                   -- has_module(modulo) antes de tocar nada; así el
                                                   -- motor no hardcodea el dominio
  hijos              jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{"tabla":"paciente_fuentes","columna":"paciente_id"}, ...]
  funcion_candidatos text NOT NULL                -- nombre de la función SQL que arma pares por blocking (una por dominio)
);

-- El slug se declara UNA vez y la migración aborta si no es un módulo real — mismo guard que
-- `supabase/migrations/20260821212925_pacientes.sql`. Sin esto, un typo en 'medical' (o que el
-- admin le quite el módulo a todos los roles) deja la fila con un `modulo` que `has_module()`
-- nunca va a poder satisfacer, y las seis RPC del motor abortarían para cualquier usuario real.
DO $$
DECLARE
  slug text := 'medical';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo % sin ningún rol asignado: o está mal escrito, o el admin '
                    'le quitó el módulo a todos los roles. Verificar antes de seguir.', slug;
  END IF;

  INSERT INTO public.duplicados_entidades (entidad, tabla, modulo, hijos, funcion_candidatos) VALUES
    ('pacientes', 'pacientes', slug,
     '[{"tabla":"paciente_fuentes","columna":"paciente_id"},
       {"tabla":"paciente_contactos","columna":"paciente_id"}]'::jsonb,
     'pacientes_candidatos_escaneo')
  ON CONFLICT (entidad) DO NOTHING;
END $$;

-- Cola de pares sospechados, a la espera de una decisión. `entidad` evita que un paciente y un
-- tema se confundan aunque compartan uuid por casualidad.
CREATE TABLE IF NOT EXISTS public.duplicados_pendientes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  nivel         text NOT NULL CHECK (nivel IN ('exacta','parcial')),
  origen        text NOT NULL CHECK (origen IN ('import','alta_manual','escaneo')),
  detectado_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_pendientes_par_ordenado CHECK (item_id_a < item_id_b)
);

-- Memoria del descarte: pares que una persona ya miró y decidió que NO se fusionan.
CREATE TABLE IF NOT EXISTS public.duplicados_descartes (
  entidad       text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  item_id_a     uuid NOT NULL,
  item_id_b     uuid NOT NULL,
  motivo        text NOT NULL CHECK (motivo IN ('no_son_la_misma', 'son_la_misma_separadas')),
  nota          text,
  decidido_por  uuid REFERENCES public.usuarios(id),
  decidido_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad, item_id_a, item_id_b),
  CONSTRAINT duplicados_descartes_par_ordenado CHECK (item_id_a < item_id_b),
  CONSTRAINT duplicados_descartes_nota_si_separadas
    CHECK (motivo <> 'son_la_misma_separadas' OR nota IS NOT NULL)
);

-- Auditoría de fusiones, con snapshot para revert.
CREATE TABLE IF NOT EXISTS public.duplicados_fusiones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad                 text NOT NULL REFERENCES public.duplicados_entidades(entidad),
  ganador_id              uuid NOT NULL,          -- sin FK: el ganador sigue vivo, se valida en la función
  perdedor_id             uuid NOT NULL,          -- sin FK: el perdedor ya no existe tras fusionar. Columna
                                                   -- propia e indexada (no solo dentro de perdedor_snapshot)
                                                   -- para que el chequeo de revert sea un lookup, no un scan
  perdedor_snapshot       jsonb NOT NULL,          -- fila completa del perdedor antes de fusionar
  ganador_snapshot_previo jsonb NOT NULL,          -- fila del ganador antes de fusionar
  hijos_movidos           jsonb NOT NULL,          -- [{"tabla":"paciente_fuentes","claves":[...]}, ...]
  decidido_por            uuid REFERENCES public.usuarios(id),
  decidido_at             timestamptz NOT NULL DEFAULT now(),
  revertido_por           uuid REFERENCES public.usuarios(id),
  revertido_at            timestamptz
);

-- Indexadas porque `revertir_fusion_duplicado` consulta "¿este id participó como ganador o
-- perdedor en una fusión posterior vigente?" contra estas dos columnas.
CREATE INDEX IF NOT EXISTS duplicados_fusiones_ganador_id_idx ON public.duplicados_fusiones (ganador_id);
CREATE INDEX IF NOT EXISTS duplicados_fusiones_perdedor_id_idx ON public.duplicados_fusiones (perdedor_id);

-- RLS. `duplicados_entidades` es la frontera de seguridad de todo el diseño genérico: CERO
-- policies de escritura para cualquier rol de cliente — solo `service_role`, vía migración, la
-- escribe. Las otras tres se leen directo; toda escritura pasa exclusivamente por las RPC
-- `SECURITY DEFINER` del motor, nunca por un INSERT/UPDATE/DELETE de PostgREST — y por eso
-- `authenticated` tampoco necesita el GRANT de escritura sobre ellas: una función `SECURITY
-- DEFINER` corre con los privilegios de quien la creó, no con los de quien la invoca, así que
-- otorgarle a `authenticated` INSERT/UPDATE/DELETE directo no habilita nada que la RPC necesite —
-- solo deja a estas tres tablas a un solo error de configuración de RLS de quedar escribibles
-- directo desde el cliente (ya pasó una vez en este proyecto que RLS quedó apagada en prod, ver
-- TODO central). Mismo criterio minimalista que ya se aplica a `duplicados_entidades`.
GRANT SELECT ON public.duplicados_entidades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.duplicados_entidades TO service_role;

GRANT SELECT
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.duplicados_pendientes, public.duplicados_descartes, public.duplicados_fusiones
  TO service_role;

ALTER TABLE public.duplicados_entidades  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_pendientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_descartes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duplicados_fusiones   ENABLE ROW LEVEL SECURITY;

-- Catálogo: solo lectura, gateada por el módulo propio de cada fila. Ningún INSERT/UPDATE/DELETE
-- policy para `authenticated` — por diseño, solo escribe `service_role`.
CREATE POLICY "select_por_modulo" ON public.duplicados_entidades
  FOR SELECT USING ((SELECT public.has_module(modulo)));

-- Las tres tablas de pares no tienen `modulo` propio — lo resuelven vía `entidad`. Mismo
-- principio: SELECT gateada, cero policy de escritura para `authenticated`.
CREATE POLICY "select_por_modulo" ON public.duplicados_pendientes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_pendientes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_descartes
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_descartes.entidad));

CREATE POLICY "select_por_modulo" ON public.duplicados_fusiones
  FOR SELECT USING ((SELECT public.has_module(de.modulo)
                      FROM public.duplicados_entidades de
                      WHERE de.entidad = duplicados_fusiones.entidad));
```

**Por qué `item_id_a`/`item_id_b` sin FK a `pacientes`:** Postgres no tiene FK polimórfica — una
columna no puede referenciar "la tabla que diga `entidad`". La integridad la garantiza que todo
`INSERT`/`UPDATE` sobre estas tres tablas pasa exclusivamente por las funciones del motor: con RLS
habilitada y sin policy de escritura para `authenticated`, un intento directo lo rechaza RLS, no
solo la convención de "no escribir así".

**El par siempre se normaliza (`item_id_a < item_id_b`)** en las tres tablas de pares — si no,
A-B y B-A son dos filas distintas y el escaneo las trataría como pares diferentes. El `CHECK` lo
hace cumplir, no una convención de quien escribe.

**Un par nunca está en `duplicados_pendientes` y en `duplicados_descartes` a la vez.** Al decidir:
la fila pendiente se borra; si el motivo fue "no son la misma" o "son la misma, separadas", se
escribe en `duplicados_descartes`; si fue "fusionar", se escribe en `duplicados_fusiones`.

### Función NYSIIS (específica de Medical)

```sql
CREATE OR REPLACE FUNCTION public.nysiis(texto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
-- Implementación del algoritmo NYSIIS estándar (Taft, 1970), sobre el apellido ya normalizado
-- (sin acentos, mayúsculas). Pura, nunca lanza. El detalle de las reglas de transformación se
-- define en la Tarea correspondiente del plan — acá se fija el contrato: texto de entrada
-- normalizado, código NYSIIS de salida, determinista.
$$;
```

Se indexa con `fuzzystrmatch.dmetaphone` (nativo) y esta función, cada una en su propio índice
funcional sobre `pacientes`:

```sql
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE INDEX IF NOT EXISTS pacientes_blocking_dmetaphone_idx
  ON public.pacientes (dmetaphone(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));

CREATE INDEX IF NOT EXISTS pacientes_blocking_nysiis_idx
  ON public.pacientes (public.nysiis(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));
```

Ningún campo nuevo en `pacientes`: son índices sobre expresiones, no columnas.

**Riesgo de bucket sin acotar en apellidos comunes.** El blocking evita comparar todo-contra-todo,
pero un bucket de (apellido fonético, año de nacimiento) puede ser grande exactamente para esta
población: apellidos hispanos frecuentes (Hernandez, Garcia, Candia, Sardina) agrupados en rangos
de años de nacimiento comunes es el caso esperado de la lista de pacientes de una clínica, no un
caso de cola. Mitigación elegida: la tercera dimensión de blocking ya incorporada arriba — la
inicial de `nombre` — porque dentro de un mismo apellido+año el nombre de pila normalmente
difiere, y es barata. No exige medir nada antes de implementar. Si aun con esa tercera dimensión
algún bucket sigue siendo grande en la práctica, la red de contención es medir el tamaño real de
los buckets contra los ~7.100 pacientes reales y definir un tope — pero eso queda como fallback,
no como plan principal.

**Contrato que cualquier `funcion_candidatos` tiene que cumplir** (no solo la de Medical): el
self-join que arma pares dentro de cada bucket tiene que producir únicamente pares donde
`a.id < b.id`. Sin este filtro, cada fila matchea trivialmente contra sí misma — un self-join sin
acotar produce un self-par por cada fila de la tabla, y el guard de ids iguales de
`registrar_candidato_duplicado` (ver abajo) lo rechazaría, abortando el escaneo completo en el
primer bucket si esa excepción no está contenida dentro del loop del escaneo (ver también el
requisito correspondiente en § Las seis RPC del motor). `a.id < b.id` elimina el self-par de raíz
y, de paso, entrega los pares ya normalizados.

## Las seis RPC del motor

Seis funciones Postgres, todas `SECURITY DEFINER`, invocadas por RPC — nunca varias llamadas
secuenciales desde el cliente para una misma operación lógica (la lección del incidente de 3.409
pacientes huérfanos en prod, TODO central: la identidad se movió entre dos escrituras no
transaccionales).

```sql
REVOKE EXECUTE ON FUNCTION public.escanear_duplicados(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revertir_fusion_duplicado(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.escanear_duplicados(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fusionar_duplicado(text, uuid, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revertir_fusion_duplicado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_candidato_duplicado(text, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decidir_descarte_duplicado(text, uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.deshacer_descarte_duplicado(text, uuid, uuid) TO authenticated;
```

### Principios comunes a las seis — no negociables

Estos diez puntos no son preferencia de estilo: cada uno corresponde a un bug real que una ronda
de revisión adversarial encontró en una versión anterior de este diseño, escrita a nivel de SQL
ejecutable. Se nombran acá como requisitos, para que la Tarea de implementación los resuelva una
vez, con TDD, en vez de que un documento de diseño tenga que volver a descubrirlos.

1. Resuelven `modulo` desde `duplicados_entidades` por la `entidad` recibida y llaman
   `has_module(modulo)` como primer paso útil, siempre — abortan si la entidad no existe o el
   módulo no está habilitado, antes de tocar cualquier otra tabla.
2. Nunca aceptan nombre de tabla/columna/función del llamador — siempre los resuelven de
   `duplicados_entidades`.
3. Parámetros con prefijo `p_`, variables locales derivadas con prefijo `v_` — para que ningún
   identificador sin calificar pueda confundirse con una columna del mismo nombre. (Motivo:
   `variable_conflict = error` es el default de PL/pgSQL, y calificar una sola ocurrencia de un
   identificador ambiguo no exime a las demás del mismo bloque — esto rompió una función entera,
   dos veces, en versiones anteriores.)
4. Las tres funciones que mutan el estado de un PAR (`registrar_candidato_duplicado`,
   `decidir_descarte_duplicado`, `fusionar_duplicado`) se serializan entre sí sobre el mismo par
   normalizado, con el **mismo mecanismo de lock las tres** — nunca dos con un mecanismo y la
   tercera con otro: eso no cierra la carrera entre las tres, solo entre las dos que coinciden.
   **Esto no alcanza por sí solo**: un lock por PAR no sirve si dos operaciones tocan pares
   DISTINTOS que comparten un id — ej. `registrar_candidato_duplicado` sobre (X,Z) y
   `fusionar_duplicado` borrando X como perdedor de un par (X,Y) no relacionado usan claves de
   lock distintas y no se serializan entre sí. Por eso el chequeo de existencia que
   `registrar_candidato_duplicado`/`decidir_descarte_duplicado` hacen sobre cada id (ver sus
   secciones) tiene que tomar un lock de fila (`FOR UPDATE`/`FOR SHARE`) sobre esas filas de
   dominio, no una lectura simple — así compite por el mismo `FOR UPDATE` que `fusionar_duplicado`
   toma sobre esos mismos ids, sin importar en qué par esté actuando cada una.
5. Un par se normaliza (`least`/`greatest` de los dos ids) antes de tocar cualquier tabla, en
   cualquier función que lo reciba — nunca se asume que el llamador ya lo manda ordenado.
6. Un chequeo repetido bajo lock nunca confía en lo que vio un chequeo anterior sin lock: el
   estado puede haber cambiado en la ventana entre los dos.
7. `fusionar_duplicado` rechaza cualquier par que no tenga una fila en `duplicados_pendientes` —
   es lo que hace cumplir "el programa sugiere, la persona decide" en la capa de datos, no solo en
   la UI.
8. Ninguna falla es un éxito silencioso: toda guard que rechaza algo lo hace con
   `RAISE EXCEPTION` y un mensaje claro — salvo el único caso explícitamente documentado como
   no-op intencional abajo (re-detección de un candidato ya pendiente, que no es un error).
9. Cualquier llamada a una de estas RPC desde dentro de un loop de otra (ej. `escanear_duplicados`
   llamando `registrar_candidato_duplicado` una vez por cada par candidato, potencialmente miles)
   tiene que contener la excepción de esa llamada individual (ej. con su propio bloque de manejo
   de excepción) — un solo par rechazado por otra persona mientras el escaneo corre no puede
   abortar todo lo demás que el escaneo ya encontró.
10. `fusionar_duplicado` toma el `FOR UPDATE` de las dos filas de dominio en un orden estable que
    no depende de cuál id es ganador/perdedor (ej. siempre el menor primero) — para que dos
    llamadas concurrentes con los roles invertidos sobre el mismo par no se bloqueen mutuamente
    (deadlock). `revertir_fusion_duplicado` no tiene este problema de dos filas vivas: al momento
    de revertir, el perdedor no existe todavía (esta misma función lo recrea) — solo lockea la
    fila de auditoría y la fila de dominio del ganador, nunca dos ids que puedan competir en
    orden inverso (ver su propia sección).

### `registrar_candidato_duplicado(p_entidad, p_item_id_a, p_item_id_b, p_nivel, p_origen)`

Inserta un par en `duplicados_pendientes`. La llaman: la detección incremental (alta manual e
import, cuando `pacienteIdentity.candidatos()` encuentra algo) y `escanear_duplicados` (una vez
por cada par que el escaneo encuentra).

- Rechaza `p_item_id_a = p_item_id_b` (sin esto, `least`/`greatest` colapsa a un valor y el
  `INSERT` choca contra el `CHECK` de la tabla con un error crudo en vez de uno claro).
- Rechaza, con error explícito, si el par ya está en `duplicados_descartes` — la memoria del
  descarte se hace cumplir server-side, no solo por el filtro de quien llama. (Esto es
  intencionalmente ruidoso, no un no-op: cualquiera con el módulo `medical` puede invocar esta RPC
  directo, sin ninguna carrera de por medio, y volver a sugerir un par que alguien ya cerró.)
- Si el par ya está en `duplicados_pendientes` (re-detección desde otra fuente — ej. la
  detección incremental y el escaneo encuentran el mismo par), es un no-op silencioso: no es un
  error, es el mismo candidato visto dos veces.
- Verifica, **bajo un `FOR UPDATE`/`FOR SHARE` sobre esas dos filas de dominio** (no una lectura
  simple), que ambos ids existan todavía antes de insertar — un `fusionar_duplicado` concurrente
  puede estar borrando uno de los dos ahora mismo, como parte de un par DISTINTO que comparte ese
  id, y una lectura sin lock no se serializa contra eso (ver "Principios comunes", punto 4).

### `decidir_descarte_duplicado(p_entidad, p_item_id_a, p_item_id_b, p_motivo, p_nota)`

Una sola RPC para las dos acciones de descarte de la UI ("no son la misma" / "son la misma,
separadas") — difieren solo en `p_motivo`; no hay motivo de negocio para separarlas en dos
funciones.

- Verifica, bajo el mismo tipo de lock de fila que `registrar_candidato_duplicado` (ver
  "Principios comunes", punto 4), que ambos ids existan todavía — mismo motivo, dirección
  inversa: un `fusionar_duplicado` concurrente puede estar borrando uno de los dos ahora mismo.
- En una transacción: borra la fila de `duplicados_pendientes` para ese par si existía, e inserta
  en `duplicados_descartes` con `p_motivo`/`p_nota`.
- Si dos llamadas concurrentes resuelven el mismo par, la segunda termina en el mismo estado sin
  error (no una violación de `PRIMARY KEY` cruda).

### `deshacer_descarte_duplicado(p_entidad, p_item_id_a, p_item_id_b)`

Borra una fila de `duplicados_descartes`. RPC separada de `decidir_descarte_duplicado` en vez de
un `p_motivo = null`: son operaciones de forma distinta (una inserta y opcionalmente borra, la
otra solo borra), y una función más es más simple que un parámetro opcional que cambia el
significado de la llamada.

- Rechaza con un error explícito si el `DELETE` no afectó ninguna fila — nunca un éxito silencioso
  sobre "no había nada que deshacer".
- El par vuelve a aparecer la próxima vez que el escaneo o la detección incremental lo encuentren
  — no se reinserta automático en `duplicados_pendientes` al deshacer.

### `escanear_duplicados(p_entidad)`

Orquesta el escaneo manual completo contra la base existente (botón "Buscar duplicados").

- Resuelve `funcion_candidatos` desde `duplicados_entidades` (nunca del llamador) y la invoca —
  para Medical, `pacientes_candidatos_escaneo()`, que hace el blocking (ver § Modelo de datos) y
  clasifica cada par con la misma lógica de `pacienteIdentity.candidatos()` (portada a SQL o
  expuesta vía una vista — la Tarea de implementación decide la forma, con el criterio de no
  bifurcar la clasificación en dos implementaciones que puedan desincronizarse).
- Esa función de dominio tiene que cumplir el contrato `a.id < b.id` (ver § Modelo de datos).
- Descarta los pares ya conocidos (en pendientes o en descartes) antes de registrar el resto, y
  llama `registrar_candidato_duplicado` (con `p_origen: 'escaneo'`) para cada uno que sobrevive —
  un solo camino de escritura compartido con la detección incremental, para no bifurcar esa
  lógica tampoco.
- Un par individual que `registrar_candidato_duplicado` rechace durante el loop (ej. alguien lo
  descartó mientras el escaneo corría) no aborta el resto — ver "Principios comunes", punto 9.

### `fusionar_duplicado(p_entidad, p_ganador_id, p_perdedor_id, p_valores_finales)`

La operación central, y la de mayor riesgo de todo el diseño.

- Rechaza `p_ganador_id = p_perdedor_id`.
- Rechaza si el par (normalizado) no tiene una fila en `duplicados_pendientes` — "Principios
  comunes", punto 7.
- Toma el lock que la serializa contra `registrar_candidato_duplicado`/`decidir_descarte_duplicado`
  sobre el mismo par (punto 4), más el `FOR UPDATE` de las dos filas del dominio en orden estable
  (punto 10) — y, ya con los locks tomados, **repite** el chequeo de que el par sigue pendiente
  (punto 6): sin este segundo chequeo, un `decidir_descarte_duplicado` concurrente puede borrar la
  fila de pendientes en la ventana entre el primer chequeo y el lock, y la fusión seguiría
  adelante sobre un par que alguien acababa de descartar.
- Rechaza con un error claro si alguno de los dos ids ya no existe en la tabla del dominio —
  mismo chequeo, en la dirección opuesta, que ya tienen `registrar_candidato_duplicado`/
  `decidir_descarte_duplicado` (ver sus secciones): un par solapado resuelto por otra fusión
  concurrente puede haberse comido una de las dos filas en la ventana entre que se sugirió el par
  y que esta llamada corrió.
- Lee el snapshot completo de las dos filas (ganador y perdedor) ya bajo lock.
- Valida `p_valores_finales` con **cuatro reglas independientes, las cuatro necesarias, en este
  orden** — es la extensión natural de "nunca confiar en datos estructurales que vengan del
  cliente" (§ Diseño genérico), aplicada ahora al contenido y no solo a los nombres de
  tabla/columna:
  1. **Columnas de identidad excluidas.** Ninguna columna de identidad del dominio (en Medical:
     `id`, `mrn`) puede aparecer como clave — de forma independiente de las reglas 2 y 3. Sin
     esto, `{"id": <algo>}` pasa las otras reglas trivialmente y produce un `UPDATE` que choca
     contra la unicidad de `id` con un error crudo.
  2. **Columnas reales.** Cada clave restante tiene que ser una columna real de la tabla del
     dominio.
  3. **Valores trazables, comparación null-safe.** Cada valor tiene que coincidir —explícitamente
     con una comparación que trate dos `NULL` como iguales, nunca con `=` plano— con el valor
     correspondiente en el snapshot del ganador o en el del perdedor. Un `=` plano rechazaría
     cualquier columna opcional vacía en los dos lados a la vez (`NULL = NULL` no es `true` en SQL
     estándar), rechazando una elección perfectamente válida.
  4. **Completitud, con las mismas exclusiones que la regla 1 más las columnas de auditoría del
     dominio** (en Medical: `created_at`/`updated_at`, que además las gestiona un trigger propio,
     nunca el cliente). Para toda columna donde los dos snapshots difieren —fuera de esas
     exclusiones— tiene que haber una clave en `p_valores_finales`. Sin esto, omitir una columna
     deja en pie el valor (posiblemente vacío) del ganador y pierde en silencio un valor real que
     la regla de fusión preexistente dice que debía sobrevivir (`pacienteIdentity.
     fusionarCampoSimple`: "campo con valor gana, solo se rellenan los vacíos").

  **Las reglas 1 y 4 tienen que compartir la misma lista de exclusiones.** Una versión anterior de
  este diseño las escribió como dos chequeos independientes sin esa exclusión compartida, y como
  las columnas de identidad SIEMPRE difieren entre dos filas distintas, la regla 1 las prohibía y
  la regla 4 las exigía — ninguna fusión podía satisfacer las dos a la vez. Esto no es un detalle
  menor: es el motivo concreto por el que esta sección existe en forma de requisito y no de
  código suelto.

  Una falla de la regla 3 es distinta en origen de una falla de las reglas 1/2: puede ocurrir en
  uso normal (una edición ordinaria del paciente, vía `PacienteModal`, entre que la persona abrió
  la comparación y confirmó la fusión, deja su elección desactualizada contra el snapshot fresco
  que se lee después del lock) — el cliente tiene que recuperarse re-leyendo los dos registros y
  volviendo a presentar la comparación, no mostrando un error de seguridad. Las fallas de 1/2, o
  un valor no trazable a ningún snapshot en la regla 3, sí son ataque-o-bug-shaped y ameritan ese
  tono.
- Aplica `p_valores_finales` sobre el ganador.
- Reasigna cada tabla hija registrada en `duplicados_entidades.hijos` (nunca con nombres de
  tabla/columna que vengan del llamador), registrando las claves exactas movidas.
- Borra la fila perdedora.
- Limpia **toda** otra fila de `duplicados_pendientes`/`duplicados_descartes` que mencione al
  perdedor, no solo la del par procesado (sin FK que lo haga automático, por diseño).
- Registra la fusión en `duplicados_fusiones`: ganador, perdedor, los dos snapshots previos, las
  claves movidas.

### `revertir_fusion_duplicado(p_fusion_id)`

- Toma el lock sobre la fila de auditoría antes que cualquier otra cosa.
- Rechaza si esa fila ya fue revertida.
- Lockea también (`FOR UPDATE`) la fila de dominio del ganador antes de restaurarla — es la única
  fila viva que esta función toca antes de recrear al perdedor, así que no hay un segundo id vivo
  con el que pueda competir en orden inverso (ver "Principios comunes", punto 10).
- Rechaza si el ganador de esa fusión participó, como ganador O como perdedor, en cualquier
  fusión posterior **que siga vigente** (no revertida) — una fusión posterior ya deshecha no
  cuenta, o un revert legítimo quedaría bloqueado para siempre por una cadena que ya se deshizo.
- Restaura el ganador a su snapshot previo, recrea al perdedor con su snapshot exacto (mismo id),
  y devuelve los hijos exactamente a las claves que `hijos_movidos` registró — nunca "lo que el
  ganador tenga hoy", porque pudo haber ganado más hijos desde la fusión por otras vías.

## Lo que queda fuera de esta vuelta

- **Reuniones/`temas`**: documentado arriba como consumidor futuro. Gracias al diseño genérico,
  sumarlo es: (1) un adapter `DedupStrategy<Tema>` en `src/features/reuniones/`, (2) una función
  `temas_candidatos_escaneo()` con el blocking que tenga sentido para títulos (exacto normalizado
  hoy en `tema_para_acta()`, difuso a definir) que cumpla el mismo contrato `a.id < b.id`, (3) una
  fila en `duplicados_entidades` con `hijos: [{"tabla":"reunion_temas","columna":"tema_id"}]` —
  con el cuidado de que esa FK es `ON DELETE RESTRICT`
  (`supabase/migrations/20260911130100_temas_catalogo.sql`): la reasignación tiene que completarse
  antes del `DELETE`, igual que ya hace el diseño para Medical. Cero cambios al motor genérico ni
  a los adapters existentes — esa es la prueba de que el diseño cumple Abierto/Cerrado. Aun así,
  merece su propio spec chico para esos tres puntos antes de ejecutarse.
- **Score ponderado tipo Fellegi-Sunter**: descartado para esta vuelta (ver § Investigación). Si
  se reabre, que sea con un motivo nuevo medido, no solo "es más parecido al estándar".
- **Elegir campo por campo también en Research**: el control nuevo de `MergeFieldRow` queda
  apagado por default ahí; prenderlo para Research es una decisión de producto separada.

## Testing

Sigue la convención del plan de import: **vitest corre sin DOM**, todo lo verificable va en
funciones puras (NYSIIS, el armado de pares por blocking si se expresa como función TS, los
cambios a `fusionar()`/`candidatos()` si los hay). Las seis RPC del motor son la parte de mayor
riesgo de todo el diseño — la Tarea de implementación tiene que cubrir, como mínimo, estos
escenarios antes de que esto salga a producción (con `supabase migration up` en local; los
escenarios de concurrencia real necesitan dos sesiones deliberadamente interleaved —no una llamada
secuencial desde un script—, nunca contra prod directamente):

a. Fusión encadenada A→B→C y después un intento de revertir la fusión A→B — tiene que bloquearse
   con un error explícito.
b. Doble revert sobre el mismo `fusion_id` — tiene que rechazarse, no reaplicarse en silencio.
c. Fusión1 (A gana, B pierde) → fusión2 más tarde (A gana de nuevo, C pierde) → se revierte
   fusión2 → un intento de revertir fusión1 tiene que **permitirse** — confirma que una fusión
   posterior ya deshecha no bloquea para siempre el revert de una anterior.
d. Una fusión donde el perdedor tenía otro par pendiente/descartado con un tercero no relacionado
   — esa fila tiene que limpiarse, no quedar colgada.
e. Llamar `fusionar_duplicado` con `ganador_id = perdedor_id`, o con un id que no existe — tiene
   que rechazarse con un error claro.
f. Un intento directo de `INSERT`/`UPDATE` por PostgREST contra cualquiera de las 4 tablas nuevas
   desde un cliente con rol `authenticated` — RLS tiene que negarlo.
g. Dos llamadas concurrentes a `fusionar_duplicado` sobre pares solapados que comparten una fila
   — la segunda tiene que bloquear o fallar limpio, nunca corromper datos en silencio.
h. `p_valores_finales` con una clave que no es columna de la tabla del dominio, o un valor que no
   coincide con ninguno de los dos snapshots — rechazo claro, sin escribir nada.
i. `p_valores_finales` que omite una clave para una columna donde los dos snapshots difieren —
   rechazo por completitud, nunca aplicar la fusión dejando esa columna en el valor del ganador.
j. `p_valores_finales` que incluye `{"id": ...}` o `{"mrn": ...}` — rechazo por la regla de
   identidad, nunca un `UPDATE` que choque contra una unicidad con un error crudo.
k. `p_valores_finales` con una columna opcional donde los dos snapshots son ambos `NULL` — tiene
   que **aceptarse** (comparación null-safe), no rechazarse por un `NULL = NULL` que no es `true`.
l. `p_valores_finales` construido a partir de la salida real de `pacienteIdentity.fusionar()` —
   tiene que aceptarse de punta a punta (confirma que el adapter de Medical excluye `id`/`mrn`/
   `created_at`/`updated_at` antes de llamar a la RPC, como exige § Diseño genérico).
m. Llamar `registrar_candidato_duplicado`, con una llamada directa y no concurrente, sobre un par
   que ya está en `duplicados_descartes` — rechazo explícito, nunca un no-op silencioso.
n. Dos llamadas concurrentes sobre el mismo par — una a `registrar_candidato_duplicado` y otra a
   `decidir_descarte_duplicado` — tienen que serializarse (mismo mecanismo de lock) y terminar sin
   dejar el par en las dos tablas a la vez.
o. `decidir_descarte_duplicado` sobre un par donde uno de los dos ids ya fue borrado por un
   `fusionar_duplicado` — rechazo claro, nunca una fila que referencia un id inexistente.
p. `decidir_descarte_duplicado` con los ids en el orden "equivocado" — tiene que normalizar y
   escribir sin violar el `CHECK`.
q. `deshacer_descarte_duplicado` sobre un par que no estaba descartado — rechazo claro, no éxito
   silencioso.
r. Dos llamadas concurrentes — una a `fusionar_duplicado` y otra a `decidir_descarte_duplicado` —
   sobre el mismo par pendiente, usando el mismo mecanismo de lock que (n): la que pierda la
   carrera falla limpio, nunca completan las dos sobre el mismo par.
s. `escanear_duplicados('pacientes')` de punta a punta, sin abortar en el primer bucket (confirma
   el contrato `a.id < b.id` de `pacientes_candidatos_escaneo()`) y sin abortar el escaneo
   completo si un par candidato fue descartado por otra persona mientras corría (confirma
   "Principios comunes", punto 9).
t. Dos llamadas concurrentes sobre PARES DISTINTOS que comparten un id — `registrar_candidato_
   duplicado` sobre (X,Z) mientras `fusionar_duplicado` borra X como perdedor de un par (X,Y) no
   relacionado — tienen que serializarse por el lock de fila sobre X (confirma "Principios
   comunes", punto 4): nunca puede quedar insertada en `duplicados_pendientes` una fila que
   referencia a X después de que X ya no existe.

Lo visual (la pestaña nueva, el control por celda) se verifica a mano en el navegador, igual que
el resto de Medical.
