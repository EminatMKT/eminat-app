# Fase 1: plataforma modular LILLY y absorción de ANNIE
Fecha: 2026-10-12. Diseño propuesto; no configuración, migración ni despliegue.

## Decisiones y evidencia
LILLY: `EminatMKT/eminat-app`, baseline `e345a65670b576e255fff8807bf00151727a6c26`.
ANNIE: `EminatMKT/annie`, main inspeccionado `a8e562208cfd2f7d3ea6ea0617afb37619ac8189`.
Meet → LILLY técnico y validación Diana se aceptan cerrados según instrucción del usuario. Solo se reabre el circuito notificaciones/email/PDF.
No se consultaron datos privados de Production, credenciales, QuickBooks, Payments ni Memberships de programa.
La fuente inspeccionada de ANNIE es main: no prueba de que ese SHA esté desplegado.
Los hallazgos de tablas se basan en schema/migraciones/repositorios, no en inventario vivo de Production.

Referencias LILLY: CLAUDE.md (pertenencia y atribución), src/shared/auth/permissions/, src/shared/schema/, supabase/migrations/, APIs Tasks/Meetings.
Referencias ANNIE: prisma/schema.prisma, migración CRM Core 202609210001, apps/api/src/auth.ts, policy.ts, crm/controller.ts, crm/service.ts; puente apps/web/app/api/crm/[...path]/route.ts; docs CRM_CORE, IDENTITY_EMAIL_ROLES y COMMERCIAL_INTEGRATION_CONTRACTS.
El documento CRM_CORE de ANNIE describe una fase anterior: nombres SELLER/ANNIE_ADMIN y ausencia de actividades no sustituyen el esquema/código actual OPERATOR/SUPERADMIN y las proyecciones de integración.

## LILLY Core: contratos y propietarios
Cada módulo consume contratos Core; no recrea auth, directorio, tenancy o transporte.

| Core | Responsabilidad | Contrato propuesto / fuente |
| --- | --- | --- |
| Auth | Sesión única, login/logout/revocación | Identidad verificada issuer+subject; adaptador del Supabase Auth existente; nunca compartir contraseñas |
| Users | Persona de plataforma única | User UUID estable + referencias externas verificadas; distinguir auth.uid de usuarios.id |
| Organizations | Tenant activo, membresías y unidades operativas | Organization de seguridad separada de empresa/marca operativa; una org activa por request, varias memberships permitidas |
| Roles / Permissions | Decisión central por acción y registro | authorize(user, org, module, action, resource), permisos explícitos, scope en servidor y base; UI solo refleja |
| Audit | Trazabilidad de comandos y lecturas sensibles | Actor, org, módulo, recurso, resultado, request/correlation ID; cambios atómicos con escritura de negocio |
| Notifications | Inbox de usuario y notificación transaccional | Evento versionado, destinatarios, outbox, dedupe, entrega/rebote y retries; Communications conserva consentimiento/campañas |
| Files | Metadatos y acceso a archivos/PDF | Org/recurso/versión/hash, URL temporal autorizada; artefacto inmutable para cada envío |
| Integrations | Adaptadores externos y referencias | Namespace sistema+org+tipo+ID; inbox/outbox, firma/replay, contrato versionado; sin tokens en navegador |

Core no es propietario de clientes comerciales, oportunidades ni Tasks. Organizations tampoco debe convertirse en el maestro de clientes CRM.
La normalización de identidad es futura: no cambia IDs históricos ni permisos existentes en esta fase.

## Registro modular y activación
Proponer ModuleManifest: slug, versión, rutas, permisos, dependencias Core, eventos/contratos, health y capacidades.
Proponer OrganizationModule: organizationId+moduleSlug únicos, estado enabled/disabled, configuración mínima y versión; cambios solo por administrador de esa organización con auditoría.
Estos son contratos de diseño, NO tablas creadas en esta fase.
En cada request: validar sesión → resolver identidad/membership → validar org activa → comprobar módulo/dependencias habilitados → autorizar acción y scope → ejecutar comando con auditoría.
Deshabilitar módulo bloquea sus rutas/APIs y productores de eventos; conserva datos y acceso administrativo autorizado para exportación. No elimina registros ni rompe referencias históricas.
Workers verifican org, entitlement y estado del evento antes de actuar. Deshabilitar no borra colas; pausa operaciones nuevas y exige política explícita de drenado.
Ningún parámetro org del navegador concede acceso. Reports, Files y búsqueda deben heredar el mismo scope.
No sustituir RLS actual ni copiar los roles ANNIE por nombre: matriz de capacidades explícita y pruebas de denegación por tenant.
El administrador global de LILLY no se convierte automáticamente en SUPERADMIN ANNIE.

| Módulo | Propietario de negocio | Límite |
| --- | --- | --- |
| Home | Navegación y resumen | Consume proyecciones autorizadas; sin maestros de negocio |
| Tasks | Actividades, responsables, estados y vencimientos | public.actividades y relaciones actuales; Meetings/CRM enlazan por ID |
| Meetings | Reuniones, convocatoria, asistencia y actas | Maestro actual LILLY; Tasks canónicas permanecen en Tasks |
| CRM | Leads, Contacts, Accounts y vínculos | ANNIE mantiene fuente durante transición |
| Sales | Pipeline, oportunidades y cierres comerciales | Opportunity/Pipeline ANNIE; no incluye cambios a Payments |
| Projects | Proyectos, hitos y vínculos a Tasks | Futuro contrato; sin copiar actividades |
| Medical | Dominio clínico existente | No equiparar paciente/contacto clínico con Contact comercial |
| Research | Investigación y leads clínicos existentes | research_leads no se fusiona con Lead comercial |
| Directory | Directorio de empresas/unidades/personas | Referencias Core/operativas; no clientes CRM duplicados |
| Finance | Contabilidad y proyecciones financieras | Futuro contrato; QuickBooks Production fuera de fase |
| Communications | Consentimiento, plantillas y comunicaciones comerciales | Mantener ANNIE como dueño actual de consentimiento/campañas |
| Reports | Vistas agregadas y exportación autorizada | Lecturas/versiones, sin segunda fuente mutable |
| Admin | Entitlements, configuración y administración | Usa Core; nunca acceso implícito por interfaz |

Dependencias de negocio: Meetings → Tasks; Projects → Tasks; Sales → CRM; Reports consume contratos de módulos activos.
Los módulos publicados como futuros no implican que sus rutas o tablas estén implementadas hoy.

## Compatibilidad actual
| Aspecto | ANNIE | LILLY | Conclusión |
| --- | --- | --- | --- |
| Auth | Sesión nativa opaque annie_..., token hash, cookies HttpOnly; modo OIDC verifica RS256/ES256, issuer/audience y exp | Supabase Auth JWT, perfil por auth_id, SSR | NO plug-and-play. Validar issuer/JWKS/audience/algoritmo y mapeo antes de SSO |
| Users | Principal UUID, issuer+subject único; Membership por org | usuarios.id distinto de auth_id; equipo/rol/pertenencia propios | NO identidad intercambiable. Necesario external identity map verificable |
| Organization | Organization UUID + Membership activo obligatorio + X-Organization-Id | empresa_id es pertenencia; marca de actividad es atribución, no tenant equivalente | NO equivalencia directa. Tenant mapping y política de pertenencia deben aprobarse |
| Roles | OPERATOR, SALES_MANAGER, ADMINISTRATOR, SUPERADMIN, AUDITOR, FINANCE; scope propio/equipo/shares | role_modules y permisos/scopes propios | Traducir capacidades; no transferir grants externos sin verificación |

## Auditoría de las cuatro entidades
Fuente actual de las cuatro entidades comerciales: PostgreSQL de ANNIE, modelos Lead, Contact, Account y Opportunity.
No se identificó en las migraciones LILLY inspeccionadas un maestro comercial equivalente de esas cuatro entidades.
LILLY research_leads y paciente_contactos pertenecen a otros dominios: similitud de nombre no demuestra duplicidad.
No se auditó su contenido interno ni se propone modificarlo.

| Entidad | Campos/relaciones canónicos conservados | Decisión y transición |
| --- | --- | --- |
| Lead | UUID, org, owner, team, versión, autores/fechas, archive; fuente, pipeline, restricciones contacto, originContact, converted* | Conservar ANNIE; exponer adaptador CRM LILLY. Conversión idempotente conserva historia y referencias |
| Contact | UUID/scope/audit, primaryAccount, AccountContact N:M, restricciones/consentimiento y originLeads | Conservar; no fusionar por email ni con pacientes/usuarios; merges solo tras revisión futura explícita |
| Account | UUID/scope/audit, nombre/comercial/direcciones/tipo; CommercialRelationship y OperatingCompanyReference | Conservar cliente comercial separado del tenant y del directorio de empresas operativas |
| Opportunity | UUID/scope/audit, Account, Contact principal y N:M, Stage/Pipeline, Decimal(18,2), currency, fechas, cierre | Conservar backend ANNIE; módulo Sales usa proyección autorizada y transiciones existentes |

Todos tienen organizationId, ownerProfileId, teamId opcional, version, timestamps y autores.
FKs SQL compuestas (organizationId, id) unen Account/Contact/Opportunity/Stage; propietario referencia Membership(principalId, organizationId). No trasplantar UUIDs sueltos.
ANNIE API exige Bearer + X-Organization-Id, valida alcance en consulta y escritura; If-Match protege concurrencia y conversión exige Idempotency-Key.
CrmHistory/AuditEvent se escriben transaccionalmente, con protección SQL contra update/delete. Deben conservarse, no recrearse como historia nueva.
Frontend usa puente de mismo origen /api/crm, cookies server-side y control de origin; no entregar token de integración al cliente LILLY.
Endpoints comerciales /api/v1/{leads,contacts,accounts,opportunities}, relaciones, conversión e historial se conservan; contrato de error/requestId también.

## Duplicidades, datos y colisiones
Código ANNIE advierte POSSIBLE_DUPLICATES por nombre/email/teléfono dentro del scope visible, máximo cinco candidatos; no garantiza unicidad comercial ni detecta todo un tenant desde cuenta limitada.
No se fusionan duplicados automáticamente. Opportunities no tiene esa misma advertencia en duplicates().
Datos reales, demo y conteos cruzados: NO VERIFICADOS con sesión/consulta autenticada de Production. El reporte QA histórico fechado 2026-09-22 describe pruebas sintéticas y entrega externa deshabilitada; no sustituye inventario actual.
Clasificación futura de procedencia: sistema, org, import job/seed/fixture y fuente; no inferir demo por nombre o por ausencia de movimientos.
Riesgo principal: colisión semántica de organizaciones, identidad, roles y clientes; UUID improbables no eliminan colisiones por imports/reuso.
Usar referencia única (sourceSystem, sourceOrgId, entityType, sourceId) → canonicalId, conservando IDs ANNIE en la fachada. Nunca casar por UUID/email/empresa textual automáticamente.
Lecturas de inventario futuras deben ser autorizadas, paginadas y minimizadas; fingerprint scoped, conteos de FKs huérfanas, UUIDs repetidos y separación real/demo; sin mutaciones.

## Absorción gradual sin doble escritura
1. Fase actual: diseño, contratos y fix de actas. ANNIE sigue operativa y canónica; ninguna migración.
2. Aprobar tenant/identity mapping y capacidades; contratos SSO aislados con usuarios QA, pruebas cross-tenant, revocación y roles sin escalación.
3. Fachada LILLY CRM/Sales con adapter server-to-server: ANNIE único escritor/lector comercial; proyecciones cache identificadas, sin tablas CRUD paralelas. Kill switch por org.
4. Validar paridad de campos, relaciones, auditoría, rendimiento y accesibilidad con contratos; read-only primero. Tasks/Meetings se referencian en LILLY.
5. Solo si se decide mover almacenamiento: inventario real/demo, backup/restauración comprobados, mapping reversible, ventana aprobada, checksum por org/entidad, reconciliación de FK/historial y cutover de escritor único.
6. Backend/rutas ANNIE pueden permanecer legacy durante compatibilidad; retirada posterior requiere parity y rollback aprobados. Nunca dos maestros activos ni borrado de tablas en esta fase.

Viabilidad arquitectónica: VIABLE; puesta en marcha/migración aún condicionada a mapping, SSO y evidencia de datos. Riesgo ALTO si se intenta absorción directa hoy.
Rollback de fachada: desactivar por org y regresar a UI ANNIE conservando el mismo backend y registros. No DNS ni redirect durante esta fase.

