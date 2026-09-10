# Preflight de las fases 3 a 6 de `operations`

**Fecha:** 2026-09-09
**Verifica:** `docs/superpowers/specs/2026-09-09-operations-unificacion-design.md`
**Alcance:** fases **3, 4, 5 y 6**. La 1 ya está implementada y la 2 la planifica otro agente — ninguna
de las dos se cubre acá.
**Método:** cada afirmación se abrió contra el código de `feat/operations` de hoy y contra el Postgres
**local** (`supabase start`). Nada se consultó en producción; donde el dato sólo existe en prod, el
veredicto lo dice.

Este documento **no es un plan**. Es la lista de supuestos sobre los que se apoya cada fase y qué
queda de cada uno.

| Veredicto | Qué significa |
|---|---|
| **VIGENTE** | Se verificó y sigue siendo cierto. Va con archivo:línea. |
| **VENCIDO** | Era cierto y dejó de serlo. Se dice qué lo cambió. |
| **NUNCA FUE CIERTO** | El diseño lo afirma y el código dice otra cosa. |

---

## 0. El terreno, después de la fase 1

Tres hechos que cambian la lectura de todo lo que sigue, y que el diseño no podía saber porque se
escribió antes:

1. **La fase 1 renombró el *slug*, no el *código*.** `MODULE.OPERATIONS = 'operations'`
   (`src/shared/auth/permissions/modulos/slugs.ts:9`), `PanelKey`, `NAV`, `PANEL_META`, `SUB_ITEMS`,
   el `ambito` de filtros y las cuatro policies de `actividades` ya dicen `operations`. Pero la
   carpeta sigue siendo `src/features/tasks/`, el provider sigue siendo `TasksProvider`, y
   `TASKS_TAB_PREF` sigue siendo `'tab-tasks'`
   (`src/features/tasks/constants/tabs/index.ts:21`). Varias afirmaciones del diseño caen justo en
   esa costura, y no todas del mismo lado.

2. **La fase 1 no tocó `reuniones`.** Ni sus dos policies con `has_module('reuniones')`, ni sus filas
   de `role_modules`, ni le dio `operations` a `medico_investigacion`. Verificado en local:

   | `module_slug` | roles hoy (local) |
   |---|---|
   | `operations` | `stratix360` |
   | `reuniones` | `admin`, `stratix360` |
   | `tasks` | *(borrado por `20260909233746`)* |

3. **La ventana de convivencia 1A→1C ya está cerrada.** `20260909222149_operations_slug_abre.sql` y
   `20260909233746_operations_slug_cierra.sql` están las dos commiteadas. §8 pide que "las fases que
   toquen `role_modules` o las policies —absorber `reuniones` es exactamente eso— queden **ordenadas
   entre la apertura y el cierre de la fase 1**". Eso ya no es posible con las migraciones tal como
   están.

---

## Fase 3 — el puente tarea↔acta, el modal del tratamiento, reuniones como pestaña

Secciones verificadas: §2.2, §2.4, §2.8, §3.2, §5 (y lo de §3.4 que la fase arrastra).

| # | Supuesto del diseño | Veredicto | Evidencia |
|---|---|---|---|
| 3.1 | `reunion_temas` existe con `id uuid` PK, de donde cuelga el puente | **VIGENTE** | `reunion_temas(id, reunion_id NOT NULL, posicion NOT NULL, titulo NOT NULL, descripcion, …)` en la base local |
| 3.2 | `reunion_tema_actividades` no existe todavía | **VIGENTE** | no está en `information_schema.tables` |
| 3.3 | Las funciones que la RLS del puente necesita existen, `SECURITY DEFINER`, firma `(p_reunion uuid)` | **VIGENTE** | `preside_o_secretaria`, `creo_la_reunion`, `reunion_abierta`, `participa_en_reunion`, `misma_empresa_reunion`, `is_admin`, `usuario_actual_id`, `has_module` — todas presentes |
| 3.4 | `reunion_temas_write` (`20260830204042:91-96`) es la forma que copia `rta_write` | **VIGENTE** | `supabase/migrations/20260830204042_reuniones_creador_del_acta.sql:91-96` — y confirma la lección: es `FOR ALL` **sin `WITH CHECK`** |
| 3.5 | `reunion_temas_select` no nombra ningún slug: hereda el gate por la reunión | **VIGENTE** | policy viva: `EXISTS (SELECT 1 FROM reuniones r WHERE r.id = reunion_temas.reunion_id)` |
| 3.6 | `creo_la_reunion()` (y por herencia `puedo_ver_reunion`) sirve para las hijas, no para `reuniones` | **VIGENTE** | la advertencia está escrita en `20260830204042:33-37`; la función es `STABLE` |
| 3.7 | `.insert().select().single()` exige que la fila nueva pase también el `SELECT` | **VIGENTE** | documentado en `20260830204042:10-14` |
| 3.8 | Una tabla nueva de `public` recibe `GRANT ALL` a `anon` por defecto | **VIGENTE** | `reunion_temas`, `reuniones` y `actividades` tienen hoy los 7 privilegios para `anon`; sólo la RLS las frena |
| 3.9 | Las policies de `reuniones` nombran el slug `reuniones` y en esta fase pasan a `operations` | **VENCIDO** | siguen diciendo `has_module('reuniones')` (`reuniones_select`, `reuniones_insert`), pero la ventana 1A→1C que §8 exige para ese cambio ya se cerró |
| 3.10 | `role_modules`: `reuniones → admin, medico_investigacion`; `tasks → admin, stratix360`; `operations` recibe la unión | **VENCIDO** | hoy `operations → stratix360`, `reuniones → admin, stratix360`, `tasks` ya no existe. El `DELETE` de §4.2 queda a medias y el `INSERT` de `medico_investigacion` sigue pendiente |
| 3.11 | `notif_insert_modulo` está gateada por `has_module('stratix-mkt')` a secas | **VIGENTE** | policy viva: `WITH CHECK has_module('stratix-mkt')` |
| 3.12 | `NotificationsBell/index.tsx:40` hace `router.push(modulePath('stratix-mkt'))` hardcodeado | **VIGENTE** | la fase 1 no lo tocó |
| 3.13 | El `await` que inserta la notificación no mira su error | **VIGENTE** | `src/features/tasks/hooks/useActividadForm/index.ts:106` — pero el diseño lo ubica en 105-106 junto al guard, y el guard está en `:88` |
| 3.14 | `useActividadForm` es "un estado singleton por provider" | **NUNCA FUE CIERTO** | ver abajo |
| 3.15 | "Son el hook **y los tres** componentes de campos" | **NUNCA FUE CIERTO** | ver abajo |
| 3.16 | `ActivityCampos` / `ActivityPlanificacion` leen `nuevaAct` del contexto, no de props | **VIGENTE** | `ActivityCampos/index.tsx:15`, `ActivityPlanificacion/index.tsx:18` |
| 3.17 | `ReunionesListado` monta su propio `AppShell` + `PageTransition` | **VIGENTE** | `src/features/reuniones/components/listado/ReunionesListado/index.tsx:33-34` |
| 3.18 | `ModuloTabs` ya los monta | **VIGENTE** | `src/shared/components/shell/ModuloTabs/index.tsx:40-41` |
| 3.19 | `StratixModule` monta el provider de tasks y los hooks se componen incondicionalmente | **VIGENTE** | `src/features/stratix-mkt/components/StratixModule/index.tsx:10`; `TasksContext/index.tsx:25-29` |
| 3.20 | `PanelKey` es una unión literal usada como `panel="tasks"`; el renombre toca `NAV`, `PANEL_META`, `SUB_ITEMS` y el tipo | **VENCIDO** | ya dice `operations`: `appShellConfig/tipos.ts:4`, `nav.ts:6`, `paneles.ts:6`, `subvistas.ts:7-11`, `TasksContent/index.tsx:28`. No queda trabajo ahí |
| 3.21 | `useSearchParams` tiene cero ocurrencias en todo `src/` | **VIGENTE** | 0; los 12 `router.push` empujan rutas planas, ninguno lleva `?` |
| 3.22 | `payloadDeActividad` manda el payload completo con nulls por diseño | **VIGENTE** | `src/features/tasks/hooks/useActividadForm/payload.ts:7-8` (el texto arranca en la 7, no en la 6) |
| 3.23 | `grep -rn "reunion_temas" src/` da cero | **VIGENTE** | 0 ocurrencias |
| 3.24 | La mesa de participantes fue "5 componentes + `useParticipantes` + 2 utils + **62 claves i18n**" | **NUNCA FUE CIERTO** (el número) | ver abajo |
| 3.25 | Los participantes de un acta pueden ser externos | **VIGENTE** | `src/features/reuniones/types.ts:40-43` (`usuario_id: string \| null` + `invitado_*`) |
| 3.26 | Reuniones entra como **quinta** pestaña de `/operations` | **VIGENTE** | `SUB_ITEMS.operations` tiene hoy cuatro secciones |
| 3.27 | Sacar `/reuniones` del catálogo la deja **ungated**, no rota | **VIGENTE** | `moduleForPath` devuelve `null` y `ModuleGate/index.tsx:28` deja pasar. La carpeta `modulos/legacy/` ya existe para eso (`SLUGS_RETIRADOS = ['tasks']`) |
| 3.28 | El modal hace nacer la tarea con "responsable, que ahora puede ir vacío (§2.6)" | **NUNCA FUE CIERTO** (como orden) | ver abajo |
| 3.29 | Con §2.4 "el trigger desaparece entero": el vínculo es sólo una policy | **NUNCA FUE CIERTO** | ver abajo |
| 3.30 | "Verificado que `admin_reassign_and_delete` no se rompe: menciona la tabla sólo en un comentario" | **NUNCA FUE CIERTO** | ver abajo |
| 3.31 | `log_reunion()` nunca tuvo trigger sobre `reunion_temas` | **VIGENTE** | `trg_log` existe sólo sobre `reuniones` y `reunion_pendientes` |
| 3.32 | La regla del centinela «`reunion_pendientes` no crece» vive fuera del repo | **VIGENTE** | no hay directorio `rules/` en el repo; el hook la carga del plugin |
| 3.33 | El sustituto de prueba es `pnpm db:rls` "consultando como `anon`, no leyendo el esquema" | **NUNCA FUE CIERTO** | ver abajo |
| 3.34 | "Dos `INSERT` no transaccionales con policies distintas" es el riesgo propio de la fase | **VIGENTE, y peor de lo dicho** | ver abajo |

### 3.14 — `useActividadForm` no es un context, y eso cambia el remedio

`src/features/tasks/hooks/useActividadForm/index.ts:36` es un `useState` dentro de un hook plano. No
hay provider adentro: es singleton **de hecho**, porque el único call-site que lo invoca es
`src/features/tasks/components/TasksContext/index.tsx:28`. Nada en el hook impide instanciarlo N
veces. La consecuencia es a favor: "N estados" no exige partir el hook — exige llamarlo N veces desde
un componente que no sea el provider. Lo que sí bloquea son los componentes de campos, que leen del
contexto (3.16). El diseño describe el problema correcto por el motivo equivocado, y el remedio que
propone ("son el hook **y** los componentes") es más caro de lo necesario en la mitad del hook y más
barato de lo necesario en la otra.

### 3.15 y 3.24 — dos números que no dan

Los componentes que leen o escriben `nuevaAct` del contexto son **cinco**, no tres: `ActivityCampos:15`,
`ActivityPlanificacion:18`, `ActivityAsignacion:17`, `ActivityNumeros:17`, `SolicitantePicker:18` — y
otros dos que sólo lo leen (`ActivityAcciones:18`, `NewActivityModal:16`). Presupuestar tres deja
fuera al menos dos archivos que también hay que parametrizar.

Las **62 claves i18n** no son de la mesa de participantes: son **todas** las `reuniones.*` de
`src/shared/i18n/locales/es.json`. Las propias de participantes son **9**
(`reuniones.participantes.*`), y los cinco componentes consumen 19 distintas contando `reuniones.rol.*`,
`reuniones.asistencia.*`, `reuniones.campo.*` y `common.*`. El precedente que el diseño usa para
dimensionar la fase ("y eso para *una* tabla, acá son tres") está inflado ~7x en su parte más visible.

### 3.28 — el modal de la fase 3 depende de la fase 6, que va última

§5 dice que en el modal del tratamiento el responsable "ahora puede ir vacío, §2.6". Pero §2.6 —
`responsable_id` nullable — es la **fase 6**, y §8 la ordena última "por ser la más cara y la menos
urgente". Hoy la columna es `NOT NULL` (verificado) y `crearActividad` corta en
`useActividadForm/index.ts:88` con `assigneeRequired`. O la fase 3 sale sin poder registrar el
compromiso de un participante externo o de alguien de otro módulo —que es el caso de uso que §2.6 usa
para justificarse—, o la 6 se adelanta. Es una dependencia real entre dos fases que el documento
declara independientes.

### 3.29 — hay un trigger de acta cerrada que el diseño no nombra

Existe `public.proteger_acta_cerrada()` con trigger `trg_acta_cerrada` sobre **`reuniones`,
`reunion_temas` y `reunion_participantes`**. Levanta `RAISE EXCEPTION 'el acta está cerrada: no se
puede modificar'` para todo el que no sea admin. El diseño nunca lo menciona — ni en §2.4 ("el trigger
desaparece entero"), ni en §2.8, ni en §2.9, ni en §3.4 (que sí enumera lo que arrastra el `DROP`).

Dos consecuencias. La primera: el argumento de §2.4 —"con el vínculo como fila propia el guard es una
policy, sin `TG_OP`, sin leer `OLD`"— es cierto para el vínculo nuevo, pero la familia de tablas del
acta **ya tiene** ese guard como trigger, y `reunion_tema_actividades` nacería sin él. Quedan dos
mecanismos distintos protegiendo lo mismo, y el nuevo es el único que no muerde para `service_role`.
La segunda está abajo, en la fase 4.

### 3.30 — la verificación de `admin_reassign_and_delete` dice otra cosa

§3.4 afirma: *"Verificado que `admin_reassign_and_delete` **no** se rompe: menciona la tabla sólo en
un comentario"*. El cuerpo vivo de la función (`pg_proc.prosrc`) **no menciona `reunion_pendientes`
en absoluto**: cero ocurrencias, ni en código ni en comentario. La conclusión del diseño (no se rompe)
es correcta; la evidencia que cita no existe. Importa porque es exactamente el tipo de "verificado"
que después nadie vuelve a mirar.

### 3.33 — el gate de RLS lee el esquema, no consulta como `anon`

§8.2 lista como sustituto de la falta de tier dev: *"`pnpm db:rls` consultando como `anon`, no leyendo
el esquema — la lección del 29/08 y del punto ciego de las vistas del 31/08"*. El script real
(`supabase/checks/rls.sh` → `supabase/checks/rls-encendida.sql`) hace exactamente lo contrario: dos
bloques `DO $$` sobre `pg_class.relrowsecurity` y `pg_policies`. **No hay un solo `SET ROLE`, ni una
sola consulta como `anon`, ni ninguna verificación de `GRANT`.** Y esto era trabajo de la fase 1, que
ya está cerrada.

Para las fases 3 y 4 —que son las dos que estrenan RLS— significa que el `REVOKE ALL … FROM anon` y
las policies nuevas **no las verifica ningún gate**. Lo único que el check sí atrapa es una tabla
nueva sin `ENABLE ROW LEVEL SECURITY`, y avisa (`RAISE WARNING`, no falla) de una tabla con RLS y sin
policies.

### 3.34 — los dos `INSERT` tienen policies distintas, y una puede faltarle a quien escribe el acta

El riesgo declarado en §8 es real y se puede precisar. `actividades_insert_modulo` exige
`has_module('operations') OR has_module('stratix-mkt')`. `rta_write` exigiría presidir/ser
secretaria/haber creado el acta. **No son el mismo conjunto de gente.** Hoy `reuniones → admin,
stratix360` y `operations → stratix360`: si la absorción del slug (3.9/3.10) no entra completa y en
orden, hay usuarios que pueden escribir el acta y no pueden crear la tarea — y el modo de falla es el
primer `INSERT` pasando y el segundo abortando, que es la mitad exacta que deja una tarea huérfana
sin vínculo. No hay transacción posible desde el cliente: haría falta una RPC, que el diseño no
contempla para esta fase.

---

## Fase 4 — el cierre del acta

Sección verificada: §2.9.

| # | Supuesto del diseño | Veredicto | Evidencia |
|---|---|---|---|
| 4.1 | La transición `borrador → en_curso → cerrada` no está implementada en ninguna parte | **VIGENTE** | ningún camino escribe `estado` |
| 4.2 | `src/shared/data/reuniones/reuniones.ts:16` lo dice textual | **VIGENTE** | *"`codigo` y `estado` no viajan: el primero lo pone el trigger y el segundo tiene su DEFAULT"*; `filaDesde` enumera nueve campos y ninguno es `estado` |
| 4.3 | `acta_snapshot` no la escribe nadie | **VIGENTE** | `grep -rn "acta_snapshot" src/` → 0. Las columnas existen (`acta_snapshot jsonb`, `acta_snapshot_at`) |
| 4.4 | El `CHECK acta_cerrada_tiene_snapshot` es un candado sin llave | **VIGENTE** | `CHECK (estado <> 'cerrada' OR acta_snapshot IS NOT NULL)` vivo en `reuniones` |
| 4.5 | La RPC `cerrar_reunion(id)` nunca se escribió | **VIGENTE** | no existe en `pg_proc` |
| 4.6 | `reunion_abierta()` "hoy devuelve **siempre** true" | **NUNCA FUE CIERTO** (literalmente) | ver abajo |
| 4.7 | `reuniones_update` se recreó sin `WITH CHECK`, y por eso `SET estado='cerrada'` es imposible para quien no sea admin | **VIGENTE** | `20260830204042:73-78`; la policy viva tiene `USING … AND estado <> 'cerrada'` y `with_check = NULL` |
| 4.8 | El estado es un dominio con los tres valores | **VIGENTE** | `estado_reunion CHECK (VALUE IN ('borrador','en_curso','cerrada'))`, columna `NOT NULL DEFAULT 'borrador'` |
| 4.9 | La RPC va `SECURITY DEFINER`, "que además es lo que ya hace `admin_reassign_and_delete`" | **NUNCA FUE CIERTO** (como precedente) | ver abajo |
| 4.10 | `SECURITY DEFINER` alcanza para saltear lo que hoy impide cerrar | **PARCIAL / NUNCA FUE CIERTO** | ver abajo |
| 4.11 | El expediente hoy **ni siquiera muestra el `estado`**; sólo lo pinta el badge del listado | **VIGENTE** | cero usos del campo en `components/expediente/`; el badge está en `listado/ReunionRow/index.tsx:37` |
| 4.12 | El expediente es un `Modal` abierto por `useState` (no tiene URL) | **VIGENTE** | `ReunionesListado/index.tsx:25` y `:43-46`; `ExpedienteView/index.tsx:33` |
| 4.13 | `ConfirmModal` con `destructive` + `confirmPhrase` "ya existe tal cual" | **VIGENTE** | `src/shared/components/ui/ConfirmModal/types.ts:10` y `:13`; también `confirmPhraseLabel?` en `:14` |
| 4.14 | "Cero tests del cierre. Los **siete** archivos de test del módulo son de utils puros" | **PARCIAL** | siete son los de `reuniones` (todos bajo `utils/`); `tasks` tiene **catorce**. Que ninguno de los 21 toque RLS ni triggers **sí** es cierto |
| 4.15 | La reapertura va en el expediente porque `/admin` no tiene listado de reuniones | **VIGENTE** | `/admin` no monta ninguna vista de reuniones |

### 4.6 — `reunion_abierta()` no devuelve siempre true, devuelve `estado <> 'cerrada'`

El cuerpo real es `SELECT EXISTS (SELECT 1 FROM reuniones WHERE id = p_reunion AND estado <> 'cerrada')`.
La conclusión del diseño se sostiene —como ninguna fila llega nunca a `'cerrada'`, el guard no muerde
nunca— pero la forma importa para la fase: la función devuelve **false** para un `p_reunion` que no
existe. Un guard escrito sobre ella no es "siempre permisivo"; es permisivo para toda reunión real y
denegatorio para una id inventada. Es la diferencia entre "el guard no restringe" y "el guard no
existe", y la prueba de aceptación de la fase 4 tiene que distinguirlas: cerrar un acta y ver que
`reunion_temas_write`, `reunion_participantes_write` y `rta_write` **empiezan** a morder.

### 4.9 — el precedente que se cita es de otra clase de llamada

`admin_reassign_and_delete` se invoca desde `src/app/api/admin/reassign-and-delete/route.ts:96` con el
cliente **`service_role`**, detrás de `requireAdmin`. En todo `src/` hay sólo **cuatro** `.rpc(`, y de
los llamados como usuario autenticado desde el navegador sólo hay dos: `has_module`
(`src/shared/db/requireAccess.ts:35`) y `registrar_entrada` (`src/shared/db/auth.ts:23`). `cerrar_reunion()`
sería la **primera RPC de escritura llamada como `authenticated` desde el browser** en este repo. El
precedente que el diseño invoca para bajar el riesgo cubre la otra mitad del problema (la función),
no ésta (el canal).

Corolario que no está dicho: en Postgres una función nace con `EXECUTE` para `PUBLIC`. Verificado en
las tres funciones que miré (`has_module`, `reunion_abierta`, `admin_reassign_and_delete`): las tres
tienen `anon=X`. Una `cerrar_reunion()` `SECURITY DEFINER` que verifica permisos adentro está bien,
pero nace ejecutable por `anon` salvo `REVOKE` explícito, y ninguna migración del repo lo hace hoy.

### 4.10 — `SECURITY DEFINER` no saltea el trigger, y el trigger es el que gobierna la reapertura

`proteger_acta_cerrada()` (ver 3.29) corre `BEFORE DELETE OR UPDATE ON reuniones`. Una función
`SECURITY DEFINER` cambia el rol con el que se evalúan permisos y RLS; **no** desactiva triggers. Para
el cierre no es problema: en un `BEFORE UPDATE` la función lee el estado todavía-`'borrador'` y deja
pasar. Para la **reapertura** sí lo es, y a favor: el trigger ya bloquea a todo el que no sea
`is_admin()`, con lo cual §2.9 punto 3 ("la reapertura, sólo por admin") **ya está implementada en la
base** y lo que falta es sólo la UI. Pero eso hay que saberlo antes de escribir la RPC: si la
reapertura se implementa como una segunda RPC `SECURITY DEFINER` que verifique permisos adentro, va a
chocar igual con el trigger cuando la llame alguien que no sea admin — el mensaje que va a ver el
usuario es `el acta está cerrada: no se puede modificar`, no el que escriba la RPC.

---

## Fase 5 — `fecha_entrega_original` y el renombre a `fecha_entrega_final`

Secciones verificadas: §2.7, §3.3, y la fila 5 de la tabla de §8.

| # | Supuesto del diseño | Veredicto | Evidencia |
|---|---|---|---|
| 5.1 | "48 ocurrencias en 21 archivos" | **VIGENTE, exacto** | `grep -rn fecha_entrega src/` → **48** en **21** archivos. Fuera de `src/`: 57 más en `supabase/` (12 en migraciones, 41 en dumps de rollback, 4 en checks) y **0** en `e2e/` y `supabase/seed/` |
| 5.2 | Ninguna de las tres vistas toca `fecha_entrega` | **VIGENTE** | `v_equipo_hoy`, `v_kpis_globales`, `v_produccion_responsable` verificadas contra `pg_get_viewdef`: ninguna la nombra |
| 5.3 | El índice se llama `idx_actividades_fecha_ent` | **VIGENTE** | `CREATE INDEX idx_actividades_fecha_ent ON actividades USING btree (fecha_entrega)` |
| 5.4 | `log_cambio_actividad` registra **sólo** `estado` y `verificado` | **VIGENTE** | `20260612193730:179-198`; el plazo no es derivable del historial |
| 5.5 | `historial` es admin-only | **VIGENTE** | (no se contradice; 289 filas de `actividades` en local) |
| 5.6 | `fecha_entrega` es nullable y una tarea puede nacer sin plazo | **VIGENTE** | `date NULL`; 26 de 267 filas locales la tienen en `NULL`. Justifica la guarda `OLD.fecha_entrega_final IS NULL` |
| 5.7 | `fecha_inicio` es `date NOT NULL DEFAULT CURRENT_DATE` y es el período de imputación | **VIGENTE** | columna viva |
| 5.8 | `fecha_requerida` está muerta: ningún formulario la escribe | **VIGENTE** | 4 ocurrencias en `src/`, ninguna es un write (`loadAppData.ts:91` tipo; `act-detail-fields/grupos/fechas.ts:14` comentario; dos en un test que verifica que **no** se renderiza) |
| 5.9 | Las 429 filas existentes quedan en `NULL` y no se backfillean | **NO VERIFICABLE EN LOCAL** | local tiene **267** filas, no 429. Es un dato de prod y el diseño lo sabe |
| 5.10 | "El par se nombra junto porque se lee junto" — es un patrón nuevo acá | **NUNCA FUE CIERTO** | ver abajo |
| 5.11 | Es el **único** trigger nuevo sobre `actividades` | **VIGENTE** (con matiz) | `actividades` ya tiene dos: `trg_actividades_updated_at` y `trg_log_actividad`. El nuevo es el tercero y, por orden alfabético, corre después de los dos existentes en `BEFORE UPDATE` — sin conflicto |
| 5.12 | Si la columna se renombra antes del deploy, **toda lectura** de `actividades` devuelve 42703 | **NUNCA FUE CIERTO** | ver abajo |
| 5.13 | "El código lee y escribe `fecha_entrega_final` a través de una **vista o alias**" | **NUNCA FUE CIERTO** | ver abajo |
| 5.14 | La `key: 'fecha_entrega'` del filtro es un identificador de UI, no una columna, y se persiste | **VIGENTE** | `src/features/tasks/utils/act-filters/grupos/fechas.ts:11-12` — `match: (a, v) => enRango(v, a.fecha_entrega)` es un predicado en JS. Se persiste en `vistas_filtro.valores` (jsonb) vía `useFilters/vistas.ts:27` y en `localStorage` vía `useFilters/estado-local.ts:23`. **La decisión de dejarla como está es correcta** |
| 5.15 | La clave de `localStorage` es `eminat:<userId>:filtros:<ambito>` | **VIGENTE** (mal citada) | el formato está en `src/shared/hooks/useUserPreference.ts:16` (`userPrefKey`), no en la `:19`; el segmento `filtros:` lo agrega `useFilters/estado-local.ts:23` |
| 5.16 | §2.10: el `CHECK` de `actividades` declara seis valores contra los cuatro de `ESTADO` en TS | **VIGENTE** | `actividades_estado_check`: `Pendiente, En proceso, Completado, Por aprobar, Rechazado, Cancelado` |
| 5.17 | El renombre se puede hacer con un reemplazo dirigido | **RIESGO NO DICHO** | ver abajo |

### 5.12 — la lectura no rompe: rompe en silencio, y lo que rompe ruidosamente son cuatro líneas

Hay **un solo** punto de lectura de actividades en toda la app:
`src/shared/data/actividades.ts:13` → `.select('*')`. No existe ni un `.select()` que enumere columnas
de `actividades`. Con `select('*')`, un renombre **no devuelve 42703**: PostgREST devuelve la fila con
la clave nueva, el index signature de `Actividad` (`loadAppData.ts:98`) la acepta sin chistar, y
`a.fecha_entrega` pasa a valer `undefined` en todos lados. El Gantt se aplana, el badge *vencida*
deja de pintarse, el filtro de entrega deja de filtrar y "próximas entregas" queda vacío — **sin un
solo error, ni en consola ni en red**.

Lo que sí falla, y ruidosamente, son los **cuatro writes**:
`src/shared/data/actividades.ts:29-30` (`updateFecha`, donde el nombre del parámetro *es* el de la
columna por shorthand) y `src/features/tasks/hooks/useActividadForm/payload.ts:16` y `:32`.

Esto invierte la premisa del expand/contract de §3.3. El apagón que el diseño teme —"toda lectura
devuelve 42703 durante la ventana"— no existe; el que sí existe es peor de encontrar y no se ve en
los logs. Y significa que la ventana migración↔deploy de esta fase **no se puede detectar mirando
errores**: hay que mirar la pantalla.

### 5.13 — no hay vista ni alias que sirva, y no hay precedente en el repo

Tres cosas, cada una suficiente:

1. **PostgREST aliasea sólo el `select`.** Los `UPDATE`/`INSERT` van por el nombre real de la columna,
   así que los cuatro writes de 5.12 no se pueden cubrir con un alias. Es el mismo hallazgo que ya
   apareció en la fase 1.
2. **No hay un `select` enumerado que aliasear.** El único read es `select('*')`, que por definición
   no admite alias.
3. **No hay precedente de aliasing en el repo**: cero `select('alias:columna')` en `src/`. Lo único
   parecido es desambiguación de FK en embeds (`src/shared/data/usuarios.ts:23`), que es otra cosa.

Y una vista tampoco resuelve: no puede llamarse `actividades` mientras exista la tabla, así que
habría que cambiar `TABLES.actividades` — es decir, tocar el código igual.

La salida realista es la que el diseño menciona al pasar y descarta: **hacer el renombre y el deploy
juntos, fuera de horario, y decirlo**. O tolerar dos nombres a la vez con una columna generada, que es
trabajo que la fase no tiene presupuestado.

### 5.10 y 5.17 — el patrón ya existe en la base, con el bug que §2.7 describe

`reunion_pendientes` ya tiene el par `fecha_original` / `fecha_comprometida` y el trigger
`proteger_fecha_original()` (`trg_fecha_original`, `BEFORE INSERT OR UPDATE`). El diseño no lo cita
ni una vez, ni en §2.7 ni en §3.3, y lo presenta como un patrón importado de MS Project / PMI.

Lo llamativo es que el precedente trae **exactamente** la falla que §2.7 corrige, en su otra mitad:
congela en `INSERT` sin preguntar si hay plazo (`NEW.fecha_original := NEW.fecha_comprometida`), y en
`UPDATE` sólo revierte si alguien intenta tocar la original — nunca la estampa después. O sea que una
fila nacida sin plazo se queda con `fecha_original = NULL` para siempre, aunque después se le ponga
uno. La guarda nueva (`OLD.fecha_entrega_original IS NULL AND OLD.fecha_entrega_final IS NULL`) lo
arregla, pero conviene saber que la fase **borra el único precedente** junto con la tabla y que la
lección no está anotada en ningún lado.

Dos consecuencias más de la forma `NEW := OLD` ("revierte, no rechaza"), no dichas:

- la columna queda **inmodificable para siempre**, incluso para el admin y para un backfill futuro:
  cualquier `UPDATE` de corrección se revierte en silencio. Un backfill tendría que desactivar el
  trigger. Es coherente con el "se congela y punto" de §2.7, pero conviene que esté escrito.
- el renombre **no se puede hacer con un `sed` global**: `20260612193730:669-670` tiene
  `fecha_entrega_estimada` y `fecha_entrega_real`, que son de la tabla **`solicitudes`** y no se
  tocan. Y `src/features/tasks/types.ts:45` es `NuevaActForm.fecha_entrega`, el estado de un
  `<input type=date>`, no la columna: renombrarlo es una elección aparte. `COLUMNS`
  (`src/shared/data/tables.ts:38-42`) sólo centraliza `created_at`/`updated_at`/`online_at`, así que
  no hay un lugar único donde tocarlo.

---

## Fase 6 — `responsable_id` nullable y la mudanza de carpeta

Secciones verificadas: §2.6, §5 (párrafo final), §7.

| # | Supuesto del diseño | Veredicto | Evidencia |
|---|---|---|---|
| 6.1 | `actividades.responsable_id` es `NOT NULL` hoy | **VIGENTE** | columna viva; el `SET NOT NULL` está en `20260811235816_drop_responsable_ref.sql:12` |
| 6.2 | "Las 429 filas lo tienen cargado, así que el `DROP NOT NULL` no mueve datos" | **NO VERIFICABLE EN LOCAL** | local: 267 filas, 0 con `responsable_id IS NULL`. El sentido se sostiene; el número es de prod |
| 6.3 | El `<select>` sale de `deriveMiembrosAsignables`, que filtra por tener el módulo | **VIGENTE** | `src/shared/context/team-derivations/index.ts:38-41`, ya con `MODULE.OPERATIONS` |
| 6.4 | `crearActividad` corta con `assigneeRequired` | **VIGENTE** | `src/features/tasks/hooks/useActividadForm/index.ts:88` (el diseño no da línea; el guard no está en 105) |
| 6.5 | Los participantes de un acta son cualquier usuario y también externos | **VIGENTE** | `src/features/reuniones/types.ts:37-46` |
| 6.6 | "Es lo que `reunion_pendientes` permitía" | **VIGENTE** | `reunion_pendientes.responsable_id` es nullable |
| 6.7 | "Toca: el `NOT NULL`, el guard de `useActividadForm`, y tolerar el `null` en `datosPorMiembro`, `resumenHoras` e `idsTeam`" | **NUNCA FUE CIERTO** | ver abajo |
| 6.8 | Hay tipos TS que declaran `responsable_id` no nullable y habría que tolerar el `\| null` | **NUNCA FUE CIERTO** | ver abajo |
| 6.9 | Una tarea sin responsable no aparece en ninguna hoja de pago, "que es lo correcto" | **VIGENTE**, con más alcance del dicho | ver abajo |
| 6.10 | El `DROP NOT NULL` habilita el caso de uso | **INCOMPLETO** | el FK `actividades_responsable_id_fkey` **no** tiene `ON DELETE SET NULL`, y `admin_reassign_and_delete` aborta si quedan actividades del usuario viejo. Volver la columna nullable no habilita por sí solo borrar un usuario |
| 6.11 | "**162 archivos**" para la mudanza | **NUNCA FUE CIERTO** | ver abajo |
| 6.12 | "`src/features/tasks/types.ts` tiene una DEUDA anotada… **21 archivos** traen `Actividad` desde ahí; 29 importan algún tipo" | **NUNCA FUE CIERTO** (los dos números) | son **24** y **30**. El comentario del propio archivo (`types.ts:1-5`) dice 21 y está desactualizado |
| 6.13 | La mudanza no rompe configuración | **VIGENTE** | `tsconfig.json:24-28` (`@/*` genérico), `next.config.js` (`dirs: ['src']`), `tailwind.config.js`, `vitest.config.ts`, `playwright.config.ts`: ninguna nombra un feature |
| 6.14 | La mudanza es "un diff de renombres" | **INCOMPLETO** | ver abajo |
| 6.15 | Al mover, hay que cerrar la deuda del CLAUDE.md en tres lugares (§7) | **VIGENTE** | la tabla de módulos, el párrafo de `deriveMiembrosAsignables` y el árbol de `src/` mienten hoy |
| 6.16 | El `.todo` tiene anotada la cláusula de confidencialidad diferida (§2.1) | **VIGENTE** | `~/.local/share/todo/eminat-app/.todo/TODO.md:1176-1186` |

### 6.7 — los tres derivados no rompen; el que rompe es el payload, y no está en la lista

Los tres que el diseño manda tolerar viven en `src/features/tasks/hooks/useTablero/index.ts` y
**ninguno de los tres necesita cambio**:

- `idsTeam` (`:96`) sale de `miembrosAsignables`, no de actividades.
- `datosPorMiembro` (`:97-104`) y `resumenHoras` (`:109-120`) iteran **sobre `idsTeam`** y filtran con
  `a.responsable_id === id`. Con `null`, la comparación da `false` para todos: la actividad
  desaparece del ranking. Sin crash, sin fila fantasma, sin agrupación bajo `undefined`. Los
  `.filter(d => d.total > 0)` y el `Math.max(…, 1)` ya cubren el caso degenerado.

El único sitio que rompe de verdad es **`src/features/tasks/hooks/useActividadForm/payload.ts:22`**,
que manda `responsable_id` crudo. El formulario usa `''` para "sin asignar"
(`useActividadForm/index.ts:13` y `:52`), así que sacar el guard de `:88` sin tocar el payload manda
`''` a una columna `uuid` y Postgres aborta. El contraste está en el mismo archivo: `fecha_entrega`
sí se normaliza con `|| null` en la línea 32. La lista de §2.6 tiene tres ítems que no hacen falta y
le falta el que sí.

Fuera de esos, revisé quince consumidores más de `responsable_id`: ninguno usa `!` (no hay una sola
non-null assertion en el repo) y casi todos ya toleran el null con `?? '—'` o `?? ''`
(`TaskTableRow:33`, `RecentActivityRow:25`, `GanttBar:39`, `KanbanTaskCard:20`, `report-html:37`,
`act-filters/grupos/gente.ts:23`). `report-filter.ts` **ya declara** `responsable_id?: string | null`.

### 6.8 — el tipo ya es opcional, y `strict: false` desarma la red

`Actividad.responsable_id` está declarado **`responsable_id?: string`** en
`src/shared/context/loadAppData.ts:69`. El `responsable_id: string` no-nullable existe, pero es de
`NuevaActForm` (`src/features/tasks/types.ts:40`), el estado del formulario.

Y `tsconfig.json:11` tiene **`"strict": false`**: con `strictNullChecks` apagado, agregar `| null` no
produce **ni un solo error** de `tsc --noEmit`. La consecuencia para la fase es directa: el
compilador no va a señalar ningún sitio a revisar. La lista de 6.7 es la única red que hay, y el
método de trabajo tiene que ser el grep, no el typecheck.

### 6.9 — desaparecer de la hoja de pago no es lo único que pasa

Es correcto que una tarea sin responsable no entre a la nómina. Pero por el mismo mecanismo
desaparece también del ranking de `datosPorMiembro`, del `resumenHoras`, y **del filtro de área**:
`act-filters/grupos/gente.ts:23` la indexa por `a.responsable_id ?? ''` y `distinctValues` hace
`.filter(Boolean)` (`src/shared/utils/filters/defs/index.ts:26`), así que `null` no genera opción
fantasma — pero la tarea queda fuera de todo filtro por persona o por departamento. El riesgo que §8
nombra ("tareas invisibles en el tablero") es real y tiene cuatro superficies, no una, y ninguna
muestra un aviso.

### 6.11 y 6.14 — son 119 archivos, y el trabajo está en otro lado

| | |
|---|---|
| archivos bajo `src/features/tasks/` | **116** (51 `.ts` + 37 `.tsx` + 28 `.css`) |
| archivos externos que importan `features/tasks` | **3** — `src/app/(app)/operations/page.tsx`, `StratixModule/index.tsx`, `StratixContent/index.tsx` |
| **total** | **119** |

162 no sale de ningún conteo reproducible. Y el número engaña en la dirección equivocada: el costo
real son los **54 archivos internos que se importan entre sí con la ruta absoluta
`@/features/tasks/…`** — un `git mv` los rompe a todos. Uno usa ruta relativa (`utils/act-form.ts:3`,
`from '../types'`) y se saltea cualquier `sed` sobre el alias.

Dos cosas más que "un diff de renombres" no cubre:

- **La i18n no se muda con la carpeta.** `src/features/tasks/` consume **144 claves `stratix.*`** (de
  208 que hay en `es.json`). Después de la mudanza, el módulo `operations` seguiría pidiendo
  `stratix.col.due`, `stratix.new.assigneeRequired`, etc. Renombrar el namespace o no es una
  decisión que la fase tiene que tomar explícitamente; hoy no está planteada. Como referencia:
  `reuniones.*` son 62 claves y `tasks.*` son 3.
- **Los símbolos tampoco.** `TasksProvider`, `TasksContext`, `useTasks`, `TasksModule`,
  `TasksContent`, `TASKS_TAB_PREF = 'tab-tasks'` siguen diciendo `tasks` después de la fase 1. Si la
  mudanza los renombra, el diff crece; si no, la carpeta dice `operations` y el código dice `tasks`.
  Notar que `TASKS_TAB_PREF` es una preferencia **persistida** en `localStorage`
  (`eminat:<userId>:tab-tasks`): renombrar la constante pierde la pestaña guardada de cada usuario,
  igual que pasó con el `ambito` de filtros en la fase 1 — con la diferencia de que aquella sí se
  migró en SQL (`20260909233746:101-105`) y ésta no tiene tabla que migrar.

`src/features/reuniones/` es el precedente de la superficie mínima: **3** importadores externos, la
thin route entra por el barrel, y sólo `shared/data/reuniones/*.ts` cruza a `types` — dos imports que
van de `shared` a un feature, contra la dirección normal.

---

## Resumen

| Fase | Supuestos verificados | VIGENTE | VENCIDO | NUNCA FUE CIERTO |
|---|---|---|---|---|
| **3** | 34 | 22 | 3 | 8 (uno compartido con la 4) |
| **4** | 15 | 11 | 0 | 3 (+1 parcial) |
| **5** | 17 | 11 | 0 | 4 |
| **6** | 16 | 8 | 0 | 4 |

**Lo que más conviene mirar antes de escribir nada:**

1. La absorción del slug `reuniones` (3.9, 3.10) quedó fuera de la ventana que §8 exige, y de ella
   dependen las policies de la fase 3 y el conjunto de gente que puede hacer los dos `INSERT` (3.34).
2. `pnpm db:rls` no prueba lo que §8.2 dice que prueba (3.33), y las fases 3 y 4 son las que estrenan
   RLS.
3. `proteger_acta_cerrada()` existe y el diseño no lo conoce (3.29, 4.10).
4. El apagón de la fase 5 es silencioso, no ruidoso, y la vista/alias que lo evitaría no existe
   (5.12, 5.13).
5. El modal de la fase 3 necesita la columna nullable de la fase 6, que va última (3.28).
