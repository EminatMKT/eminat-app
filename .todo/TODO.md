# TODO — eminat-app · Research Module (Eminat Research Group)

> Proyecto: `eminat-app` · rama de trabajo: `development` → merge a `main`
> Módulo principal: `app/components/ResearchModule.tsx`
> Scope confirmado en reunión 2026-06-09 con Federico Salviche y Freddy Crespin

---

## Q1 — Urgente e Importante

- [ ] **[Dashboard] Panel embudo (Funnel Chart)** — Agregar visualización tipo funnel en el tab `dashboard` de `ResearchModule.tsx` (línea ~238). Debe mostrar el flujo completo: Identificado → Calificado → Outreach → Contacto → Discovery/Feasibility → Docs → Negociación → Awarded, con cantidad de leads y tasa de conversión entre etapas. Pedido explícito de la reunión para visibilidad a la dirección. _(creado por: SmithDR · 2026-06-09)_

- [ ] **[API service] Crear `lib/clinicalTrialsService.ts`** — Función `fetchStudyByNCT(nct: string)` que hace GET a `https://clinicaltrials.gov/api/v2/studies/{NCT}` y retorna los campos mapeados: `briefTitle`, `conditions`, `phase`, `studyType`, `overallStatus`, `locationCountries`, `leadSponsorName`. Manejo de errores: 404 → "NCT no encontrado", red/timeout → "Error al consultar ClinicalTrials.gov". _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

- [ ] **[Form] NCT# autocomplete en modal New Lead** — En el modal `modalNewLead` (línea 780), al salir del campo `nct` (onBlur), llamar a `fetchStudyByNCT` y autocompletar: `official_title`, `conditions`, `phase`, `study_type`, `status`, `countries`, `lead_sponsor`. Campos que siguen manuales: `contact_name`, `email`, `phone`, `stage`. _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

- [ ] **[Tema] Toggle claro/oscuro no funciona** — 🔄 **En PR #17, pendiente review del superior.** Resuelto: getTheme(dark)/useTheme + N-temas; toggle themea contenido, home, sidebar/topbar/submenú; research y accounting reconciliados. Falta solo el OK visual del superior para mergear (puede pedir que ciertas partes vayan siempre oscuras). _(creado por: EminatMKT · 2026-06-19)_

---

## Q2 — Importante, No Urgente

- [ ] **[UI] Loading + error en campo NCT#** — Spinner inline mientras busca, mensaje de error bajo el input si el NCT no existe o falla la API. Deshabilitar el campo durante la búsqueda para evitar doble request. _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

- [ ] **[UI] Indicador visual en campos autocompletados** — Badge o ícono sutil en los campos que fueron llenados desde la API (fondo `#7C6FF720`). Permite saber qué vino de ClinicalTrials.gov vs. lo que llenó el usuario. _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

- [ ] **[Dashboard] Métricas de esfuerzo administrativo** — Panel que cuente y muestre: total de actividades (calls + emails + meetings) por stage. Federico pidió visualizar el esfuerzo detrás de cada conversión para reportarlo a la dirección. Datos disponibles en tabla `research_activities`. _(creado por: SmithDR · 2026-06-09)_

- [ ] **[Testing] Tests de integración del cableado de sesión** — La lógica pura (`lib/session/`) ya tiene 7 tests con Vitest; falta cubrir el glue React/DOM de `lib/AppContext.tsx`, hoy solo verificado por build + pruebas manuales: (1) se renderiza la pantalla de error estable ante `loadProfile` no-ok en vez de la UI zombie; (2) `clearAuthCookies()` borra las cookies `sb-*` antes de redirigir; (3) `handleLogout` y el botón "Ir al login" hacen hard redirect sin bucle. Requiere setup de jsdom + `@testing-library/react` + mocks de `supabase`/`next-navigation`. Contexto: commit 47e69d2. _(creado por: SmithDR · 2026-06-12)_

- [ ] **[Tooling] Integrar CodeRabbit para review automático de PRs** — Revisor IA always-on en cada PR (resúmenes + comentarios línea por línea), buen fit para equipo chico sin revisor humano dedicado y stack Next/TS/Supabase. **Antes de integrar, resolver dos gates:** (1) verificar pricing del repo privado (tier free limitado, repo privado es de pago por asiento); (2) **ok de compliance de Freddy** — CodeRabbit manda el código fuente a un servicio externo, y el repo toca módulos médicos (HIPAA), RRHH y finanzas. Pasos: instalar el GitHub App en la org EminatMKT (admin, vía browser) + agregar `.coderabbit.yaml` pre-configurado (Claude puede armarlo: español, paths sensibles, foco en seguridad RLS/auth). Convive con `/code-review` y `ultrareview` de Claude Code. _(creado por: SmithDR · 2026-06-12)_

### Epic — Fase 3 (post-refactor) · arquitectura + datos a DB _(creado por: EminatMKT · 2026-06-19)_
> Fase 2 (descomposición by-feature de todos los módulos) cerrada en PRs #4–#14. Lo que sigue.

- [ ] **[Refactor] Desmenuzar Launchpad** — `app/(app)/page.tsx` (496 líneas, 5 componentes en un solo archivo: ModuleIcon/LaunchpadPage/VerTodoBanner/LaunchCard/EmptyState) → un componente por archivo + feature overview/launchpad. _(EminatMKT · 2026-06-19)_
- [ ] **[Refactor] Desmenuzar login** — `app/login/page.tsx` (294 líneas) → subcomponentes; mover los dominios autorizados a config/DB. _(EminatMKT · 2026-06-19)_
- [ ] **[Refactor] Evaluar AppShell / Onboarding** — `shared/components/AppShell.tsx` (308) y `Onboarding.tsx` (245): descomponer si aplica. _(EminatMKT · 2026-06-19)_
- [ ] **[Refactor] Helpers comunes en API admin** — Rutas create/delete/reassign/update-user (150-245 líneas c/u) comparten validación, cliente supabase admin y manejo de errores → extraer helpers. _(EminatMKT · 2026-06-19)_
- [ ] **[Tema] Reconciliar accounting y research a los tokens de tema** — 🔄 **Hecho en PR #17, pendiente review.** research (`RESEARCH_THEME`→`useResearchTheme`) y accounting (Tailwind claro→tokens `useApp`) ya consumen los tokens dark-aware. Pendiente: merge de #17. (El StatCard compartido a `shared/` sigue como follow-up por el theming.) _(EminatMKT · 2026-06-19)_
- [ ] **[DB] Migrar seed/hardcode a la base de datos** — Data que hoy vive en código: `features/stratix-mkt/data.ts` (social/competencia), roster (`roster-data.ts`, MIEMBROS_REFS) y constantes de dominio de AppContext → mover a tablas en Supabase (dev + prod). **Ojo: ya existen tablas subutilizadas** — `departamentos` (codigo/nombre/color/icono/activo) + `usuarios.departamento_id` mientras `shared/constants/directorio.ts` hardcodea `DEPS_DIR` + `DIRECTORIO_DATA` (54 personas); `dominios_corporativos` mientras el login hardcodea los dominios; `areas` para los leaders/subAreas de MODULE_META. Migrar tabla-por-tabla (cada una su PR), no todo junto. Para los colores: usar los por-entidad ya en DB (`departamentos.color`/`areas.color`/`usuarios.color`); las paletas fijas (`COLORES_AVATAR`/`ESTADO_COLORS`) se quedan en código. _(EminatMKT · 2026-06-19)_
- [ ] **[DB] Control de acceso configurable por el superadmin** — 🔄 **En diseño** (spec: `docs/superpowers/specs/2026-06-23-dynamic-roles-design.md`, rama `feature/dynamic-roles`). Tablas `roles`+`role_modules`; pantalla en Admin para que el superadmin cree tipos y asigne/quite módulos; `shared/auth/permissions.ts` pasa a leer de la DB en vez de la matriz hardcodeada. Modelo: `key` fija + `label` editable + `activo` (soft delete) + `is_system` (protege admin) + módulos. Edge enforcement diferido (ítem siguiente). _(EminatMKT · 2026-06-19)_
- [ ] **[Auth] Edge enforcement de módulos (auth hook)** — Construir el `custom_access_token_hook` de Supabase para que `middleware.ts` bloquee los módulos en el Edge leyendo `module_slugs` del JWT (hoy el middleware hace fail-open; el gate real es client-side + RLS). Retomar SOLO después de completar la feature de roles dinámicos. Requiere habilitar el auth hook a mano en Supabase dev (`ydcadspinryybextlvyi`) y prod (`ruedelunbtaomhrzgelc`) — no lo cubre `db push`. Ceiling: los cambios de permiso aplican al refrescar el token (~1h). _(creado por: EminatMKT · 2026-06-23)_

- [ ] **[Auth] Auditoría de cambios de permisos (decisión)** — Existe tabla `historial` en el esquema. Decidir si se audita quién crea/edita/borra un rol y quién cambia el rol de un usuario. Relevante por compliance: el sistema toca módulos médico (HIPAA), RRHH y finanzas, donde un trail de cambios de privilegios suele ser esperable. Opciones: (a) loguear en `historial` desde la API de roles/usuarios dentro de la feature de roles dinámicos; (b) ticket follow-up; (c) no auditar. **Definir antes de cerrar el plan de implementación de roles.** Ver `docs/superpowers/specs/2026-06-23-dynamic-roles-design.md` § Decisiones pendientes. _(creado por: EminatMKT · 2026-06-23)_

- [ ] **[Admin] UI reutilizable de carga CSV** — Para que Freddy cargue data masiva en prod (directorio, etc.) sin tocar código. Separar: (1) seed inicial de lo hardcodeado = SQL one-time, sin UI; (2) carga continua = esta UI. **Reusar** el import/export CSV que ya tiene cobranzas (componente compartido de parseo + preview), con **validación por tabla destino** (no un importador genérico "cualquier CSV → cualquier tabla", eso es over-engineering). Construir solo cuando haya una tabla concreta que Freddy mantenga seguido. _(creado por: EminatMKT · 2026-06-23)_

---

## Q3 — Urgente, No Importante

- [ ] **[Validación] Formato NCT# antes del fetch** — Regex `/^NCT\d{8}$/i` antes de disparar la búsqueda. Normalizar a uppercase. Mostrar error de formato sin llamar a la API. _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

---

## Q4 — No Urgente, No Importante

- [ ] **[Cache] Caché en memoria para NCT# ya consultados** — `Map<string, ClinicalTrialStudy>` para evitar re-fetch del mismo NCT# en la misma sesión. _(rescatado del TODO anterior · SmithDR · 2026-06-09)_

- [ ] **[Tema] Loading/splash impone modo oscuro** — La pantalla de carga del `AppShell` (`app.loading` → `background: '#0A0A0F'`) y `SessionErrorScreen` hardcodean fondo oscuro, así que en modo claro se ve un flash oscuro antes de montar la app. Quedó así a propósito en el PR del tema (#17). Decidir si debe seguir el toggle (usar tokens) o dejarse oscuro como splash intencional. _(creado por: EminatMKT · 2026-06-19)_

- [ ] **[DRY] ComingSoon compartido** — `app/(app)/finanzas/page.tsx` y `app/(app)/th-hr/page.tsx` son placeholders "coming soon" casi idénticos → extraer un `ComingSoon`/`ModulePlaceholder` compartido. Quick win. _(creado por: EminatMKT · 2026-06-19)_

- [ ] **[DRY] Revisar form de usuario admin** — `CreateUserModal` y `EditUserModal` (0.93 similitud) podrían compartir un form de usuario común; revisar diferencias (password solo en create) antes de unificar. _(creado por: EminatMKT · 2026-06-19)_

- [ ] **[Theming] Evaluar migrar a CSS variables (Tailwind-native)** — Hoy el tema son tokens JS en el context (`useApp`): funciona y es consistente con el código inline-style, pero cada cambio de tema re-renderiza todo lo que usa `useApp` y no aprovecha Tailwind. El estándar senior sería CSS variables (`--s1`/`--bg`… en `[data-theme]`): cambiar de tema = flip de un atributo en `<html>`, 0 re-renders React, integración nativa con Tailwind (`bg-[var(--s1)]`) y transición de color suave gratis (mejor con Motion). Migración mecánica pero amplia: cada `style={{ background: s1 }}` → `var(--s1)`, y los componentes dejan de depender del context para color. El registry actual (tokens.ts/getTheme/ThemeName) ya deja el camino listo. Decidir si vale la pena. _(creado por: EminatMKT · 2026-06-19)_

- [ ] **[Convención] Estandarizar imports alias vs relativos** — Dentro de las features los imports internos son relativos (`../theme`, `./Context`, `../../data`) y el alias `@/` se usa solo para cruzar a `shared/` u otras features. Es una convención válida (relativo intra-módulo, alias cross-módulo) pero no está documentada ni verificada. Decidir la regla, anotarla en `features/README.md` y, si se quiere, agregar regla a praxis-guard para hacerla cumplir. No funcional — solo consistencia. _(creado por: EminatMKT · 2026-06-19)_

- [ ] **[Cleanup] Derivar datos calculables en vez de hardcodear** — En `shared/constants/domain.ts`: `MESES_Q`, `mesATrimestre` y los `Q1..Q4` de `TRIMESTRES` son función pura del índice de mes (`Q = Math.floor(i/3)+1`) → calcularlos en vez de mantener los mapas. (`MODULE_PATH_PREFIX` = `'/'+slug` ya se limpia dentro del ticket de roles dinámicos.) No funcional — menos data redundante. _(creado por: EminatMKT · 2026-06-23)_

---

## En espera (bloqueado)

- [ ] **Capacitación de Freddy** — Freddy Crespin debe dar contexto sobre los módulos del CRM y el flujo de trabajo antes de avanzar en tareas adicionales. Próxima reunión de seguimiento agendada la semana del 2026-06-09.
