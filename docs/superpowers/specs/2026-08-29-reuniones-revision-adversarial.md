# Revisión adversarial — diseño del módulo Reuniones

**Fecha:** 2026-08-29
**Sobre:** `docs/superpowers/specs/2026-08-29-reuniones-design.md` (commit `84c7a5f`)
**Método:** cinco agentes en paralelo, con ángulos disjuntos y sin verse entre sí — esquema contra
la base viva · cotejo contra los documentos de Freddy · coherencia interna del texto · reglas de
`rules/` · permisos, snapshot y arrastre. Pedido por §9.1 del propio diseño.

**Veredicto: el diseño no está listo para pasar a plan de implementación.** El núcleo —cuatro
tablas, módulo desacoplado— aguanta. Lo que no aguanta es la sección de permisos, la evaluación de
riesgo de la migración, tres requisitos que desaparecieron sin ser descartados, y una decisión que
el documento difiere a la fase 4 y que en realidad hay que tomar ahora.

Lo que sigue son los hallazgos que **cambian el diseño o el orden del trabajo**. Los de redacción
quedaron en los informes de los agentes y se aplican al reescribir.

---

## 0. El hallazgo que no es del spec

**`actividades`, `usuarios`, `historial` y `notificaciones` no tienen RLS.** `relrowsecurity =
false`. Las policies de `actividades` existen (`admin_all`, `colaborador_read` con
`has_module('stratix-mkt')`) pero Postgres no las evalúa. Y `anon` —la llave pública que viaja en el
bundle— tiene `SELECT, INSERT, UPDATE, DELETE, TRUNCATE` sobre las dos primeras.

**CONFIRMADO EN PRODUCCIÓN el 29/08/2026** (`ruedelunbtaomhrzgelc`, consulta de solo lectura
desde el SQL Editor):

| Tabla | RLS | Policies escritas |
|---|---|---|
| `actividades` | **off** | 2 |
| `usuarios` | **off** | **4** |
| `historial` | **off** | 0 |
| `notificaciones` | **off** | 0 |

Seis policies escritas, revisadas y mergeadas que Postgres nunca evaluó. El resto del esquema (31
tablas) tiene RLS encendida.

Ninguna migración del repo la habilita sobre esas cuatro. La consulta que lo verifica:

```sql
SELECT relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND relkind = 'r' AND relrowsecurity = false;
```

Al arreglarlo, dos trampas: `colaborador_read` es `FOR SELECT` únicamente y la única `FOR ALL` es
`admin_all`, así que encender RLS tal cual **deja a todo no-admin sin poder crear ni mover una
tarea** (`src/shared/data/actividades.ts` escribe desde el browser); y `usuarios` sin RLS es lo que
hoy hace andar el Directorio y los dropdowns de responsable.

Apareció porque el diseño afirmaba —tres veces, heredado del documento del 28/08— que `actividades`
estaba gateada por `has_module('stratix-mkt')`, y un agente fue a verificarlo. Nadie estaba buscando
esto. El detalle completo está en `.todo/TODO.md`.

---

## 1. Bloqueantes: cosas que impiden empezar

### 1.1 La fase 1 no puede correr — `permissions.ts` está sobre el techo duro

Registrar el slug obliga a editar `src/shared/auth/permissions.ts`: `MODULE_META` es de donde salen
`ModuleSlug`, el launchpad y las casillas de `/admin` → Roles. El archivo tiene **162 líneas** y el
check `archivo-extenso` corta en 150 **sin marca que valga**. El Edit se rechaza.

Y sin esa edición, `validateModuleSlugs` rechaza el slug con `Módulos inválidos: reuniones`, así que
§4.1 (*"el admin lo asigna desde `/admin` → Roles"*) y §2.6 son promesas que hoy no se pueden
cumplir. `routes.test.ts` además rompe el CI en cuanto exista la página sin su entrada en
`MODULE_META`.

**El paso 0 de la fase 1 es partir `permissions.ts`.** Lo importan el middleware, el AppShell, el
launchpad, admin y dos suites de test.

*(Encontrado por tres agentes independientes.)*

### 1.2 §1 es falso: el módulo sí toca lo que ya existe

*"No toca nada de lo que ya existe… Se puede borrar entero con un `DROP`"*. Toca, como mínimo:
`permissions.ts`, `appShellConfig.ts` (88 líneas, sobre el límite blando y sin marca), los dos
`locales/*.json`, `CLAUDE.md` (tabla de módulos), `role_modules`, y en la fase 3 `report-html`.

### 1.3 §4.3 "no hay migración riesgosa" es falso por tres vías distintas

- **Rompe el borrado de usuarios.** `admin_reassign_and_delete` limpia una lista **hardcodeada**
  (`historial · marcaciones · notificaciones · slots_calendario · solicitudes · actividades`).
  `reuniones` tendrá cuatro FK a `usuarios` y no estará ahí → violación de FK → rollback de toda la
  función → **ese usuario queda imborrable**, con un 500 crudo.
- **Rompe el chequeo de "empresa en uso".** `org-catalogs.ts` declara `blockedBy` de `empresas` como
  otra lista a mano (`usuarios · actividades · solicitudes · slots_calendario`). El panel contaría 0
  dependientes para una empresa con 40 reuniones y el `DELETE` explotaría — el fallo exacto que ese
  chequeo existe para evitar.
- **Puede abortar igual.** Confundí *"no rompe permisos"* con *"no aborta"*, que es lo que mide el
  precheck: el `INSERT` en `role_modules` sin `ON CONFLICT` (PK compuesta), colisión de nombre de
  `CREATE DOMAIN` (`asistencia` es genérico), y el `UNIQUE` de `empresas.codigo` que se verifica, no
  se supone.

Además el diseño **no especifica `ON DELETE` ni `ON UPDATE` en ninguna de sus seis FK**. Y
`empresas.codigo` es editable desde el panel, así que `reuniones.empresa` necesita `ON UPDATE
CASCADE` o renombrar una empresa deja de funcionar.

§4.3 no se corrige: se reescribe, y el precheck vuelve.

---

## 2. El agujero de confidencialidad

**§2.7 descarta las exclusiones citando un mecanismo que §4.2 no construye.** El argumento es
*"`has_module()` más la pertenencia (participante, preside o secretario) cubren el caso real"*, pero
§4.2 pone una sola policy `mod_access` con `has_module('reuniones')` y ninguna condición de
pertenencia. La pertenencia sólo aparece en §4.4, en prosa, y sólo para editar.

**Resultado: cualquiera con el slug lee todas las actas de todo el grupo.** Y §2.6 empuja
exactamente eso (*"asignárselo a cualquier rol es gratis"*).

El caso no es hipotético: **el acta de la reunión que originó este spec contiene sueldos, días
adeudados y una evaluación de desempeño.**

Peor: el patrón `mod_access` del repo es `FOR ALL` sin `WITH CHECK`, así que también concede
**escritura y borrado**. Cualquiera con el módulo puede `DELETE` una reunión cerrada y el `CASCADE`
se lleva participantes, temas, pendientes y el snapshot — y §3.9 descartó `audit_logs`.

Es la forma que `rules/codigo.md` describe: **no falla, funciona de más.** Freddy lo había escrito
en su spec: *"Nunca solo en la interfaz: ocultar un botón no es seguridad."*

**Qué falta:** policies por operación (`SELECT` con `has_module` + alcance, `INSERT`/`UPDATE` con
pertenencia, `DELETE` con `is_admin()`), un `WITH CHECK` explícito, y un trigger que rechace tocar
filas de una reunión `cerrada` — el repo ya tiene ese patrón en `prevent_rol_self_change`.

*(Encontrado por tres agentes independientes.)*

---

## 3. La decisión que no se puede diferir

§2.3 saca el arrastre con historial y dice: *"Si más adelante hace falta, la tabla se agrega sin
tocar nada de lo construido"*. Reusa el argumento de §2.1 (*"no cuesta nada esperar"*).

**La analogía no aplica, y la asimetría es la que decide.** Conectar con `actividades` después es
gratis porque una FK se llena hacia adelante. El plazo original no: cada vez que alguien reescribe
`fecha_comprometida` durante las fases 1-3 **se destruye un dato que ninguna migración posterior
puede reconstruir**. La fase 4 nacería ciega sobre todo lo acumulado.

Y conservarlo es **una columna `date` que siempre se llena** — así que la objeción de §2.1 contra
las columnas preparatorias (*"una columna nullable que nadie escribe es peor que no tenerla"*) no
rige acá.

**Decisión a tomar antes de escribir la fase 2**, no en la fase 4: si el arrastre se quiere alguna
vez, `reunion_pendientes` nace con `fecha_original` además de `fecha_comprometida`.

---

## 4. La regla de contención se contradice sola

§2.10 sostiene el diseño con esto: *"`reunion_pendientes` no crece. Si algún día pide `prioridad`,
colaboradores N:N, adjuntos o comentarios, eso no es una columna nueva: es la señal de unificar con
`actividades`"*.

Y después el mismo documento agenda las cuatro:

| Dónde | Qué dice |
|---|---|
| §8.1 | `prioridad` — *"es barata… se decide al empezar la fase 2"* |
| §8.2 | colaboradores N:N — *"fase posterior si aparece el caso"* |
| §6 fase 4 | el arrastre, que necesita `fecha_original`, `prorrogas`, `es_final` |
| §6 fase 5 | adjuntos y comentarios |

Las dos primeras son **heredadas**: en el documento del 28/08 el destino era `actividades`, donde
una columna sí era barata. Sobrevivieron a la inversión y hoy vacían la defensa central.

Peor: por la propia regla de §2.10, **ejecutar la fase 4 obliga al refactor de Operaciones** — no es
"agregar `topic_reviews` sin tocar nada", como dice §2.3.

**Y la regla no es verificable por nadie.** Vive en un `.md` de `docs/`, no en `rules/`, y no tiene
check — cuando `rules/proceso.md` exige que toda regla nueva nazca con el suyo. Es verificable en
cinco líneas: `pattern: ALTER TABLE.*reunion_pendientes.*ADD COLUMN`, `paths: supabase/migrations`,
modo `block`, con el motivo de §2.10 como mensaje.

---

## 5. Tres requisitos de Freddy que desaparecieron sin ser descartados

No están en §2 (decisiones), ni en §3.9 (lo que no se crea), ni en §8 (preguntas abiertas). No se
descartaron: se olvidaron.

### 5.1 Trabajo transversal — una acción, varias marcas

Spec §1.1 lo pone entre los cinco problemas a resolver: *"Las acciones que involucran a varias
marcas se duplican. Cada empresa lleva su propia versión y ninguna coincide."* Lo sostienen
`related_companies`, RN-12, RN-30, la columna *Empresas* del acta y del prototipo.

El diseño tiene `reuniones.empresa` como FK **única**, y el tema y el pendiente la heredan. O sea
que **reintroduce el problema que el spec pone en su tabla de "situación actual"**. Y rompe §3.7: el
heredado filtra por `r.empresa = $empresa`, así que la mitad de una acción compartida desaparece de
la reunión de la otra marca.

El caso más obvio: **la reunión del 28/08 que originó todo esto** —Freddy, Wagner y Angie, tres
marcas— no tiene una empresa a la cual imputarse.

### 5.2 Pipeline

Freddy en la reunión, dos veces: *"llenar campos, llenar texto, hacer como una especie de pipeline"*
y *"el checklist o el pipeline de esa tarea está en proceso todavía"*. Spec P-05: Kanban de cinco
columnas.

El único lugar donde aparece en el diseño es **§2.10, como condición de reversión futura**:
*"alguien pide un Kanban de pendientes de reunión… significa que dejó de ser una lista dentro de un
acta"*. O sea: el disparador que el documento pone en futuro **ya ocurrió, en la reunión que el
documento cita como su fuente**.

O el diseño sostiene que "pipeline" en boca de Freddy significa otra cosa —y lo argumenta— o su
propia condición de reversión está cumplida desde el día cero.

### 5.3 Panel ejecutivo

Spec §1.1, §2.3 (las seis métricas de éxito a 90 días), §6.13, P-01, P-06, y el prototipo lo tiene
como pantalla de inicio con seis KPIs. Las palabras "dashboard" y "KPI" aparecen **cero veces** en
las 694 líneas del diseño.

Sin él, **ninguna de las seis métricas con las que Freddy definió el éxito es medible.** Y
`rules/arquitectura.md` dice que los componentes de `src/shared/components/dashboard/` se reusan sin
arrastrar dominio, así que es más barato de lo que la ausencia sugiere.

### 5.4 Menor, pero del mismo tipo

- **Notificaciones.** El pedido más repetido de la reunión (*"tendría que llegar una notificación al
  correo, te han asignado esta tarea"*), y quedó en la fase 5 *(a confirmar)*. Y hay un costo no
  visto: `notificaciones` sólo enlaza por `actividad_id` / `solicitud_id`, así que un pendiente de
  reunión exige **una columna nueva en una tabla existente** — que contradice §1 y §3.
- **Bloque de firmas** del acta. Pedido en la reunión, en el spec y en el prototipo. Es markup puro
  sobre datos que §3.1 ya tiene. Gratis, y no figura ni entre lo descartado.
- **`aprobador`** de la acción: sale impreso en el acta del prototipo, cero menciones.
- **"Postergado"** como estado: Freddy lo dijo dos veces con ejemplo. §2.2 cotejó contra el spec
  escrito, no contra lo que se habló. Es justo el estado que expresa el arrastre.

---

## 6. Contradicciones internas que hay que resolver, no redactar mejor

| # | Choque | Secciones |
|---|---|---|
| 1 | El heredado *"se edita ahí mismo"* pero pertenece a un acta **cerrada e inmutable** — y §4.4 tampoco autoriza a quien lo edita | §3.7 vs §3.4 vs §4.4 |
| 2 | El snapshot congela *"temas con su estado"* y §3.5 dice que **un tema no tiene estado** (frase heredada del 28/08, cuando el tema era una fila de `actividades`) | §3.4 vs §3.5 |
| 3 | El acta cerrada es *"inmutable"* y el admin puede **reabrirla**; nadie dice qué pasa con el snapshot | §3.4 vs §4.4 |
| 4 | `rol_en_reunion` duplica `preside_id`/`secretario_id` — *"una columna que siempre copia a su padre se desincroniza sola"*, dice el propio §3.5 — y encima **la autorización lee la copia** | §3.2 vs §3.1 vs §4.4 |
| 5 | Las FK del módulo usan `CASCADE` mientras §2.1 elige `SET NULL` para no borrar el trabajo. Con `CASCADE`, borrar una reunión vieja **vacía el bloque de heredados** de las nuevas | §3.5/§3.6 vs §2.1 |
| 6 | §2.3 dice que la consulta es *"más simple"*: son tres tablas y dos joins contra las dos tablas y un join del diseño anterior | §2.3 vs §3.7 |

**El 1 es el que decide una funcionalidad:** o el snapshot congela los pendientes, o el arrastre los
edita. No se pueden las dos. Cualquier trigger de inmutabilidad —que hace falta por la sección 2—
rompe el arrastre.

---

## 7. Lo que el diseño hizo bien

Para que el contraste quede: §2.5 (reusar `empresas`/`usuarios`), §2.8 (sin Server Actions), §2.9 en
su parte de formato, §3.3 (externos sin cuenta), §3.4 (el `acta_snapshot` en lugar de congelar dos
columnas — es mejor que lo que pedía el spec, y el motivo está bien construido), §3.5 (el tema sin
empresa propia) y §2.2 (alinear el vocabulario de estados). Esos aguantan una lectura hostil.

También: la migración propuesta pasa limpia contra el motor de reglas, el `DO` block con `RAISE
EXCEPTION` cumple, las 20 referencias cruzadas `§n.m` apuntan bien, y la aritmética de §2.10 cierra.

---

## 8. Correcciones al conteo de §2.10

- **`dias_produccion` está en el grupo equivocado.** De 266 filas tiene 161 llenas contra 81 de
  `horas`, y 65 no cumplen `horas = dias*8`. Son dos entradas independientes del formulario, se
  suman por separado en el reporte y `dias_produccion` fija el largo de la barra del Gantt. **No es
  derivada.** La comparación honesta es **6 contra 10**, y la fila del medio son cuatro.
- Es el mismo error que §2.10 se felicita por haber corregido, hecho a medias.
- `mes`/`trimestre`/`semana` tampoco son derivables para todas las filas: 6 filas tienen `mes` sin
  ninguna fecha, y una tiene `mes` que no coincide. §8.6 subestima el trabajo.

---

## 9. Qué hacer, en orden

1. ~~El `SELECT` de RLS contra prod.~~ **HECHO el 29/08: confirmado, cuatro tablas expuestas.** El
   trabajo que sigue está en `.todo/TODO.md` y es un incidente aparte de este módulo: primero
   revocar `anon`, después encender RLS con las policies que faltan. **No arranca hasta que eso
   esté**: sería construir un módulo nuevo sobre un control de acceso que no existe.
2. **Decidir `fecha_original`** (sección 3). Es lo único que se destruye por esperar.
3. **Reescribir §4 entero** con policies por operación y el trigger de inmutabilidad, y §4.3 con su
   precheck.
4. **Decidir, con argumento escrito, las tres de la sección 5**: transversalidad, pipeline y panel.
   Cualquiera de las tres puede quedar afuera; ninguna puede quedar sin mención.
5. **Resolver el choque 1 de la sección 6** — snapshot contra arrastre.
6. **Reescribir §1, §2.3, §2.7, §2.10, §8.1, §8.2** y sumar a §7 las 21 reglas que faltan.
7. **Partir `permissions.ts`** como paso 0 de la fase 1, y sumar `admin_reassign_and_delete` y
   `org-catalogs.ts` al alcance de la migración.
8. **Escribir el check de la regla de contención** en `rules/`, como pide `rules/proceso.md`.

---

## 10. Nota de método

Cinco agentes, cinco ángulos, sin verse. Tres hallazgos aparecieron en dos o más informes por
caminos distintos —el `MODULE_META` hardcodeado, la fila decorativa de `role_modules`, y el agujero
de §2.7 vs §4.2—; esa convergencia es lo que los vuelve confiables sin re-verificarlos uno por uno.

**Y un agente se equivocó:** el de permisos cerró afirmando que el argumento de RLS de §2.10 era
*"sólido"*, porque miró `pg_policies` y no `relrowsecurity`. El de esquema demostró lo contrario.
Todo lo que entró a este documento se verificó a mano — `rules/proceso.md`: *"vale igual para lo que
reportan otros agentes: se confirma antes de repetirlo"*.
