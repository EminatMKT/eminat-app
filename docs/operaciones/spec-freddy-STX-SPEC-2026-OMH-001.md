![][image1]

**ESPECIFICACIÓN TÉCNICA DE DESARROLLO**

**Operations**  
**Management Hub**

Submódulo: Meeting & Action Tracker

Plataforma destino:  **app.stratixsolutions.us**

Equipo responsable:  **Desarrollo — Stratix Solutions**

Documento:  **STX-SPEC-2026-OMH-001**

*Documento de trabajo interno. Contiene el alcance funcional, el modelo de datos, las reglas de negocio, los flujos y los criterios de aceptación necesarios para construir el módulo de principio a fin.*

Agosto 2026   ·   Versión 1.0   ·   Uso interno**Stratix Solutions**

# **Control del documento**

| Campo | Detalle |
| :---- | :---- |
| Título | Operations Management Hub — Meeting & Action Tracker |
| Código | STX-SPEC-2026-OMH-001 |
| Versión | 1.0 |
| Estado | Aprobado para desarrollo |
| Producto | Stratix Solutions — plataforma app.stratixsolutions.us |
| Tipo | Módulo nuevo, transversal a toda la plataforma |
| Audiencia | Equipo de desarrollo, QA, dirección de marketing |
| Prerrequisitos | Acceso al repositorio, al proyecto Supabase y al entorno de vista previa en Vercel |
| Entregable de referencia | Prototipo funcional HTML entregado junto a este documento |

**Cómo leer este documento.** Las secciones 1 a 5 dan el contexto y el encuadre técnico. La 6 es el modelo de datos y es la base de todo lo demás. La 7 contiene las reglas de negocio numeradas (RN-xx): son de cumplimiento obligatorio y cada una tiene su prueba correspondiente en la sección 19\. Las secciones 9 a 12 describen pantalla por pantalla qué construir. Los anexos traen el DDL listo para ejecutar y el checklist de QA.

| Regla de partida El prototipo HTML entregado no es una maqueta ilustrativa: es la referencia de comportamiento. Ante cualquier duda de interacción no resuelta en este documento, el prototipo manda. Ábralo, use el caso sembrado y reprodúzcalo. |
| :---- |

# **Índice**

# **01  Resumen ejecutivo**

El Operations Management Hub es un módulo nuevo de la plataforma Stratix Solutions que convierte las reuniones corporativas en acciones medibles. Su premisa es simple y define todo el diseño: una reunión no termina cuando se firma el acta, termina cuando sus acuerdos se cumplen.

Hoy las reuniones del grupo se documentan en actas de Word y los pendientes se pierden entre sesiones. Nadie puede responder con datos preguntas básicas: cuántos acuerdos siguen abiertos, cuántas veces se ha movido una fecha de entrega, qué responsable acumula más retrasos, cuánto tarda en promedio un acuerdo en cerrarse.

El módulo responde a esas preguntas porque modela la acción como una entidad que sobrevive al acta. Un pendiente abierto en la reunión del 2 de agosto no se vuelve a escribir el 28: se retoma, y esa retoma registra el plazo anterior, el nuevo plazo y la decisión que lo justifica. Al cabo de tres reuniones, la trazabilidad completa está en el sistema sin que nadie haya tenido que redactarla.

## **1.1  Qué se construye**

* **Expediente de reunión** — datos generales, participantes con asistencia, temas tratados, acuerdos, conclusiones y próxima reunión.

* **Temas como objetos** — cada tema lleva responsable, colaboradores, aprobador, empresas involucradas, prioridad, fecha compromiso, checklist propio y pipeline propio.

* **Retoma de pendientes** — bloque que muestra los acuerdos abiertos de reuniones anteriores y obliga a decidir sobre cada uno.

* **Pipeline Kanban** — cinco etapas con arrastre: Nuevo, Asignado, En proceso, Validación, Finalizado.

* **Trabajo transversal** — una acción puede involucrar varias empresas del grupo sin duplicarse.

* **Panel ejecutivo** — indicadores de cumplimiento por empresa y por responsable, vencidos, arrastrados y tiempo promedio de cierre.

* **Exportación documental** — acta en Word editable y PDF con identidad corporativa y firmas.

## **1.2  Qué lo diferencia de un gestor de tareas**

Cualquier gestor de tareas permite crear un pendiente con fecha y responsable. Tres cosas distinguen a este módulo y no deben perderse en la implementación:

* **El plazo original nunca se pierde.** Se guardan dos fechas: la comprometida al nacer la acción y la vigente. La diferencia entre ambas es la métrica de deslizamiento del grupo.

* **Cada movimiento de fecha exige una decisión escrita.** No se puede mover un plazo en silencio: hay que elegir entre mantener, prorrogar, declarar último plazo, escalar o cerrar, y escribir el comentario que irá al acta.

* **El último plazo es un freno real.** Cuando una acción llega a ese punto, moverla deja de ser una decisión operativa y requiere rol de Dirección, con registro en auditoría.

# **02  Problema, objetivo y métricas de éxito**

## **2.1  Problema observado**

| Situación actual | Consecuencia |
| :---- | :---- |
| El acta se redacta en Word y se archiva en una carpeta compartida. | Nadie la vuelve a abrir; los acuerdos mueren en el documento. |
| Los pendientes se copian manualmente de un acta a la siguiente. | Se pierde el historial: no se sabe cuántas veces se movió una fecha. |
| El estado de un acuerdo vive en la cabeza del responsable. | La dirección se entera del incumplimiento en la reunión, no antes. |
| Las acciones que involucran a varias marcas se duplican. | Cada empresa lleva su propia versión y ninguna coincide. |
| No hay indicadores de cumplimiento. | Las decisiones sobre carga de trabajo se toman por percepción. |

## **2.2  Objetivo del módulo**

Que cualquier persona con acceso a Stratix Solutions pueda, en menos de treinta segundos, responder: qué se acordó, quién responde, para cuándo, en qué va y cuántas veces se ha movido esa fecha.

## **2.3  Métricas de éxito a noventa días del despliegue**

| Indicador | Meta | Cómo se mide |
| :---- | :---- | :---- |
| Actas registradas en el módulo | 100 % de las reuniones operativas | Conteo de reuniones creadas por mes |
| Acuerdos con responsable y fecha | 100 % | Acciones sin owner\_id o sin due\_date \= 0 |
| Acuerdos vencidos sin revisión | \< 10 % de los abiertos | Vencidos sin topic\_review en la última reunión de su empresa |
| Tiempo promedio de cierre | Reducción del 25 % frente al primer mes | Media de días entre reunión de origen y closed\_at |
| Prórrogas por acción | \< 1,5 en promedio | Media del campo extensions sobre acciones cerradas |
| Adopción | ≥ 80 % de usuarios activos entran al menos una vez por semana | Eventos de acceso al módulo |

# **03  Alcance**

## **3.1  Incluido en esta fase**

| Bloque | Detalle |
| :---- | :---- |
| Reuniones | Creación, edición, cierre y consulta del expediente completo. |
| Participantes | Selección desde el directorio de usuarios de la plataforma más invitados externos. |
| Temas y acciones | Alta ilimitada por reunión, con todos sus atributos y su checklist. |
| Retoma de pendientes | Bloque de heredados, panel de revisión y registro histórico de plazos. |
| Pipeline | Tablero Kanban de cinco etapas con arrastre y filtros. |
| Transversalidad | Empresa principal más N empresas relacionadas por acción. |
| Panel ejecutivo | Seis indicadores más cumplimiento por empresa y por responsable. |
| Vista de arrastres | Tablero de acciones que sobreviven a más de una reunión. |
| Exportación | Word editable y PDF desde servidor con plantilla corporativa. |
| Adjuntos | Carga de evidencias a Supabase Storage vinculadas a acción o revisión. |
| Notificaciones | Convocatoria, acta publicada, recordatorio de plazo y resumen semanal. |
| Auditoría | Registro de todo cambio con autor, fecha, antes y después. |
| Permisos | Cinco roles con matriz de capacidades y exclusiones por empresa. |

## **3.2  Excluido — fase 2**

* Integración con Google Calendar para convocatorias y disponibilidad.

* Firma electrónica del acta con validez legal.

* Transcripción automática de la reunión y extracción de acuerdos por IA.

* Aplicación móvil nativa; en esta fase el módulo es responsive, no nativo.

* Vinculación de acciones con el módulo de Proyectos y con la ficha de Clientes.

* Tableros públicos para clientes externos.

## **3.3  Supuestos**

* La plataforma ya resuelve autenticación de usuarios; el módulo la reutiliza sin crear un login propio.

* Existe un catálogo de empresas o marcas en la plataforma; si no existe, el módulo lo crea y queda como catálogo maestro.

* Supabase Storage está habilitado o puede habilitarse para el bucket de evidencias.

* El proveedor de correo transaccional ya está configurado en la plataforma.

## **3.4  Fuera de discusión**

Las siguientes decisiones están tomadas y no se replantean durante el desarrollo: el módulo vive dentro de la plataforma existente y no como aplicación aparte; la acción es una entidad persistente y no se duplica entre actas; el plazo original es inmutable; y toda modificación de fecha genera un registro de revisión.

# **04  Glosario**

El equipo debe usar estos términos con precisión, tanto en el código como en la interfaz. La mezcla de vocabulario es la primera causa de confusión en módulos de este tipo.

| Término | Significado en este módulo | Nombre técnico |
| :---- | :---- | :---- |
| Reunión | Expediente operativo de una sesión. Contiene todo lo demás. | meetings |
| Acta | Documento exportable que representa una reunión en un momento dado. | — |
| Tema | Punto tratado en la reunión. Es también la acción que genera. | meeting\_topics |
| Acción | Sinónimo de tema visto desde el seguimiento. Misma entidad. | meeting\_topics |
| Checklist | Lista de ítems verificables dentro de un tema. | checklists |
| Etapa | Posición de la acción en el pipeline de cinco pasos. | stage |
| Retoma | Acto de revisar en una reunión un pendiente nacido en otra. | topic\_reviews |
| Arrastre | Acción abierta que ya fue retomada al menos una vez. | — |
| Prórroga | Movimiento del plazo vigente con decisión registrada. | extensions |
| Último plazo | Marca que bloquea nuevas prórrogas salvo excepción de Dirección. | is\_final |
| Plazo original | Fecha comprometida al nacer la acción. Inmutable. | original\_due |
| Plazo vigente | Fecha comprometida hoy. Se mueve solo mediante retoma. | due\_date |
| Empresa principal | Marca que responde por el resultado de la acción. | company\_id |
| Empresa relacionada | Marca que colabora y ve la acción en su ámbito. | related\_companies |
| Ámbito | Filtro global de la interfaz: todo el grupo o una marca. | scope |

# **05  Contexto técnico**

## **5.1  Dónde vive el módulo**

El módulo se integra dentro de la aplicación existente en app.stratixsolutions.us. No es un despliegue aparte, no tiene dominio propio y no mantiene su propia sesión. Aparece como una entrada más del menú principal, junto a los módulos actuales de la plataforma.

| Acceso universal — requisito central Cualquier persona autenticada en Stratix Solutions entra al módulo. No hay licencia por usuario, no hay lista de habilitados y no hay pantalla de solicitud de acceso. Lo que cambia entre usuarios no es el acceso, es la capacidad: el rol determina qué puede hacer dentro, y la pertenencia a empresas determina qué datos ve. Un usuario nuevo, sin configuración adicional, entra con rol Participante y ve como mínimo las acciones donde figura como responsable o colaborador. |
| :---- |

## **5.2  Stack**

| Capa | Tecnología | Notas |
| :---- | :---- | :---- |
| Framework | Next.js 14 — App Router | Server Components por defecto; cliente solo donde hay interacción |
| Lenguaje | TypeScript estricto | strict: true. Prohibido any en código de dominio |
| Estilos | Tailwind CSS | Tokens del módulo definidos en la sección 16 |
| Base de datos | Supabase — PostgreSQL | Esquema aislado ops |
| Autenticación | Supabase Auth | La sesión de la plataforma; el módulo no crea cuentas |
| Archivos | Supabase Storage | Bucket ops-evidence |
| Tiempo real | Supabase Realtime | Canal por empresa |
| Hosting | Vercel | Vista previa por rama; producción en main |
| Correo | Proveedor transaccional de la plataforma | Plantillas del módulo |
| Repositorio | Monorepo de la plataforma | Rama feature/operations-hub |

## **5.3  Estructura de carpetas propuesta**

| Árbol de archivos |
| :---- |
| app/(app)/operaciones/   layout.tsx                  Shell del módulo: rail, selector de ámbito, guard de sesión   page.tsx                    P-01 Panel ejecutivo   reuniones/page.tsx          P-02 Listado de reuniones   reuniones/\[id\]/page.tsx     P-03 Expediente de reunión   pipeline/page.tsx           P-05 Tablero Kanban   arrastres/page.tsx          P-06 Pendientes arrastrados   directorio/page.tsx         P-07 Empresas y personas   auditoria/page.tsx          P-08 Registro de auditoría   api/actas/\[id\]/export/route.ts   Generación de Word y PDF   lib/ops/   schema.ts        Tipos y validadores Zod de todas las entidades   queries.ts       Lecturas (server-only)   actions.ts       Server Actions de escritura   rules.ts         Reglas de negocio puras y testeables (RN-xx)   codes.ts         Generación y parseo de códigos de documento   permissions.ts   Matriz de capacidades por rol   export/          Plantillas docx y pdf   components/ops/   MeetingHeader.tsx      TopicCard.tsx        Lifeline.tsx   ParticipantsTable.tsx  TopicBlock.tsx       ReviewDialog.tsx   InheritedPanel.tsx     ChecklistList.tsx    PipelineBoard.tsx   StageChevron.tsx       KpiStrip.tsx         ComplianceBars.tsx   supabase/migrations/   20260901\_ops\_schema.sql   20260902\_ops\_rls.sql   20260903\_ops\_views.sql |

## **5.4  Convenciones**

* **Nombres en base de datos** en inglés y snake\_case. Nombres en interfaz en español.

* **Toda escritura pasa por una Server Action** de lib/ops/actions.ts. Ningún componente cliente escribe directo a Supabase.

* **Toda regla de negocio vive en rules.ts** como función pura, sin dependencias de red. Es lo que se prueba con tests unitarios.

* **Validación con Zod en el borde.** Cada Server Action valida su entrada antes de tocar la base.

* **Fechas** siempre en formato ISO (AAAA-MM-DD) para plazos y timestamptz para eventos. Nunca cadenas locales en base de datos.

* **Revalidación** con revalidatePath tras cada mutación que afecte una vista listada.

# **06  Modelo de datos**

Once tablas en el esquema ops. La relación que define el módulo está en topic\_reviews: es la que permite que una acción atraviese varias reuniones sin duplicarse.

## **6.1  Mapa de relaciones**

| Relaciones |
| :---- |
| companies ─┬─ departments            ├─ user\_companies ─── app\_users ─── access\_denylist            ├─ document\_sequences            └─ meetings ─┬─ meeting\_participants                         └─ meeting\_topics ─┬─ checklists                                            ├─ task\_updates                                            ├─ attachments                                            └─ topic\_reviews ─── meetings                                                  ^                                                  └─ una fila por cada vez que la acción                                                     se retoma en una reunión posterior   audit\_logs  (transversal a todas las entidades) |

## **6.2  companies**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK | gen\_random\_uuid() |
| code | text UNIQUE | Sigla de 3 letras. Llave natural para cruzar con el resto de la plataforma |
| name | text NOT NULL | Nombre comercial |
| legal\_name | text |  |
| brand\_color | text | Hex. Alimenta los indicadores de color en toda la interfaz |
| logo\_url | text | Para el membrete del acta exportada |
| country | text | US o EC |
| is\_active | boolean | Por defecto true |

## **6.3  app\_users**

Espejo operativo del usuario de la plataforma. No sustituye a auth.users: lo referencia.

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| auth\_user\_id | uuid UNIQUE | FK a auth.users. Es el enlace con la sesión de la plataforma |
| full\_name | text NOT NULL |  |
| email | text UNIQUE NOT NULL |  |
| position | text | Cargo actual |
| department | text |  |
| company\_id | uuid FK | Empresa base del usuario |
| role | enum | admin | director | meeting\_owner | participant | viewer. Por defecto participant |
| is\_active | boolean |  |

| Alta automática de usuarios Un usuario que entra por primera vez al módulo debe quedar registrado en app\_users sin intervención manual. Implementar un trigger sobre auth.users o un upsert en el layout del módulo que cree la fila con rol participant si no existe. Esto es lo que hace posible el acceso universal descrito en 5.1. |
| :---- |

## **6.4  user\_companies y access\_denylist**

| Tabla | Campos | Función |
| :---- | :---- | :---- |
| user\_companies | user\_id, company\_id, role | Pertenencia. Un usuario puede operar en varias marcas con rol distinto en cada una. |
| access\_denylist | user\_id, company\_id, reason | Exclusión explícita. Prevalece sobre cualquier pertenencia concedida. |

La visibilidad se calcula siempre como **pertenencia menos exclusión**. Nunca al revés y nunca solo en la interfaz: ocultar un botón no es seguridad.

## **6.5  meetings**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| code | text UNIQUE | Generado por trigger. Formato en el anexo B |
| company\_id | uuid FK NOT NULL | Empresa que convoca |
| area | text | Área responsable |
| meeting\_type\_id | uuid FK | Catálogo meeting\_types |
| title | text | Título de la sesión |
| location | text | Lugar o enlace |
| modality | text | presencial | virtual | híbrida |
| meeting\_date | date NOT NULL | Por defecto la fecha actual |
| start\_time / end\_time | time | end\_time \>= start\_time (constraint) |
| secretary\_id | uuid FK | Responsable del acta |
| chair\_id | uuid FK | Quien preside |
| objective | text |  |
| agenda | jsonb | Lista de puntos previstos. Distinta de los temas tratados |
| conclusions | text |  |
| next\_meeting\_date | date |  |
| next\_meeting\_notes | text | Enfoque previsto |
| status | enum | borrador | en\_curso | cerrada |
| created\_by | uuid FK |  |
| created\_at / updated\_at | timestamptz | updated\_at por trigger |

## **6.6  meeting\_participants**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| meeting\_id | uuid FK NOT NULL | ON DELETE CASCADE |
| user\_id | uuid FK | Nulo si es invitado externo |
| guest\_name / guest\_company | text | Solo para invitados externos |
| position | text | Fotografía del cargo al momento de la reunión |
| department | text | Fotografía del departamento |
| role\_in\_meeting | text | Preside, Responsable del acta, Participante, Invitado |
| attendance | enum | presente | ausente | invitado |
| is\_guest | boolean |  |

| Por qué se duplican cargo y departamento El cargo de una persona cambia con el tiempo. El acta de 2024 debe seguir diciendo lo que decía en 2024\. Por eso position y department se copian al crear el participante y no se leen por join. Es duplicación deliberada, no un descuido de normalización. |
| :---- |

## **6.7  meeting\_topics — entidad central**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| code | text UNIQUE | ACC-{SIGLA}-{AÑO}-{NNNN}. Generado por trigger |
| meeting\_id | uuid FK | Reunión donde nació. NUNCA cambia |
| current\_meeting\_id | uuid FK | Última reunión que la revisó |
| company\_id | uuid FK NOT NULL | Empresa principal, responde por el resultado |
| related\_companies | uuid\[\] | Empresas colaboradoras. Ven la acción en su ámbito |
| title | text NOT NULL |  |
| description | text |  |
| owner\_id | uuid FK NOT NULL | Responsable principal. Siempre del directorio |
| collaborators | uuid\[\] | Colaboradores |
| approver\_id | uuid FK | Aprobador. Puede ser nulo |
| priority | enum | baja | media | alta | critica |
| stage | enum | nuevo | asignado | en\_proceso | validacion | finalizado |
| original\_due | date | Plazo comprometido al nacer. INMUTABLE |
| due\_date | date | Plazo vigente. Solo se mueve por retoma |
| extensions | int | Contador de prórrogas. Por defecto 0 |
| is\_final | boolean | true \= último plazo declarado |
| closed\_at | timestamptz | Se llena al pasar a finalizado |
| created\_by / created\_at / updated\_at | — |  |

## **6.8  checklists**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| topic\_id | uuid FK NOT NULL | ON DELETE CASCADE |
| position | int | Orden dentro del tema |
| text | text NOT NULL |  |
| done | boolean | Por defecto false |
| done\_by | uuid FK | Se llena al marcar; se limpia al desmarcar |
| done\_at | date | Idem |
| evidence | text | Referencia o nombre del adjunto |

## **6.9  topic\_reviews — la retoma entre reuniones**

Una fila por cada vez que una acción se revisa en una reunión posterior a la de su origen. Es la fuente de la línea de vida, del contador de prórrogas y de la tabla de pendientes retomados que se imprime en el acta.

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| topic\_id | uuid FK NOT NULL | Acción revisada |
| meeting\_id | uuid FK NOT NULL | Reunión donde se revisó |
| meeting\_date | date | Copia de la fecha de esa reunión, para ordenar sin join |
| user\_id | uuid FK | Quien registró la revisión |
| previous\_due | date NOT NULL | Plazo antes de la decisión |
| new\_due | date NOT NULL | Plazo después de la decisión |
| decision | enum | sin\_cambio | prorroga | ultimo\_plazo | escalado | cerrado |
| comment | text NOT NULL | Obligatorio. Es el texto que sale en el acta |
| evidence | text |  |
| created\_at | timestamptz |  |

**Restricción de unicidad:** UNIQUE (topic\_id, meeting\_id). Una acción se revisa una sola vez por reunión. Si hay que corregir, se edita la revisión existente, no se crea otra.

## **6.10  task\_updates — historial inmutable**

| Campo | Tipo | Reglas |
| :---- | :---- | :---- |
| id | uuid PK |  |
| topic\_id | uuid FK NOT NULL |  |
| user\_id | uuid FK |  |
| kind | enum | cambio\_estado | checklist | plazo | revision | comentario | reasignacion |
| from\_value / to\_value | text | Para cambios de etapa o de fecha |
| body | text NOT NULL | Texto legible del movimiento |
| evidence | text |  |
| created\_at | timestamptz |  |

**Esta tabla es de solo inserción.** No se actualiza ni se borra. Cualquier corrección se hace con un movimiento nuevo.

## **6.11  attachments y audit\_logs**

| Tabla | Campos | Notas |
| :---- | :---- | :---- |
| attachments | id, entity\_type, entity\_id, file\_name, mime\_type, size\_bytes, storage\_path, uploaded\_by, created\_at | entity\_type ∈ meeting | topic | review | update. Ruta en el bucket ops-evidence/{company\_code}/{year}/ |
| audit\_logs | id, actor\_id, action, entity\_type, entity\_id, company\_id, before\_data, after\_data, ip\_address, created\_at | before\_data y after\_data en jsonb. Permite reconstruir cualquier estado anterior sin versionar cada tabla |

## **6.12  Índices obligatorios**

| Índices |
| :---- |
| meetings           (company\_id, meeting\_date DESC) meetings           (status) meeting\_topics     (owner\_id, stage) meeting\_topics     (company\_id, stage) meeting\_topics     (due\_date) WHERE stage \<\> 'finalizado' meeting\_topics     USING GIN (related\_companies) topic\_reviews      (topic\_id, meeting\_date) topic\_reviews      (meeting\_id) checklists         (topic\_id, position) task\_updates       (topic\_id, created\_at DESC) audit\_logs         (entity\_type, entity\_id, created\_at DESC) |

**El índice GIN sobre related\_companies no es opcional:** la consulta de ámbito filtra por pertenencia a un arreglo de empresas en cada carga de pantalla.

## **6.13  Vistas para el panel**

| Vista | Devuelve |
| :---- | :---- |
| v\_topic\_health | Cada acción con is\_overdue, days\_to\_due, edad en días y número de revisiones |
| v\_kpi\_global | Los seis indicadores del panel en una sola fila |
| v\_compliance\_by\_company | Total, cerradas, vencidas y porcentaje por empresa, incluyendo relacionadas |
| v\_compliance\_by\_owner | Lo mismo por responsable |
| v\_carried\_over | Acciones abiertas con al menos una revisión, con prórrogas y antigüedad |
| v\_attendance\_history | Invitaciones, asistencias y porcentaje por persona |

# **07  Reglas de negocio**

Cada regla tiene identificador. Están implementadas como funciones puras en lib/ops/rules.ts y cada una tiene su prueba unitaria correspondiente en la sección 19\. Si una regla resulta imposible de cumplir durante el desarrollo, se escala antes de cambiarla: son el contrato funcional del módulo.

## **7.1  Códigos y numeración**

| ID | Regla |
| :---- | :---- |
| RN-01 | El código de reunión se genera por trigger en el momento de la inserción, nunca desde la aplicación. Formato MTG-{SIGLA}-{AÑO}-{MMDD}-{NNN}, con secuencia por empresa y por día. |
| RN-02 | El código de acción se genera por trigger con formato ACC-{SIGLA}-{AÑO}-{NNNN}, con secuencia por empresa y por año. |
| RN-03 | Los códigos son inmutables. Cambiar la empresa de una reunión o de una acción no regenera el código: el documento ya existe con ese identificador. |

## **7.2  Reuniones**

| ID | Regla |
| :---- | :---- |
| RN-04 | Una reunión nace en estado borrador. Transiciones válidas: borrador → en\_curso → cerrada. No hay camino de vuelta desde cerrada. |
| RN-05 | Una reunión cerrada es de solo lectura en todos sus campos, participantes y temas. |
| RN-06 | Cerrar una reunión NO cierra sus acciones. Las acciones abiertas siguen vivas y aparecerán como heredadas en la siguiente reunión de su empresa. Esta regla es el corazón del módulo. |
| RN-07 | Al cerrar, si hay acciones abiertas nacidas en esa reunión, se advierte al usuario indicando cuántas son. La advertencia informa, no bloquea. |
| RN-08 | end\_time no puede ser anterior a start\_time. |

## **7.3  Temas y acciones**

| ID | Regla |
| :---- | :---- |
| RN-09 | Un tema nace con etapa nuevo, sin prórrogas y con is\_final en false. original\_due se fija con el primer valor de due\_date y no vuelve a cambiar. |
| RN-10 | El responsable principal se elige siempre del directorio de usuarios. No existe campo de texto libre para responsables en ninguna pantalla. |
| RN-11 | Al pasar a finalizado se registra closed\_at. Al salir de finalizado, closed\_at vuelve a nulo. |
| RN-12 | La empresa principal se añade automáticamente al conjunto de empresas de la acción y no puede quitarse. Las relacionadas sí. |
| RN-13 | Cambiar la empresa principal de una acción no altera su código ni sus relacionadas existentes. |
| RN-14 | El porcentaje del checklist es el avance real. La etapa del pipeline es el avance declarado. El módulo los muestra juntos y no los sincroniza automáticamente: la divergencia es información valiosa. |

## **7.4  Retoma de pendientes — reglas críticas**

| El caso que define el módulo Reunión del 2 de agosto: se acuerda la campaña Weight Loss con plazo al 17\. El 15 se revisa y se prorroga al 26\. Hoy, 28 de agosto, sigue abierta y vencida. Al abrir la reunión de hoy, esa acción aparece en el bloque de heredados con su origen, su antigüedad, su porcentaje de checklist y su prórroga previa. Se retoma, se decide y se fija el nuevo plazo. El plazo original del 17 de agosto sigue guardado y visible. |  |
| :---- | :---- |
| **ID** | **Regla** |
| RN-15 | Una acción es candidata a heredarse en una reunión M si: está abierta; nació en una reunión distinta de M; la fecha de su reunión de origen es anterior o igual a la de M; comparte empresa principal o relacionada con M; y todavía no tiene revisión registrada en M. |
| RN-16 | Retomar una acción NO la duplica ni crea un tema nuevo. Inserta una fila en topic\_reviews y actualiza la acción existente. |
| RN-17 | El comentario de la revisión es obligatorio. Sin comentario no se guarda: es el texto que quedará en el acta. |
| RN-18 | Toda decisión distinta de cerrado exige un nuevo plazo explícito. No se permite dejar la fecha en blanco ni "por definir". |
| RN-19 | Decisión prorroga: incrementa extensions en uno y actualiza due\_date. original\_due no se toca. |
| RN-20 | Decisión ultimo\_plazo: marca is\_final en true, actualiza due\_date y, si la fecha cambió, incrementa extensions. |
| RN-21 | Decisión cerrado: lleva la acción a etapa finalizado, registra closed\_at y mantiene el plazo vigente sin cambios. |
| RN-22 | Decisión escalado: actualiza el plazo y deja constancia. Debe disparar notificación al aprobador y al director de la empresa principal. |
| RN-23 | Si is\_final es true, la decisión prorroga solo está disponible para roles admin y director. Para el resto, la opción no se ofrece en la interfaz y se rechaza en el servidor. |
| RN-24 | A partir de la segunda prórroga, la interfaz muestra un aviso sugiriendo declarar último plazo. Es una advertencia, no un bloqueo. |
| RN-25 | Una acción se revisa una sola vez por reunión. El segundo intento edita la revisión existente. |
| RN-26 | Toda revisión genera además una fila en task\_updates con kind \= revision, para que aparezca en el historial de la acción. |

## **7.5  Visibilidad y transversalidad**

| ID | Regla |
| :---- | :---- |
| RN-27 | Un usuario ve una acción si tiene acceso a cualquiera de las empresas involucradas, o si figura como responsable o colaborador de esa acción. |
| RN-28 | Una exclusión en access\_denylist prevalece sobre cualquier pertenencia. Se aplica en la política de base de datos, no solo en la interfaz. |
| RN-29 | El selector de ámbito solo lista empresas visibles para el usuario. Si el ámbito guardado deja de ser visible, se restablece a "todo el grupo". |
| RN-30 | Una acción transversal aparece una sola vez en cada tablero de las empresas involucradas. Nunca se duplica el registro. |

## **7.6  Historial y auditoría**

| ID | Regla |
| :---- | :---- |
| RN-31 | Ningún cambio de etapa, plazo o checklist sobrescribe información: siempre genera una línea de historial fechada y firmada. |
| RN-32 | Todo INSERT, UPDATE, DELETE, APPROVE, REVIEW, CLOSE y EXPORT queda en audit\_logs con actor, entidad, empresa y estados antes y después. |
| RN-33 | El historial y la auditoría no se editan ni se borran desde la interfaz bajo ninguna circunstancia. |

# **08  Roles, permisos y seguridad de datos**

## **8.1  Acceso al módulo**

Todo usuario autenticado en Stratix Solutions entra al módulo. El rol no controla el acceso, controla la capacidad. Un usuario sin rol asignado recibe participant por defecto.

## **8.2  Matriz de capacidades**

| Capacidad | Admin | Director | Resp. reunión | Particip. | Consulta |
| :---- | ----- | ----- | ----- | ----- | ----- |
| Entrar al módulo | Sí | Sí | Sí | Sí | Sí |
| Abrir y editar reuniones | Sí | Sí | Sí | — | — |
| Cerrar actas | Sí | Sí | Sí | — | — |
| Crear temas y acciones | Sí | Sí | Sí | — | — |
| Editar cualquier acción | Sí | Sí | — | — | — |
| Editar acciones propias | Sí | Sí | Sí | Sí | — |
| Marcar checklist propio | Sí | Sí | Sí | Sí | — |
| Registrar retomas y prórrogas | Sí | Sí | Sí | — | — |
| Extender un último plazo | Sí | Sí | — | — | — |
| Exportar Word y PDF | Sí | Sí | Sí | Sí | — |
| Ver auditoría | Sí | Sí | — | — | — |
| Gestionar roles y exclusiones | Sí | — | — | — | — |

| La fila que importa Extender un último plazo es el único freno estructural contra la prórroga infinita. Cuando una acción llega a ese punto, moverla deja de ser una decisión operativa y pasa a ser una decisión de Dirección, con registro en auditoría. Si esta regla se implementa como una simple advertencia en pantalla, el módulo pierde su razón de ser. |
| :---- |

## **8.3  Políticas de base de datos**

Las capacidades anteriores se implementan en dos capas. La interfaz oculta lo que el usuario no puede hacer; las políticas de fila del esquema ops lo impiden. Ambas son obligatorias.

| Resumen de políticas RLS |
| :---- |
| \-- Función base de visibilidad: pertenencia menos exclusión can\_access\_company(company\_id) \=      EXISTS (user\_companies del usuario actual con esa empresa)  AND NOT EXISTS (access\_denylist del usuario actual con esa empresa)   \-- meetings   SELECT  : can\_access\_company(company\_id) \--            WRITE   : can\_access\_company(company\_id) \--                      AND rol ∈ {admin,director,meeting\_owner}   \-- meeting\_topics \--   SELECT : owner\_id \= usuario\_actual \--            OR usuario\_actual \= ANY(collaborators) \--            OR can\_access\_company(company\_id) \--            OR EXISTS (related\_companies con can\_access\_company) \--   WRITE  : rol ∈ {admin,director,meeting\_owner} \--            OR owner\_id \= usuario\_actual   \-- topic\_reviews \--   INSERT : rol ∈ {admin,director,meeting\_owner} \--            AND (NOT topic.is\_final OR rol ∈ {admin,director})   \-- task\_updates   INSERT : user\_id \= usuario\_actual  (sin UPDATE ni DELETE) \-- audit\_logs     SELECT : rol ∈ {admin,director}    (sin escritura cliente) |

## **8.4  Reglas de seguridad adicionales**

* La clave de servicio de Supabase nunca llega al cliente. Todas las escrituras pasan por Server Actions.

* El bucket ops-evidence es privado. La descarga se hace con URL firmada de vigencia corta generada en servidor.

* Validar tipo y tamaño de archivo en el servidor, no solo en el input. Límite sugerido: 15 MB por archivo.

* El identificador del usuario que actúa se toma siempre de la sesión, nunca de un parámetro enviado por el cliente.

* Las rutas de exportación verifican permiso de lectura sobre la reunión antes de generar el documento.

# **09  Flujos de usuario**

Siete flujos cubren el ciclo completo. Cada uno indica actor, precondición, pasos y resultado esperado. Los identificadores F-xx se usan en las pruebas de aceptación.

## **9.1  F-01 · Abrir una reunión**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Entra al módulo y pulsa Nueva reunión | Crea la reunión en estado borrador con código asignado y fecha de hoy |
| 2 | Completa título, empresa, área y tipo | Guarda cada campo al perder el foco. Sin botón Guardar por campo |
| 3 | Fija lugar, modalidad y horas | Valida que la hora de fin no sea anterior a la de inicio |
| 4 | Añade participantes desde el directorio | Autocompleta cargo y departamento y los congela como copia |
| 5 | Escribe el objetivo | Queda listo para sesionar |

## **9.2  F-02 · Revisar los pendientes heredados**

Este flujo va primero en la reunión, antes de abrir temas nuevos. Es una decisión de diseño: los arrastres se atienden antes que lo nuevo.

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Abre el expediente de la reunión de hoy | Muestra el bloque "Pendientes de reuniones anteriores" con las acciones candidatas según RN-15 |
| 2 | Revisa la tarjeta de cada pendiente | Presenta origen, antigüedad en días, porcentaje de checklist, prórrogas acumuladas y si está en último plazo |
| 3 | Pulsa Retomar | Abre el panel de revisión con la línea de vida de la acción y su plazo original y vigente |
| 4 | Elige la decisión | Si la acción está en último plazo y el rol no es Dirección, la opción Prórroga no se ofrece |
| 5 | Fija el nuevo plazo y escribe el comentario | El comentario es obligatorio; sin él el botón no guarda |
| 6 | Confirma | Inserta la revisión, actualiza plazo, prórrogas y etapa, y añade la línea al historial |
| 7 | — | La acción pasa a la tabla "Pendientes retomados" del acta y saldrá impresa en el Word |

## **9.3  F-03 · Registrar un tema nuevo**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Pulsa Agregar nuevo tema | Crea el tema con código, etapa nuevo y plazo por defecto a siete días |
| 2 | Escribe nombre y descripción | Guarda al perder el foco |
| 3 | Asigna responsable, aprobador y colaboradores | Todos desde el directorio; ningún campo libre |
| 4 | Define empresa principal y relacionadas | La principal queda fijada y no se puede quitar |
| 5 | Fija prioridad y fecha compromiso | La fecha compromiso queda también como plazo original |
| 6 | Añade ítems al checklist | Cada ítem se guarda al pulsar Enter o Añadir |

## **9.4  F-04 · Trabajar una acción entre reuniones**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Entra al Pipeline y localiza su tarjeta | Filtros por texto, responsable y prioridad |
| 2 | Arrastra la tarjeta a otra columna | Cambia la etapa y registra la línea de historial con etapa anterior y nueva |
| 3 | Abre la acción | Muestra línea de vida, datos, checklist e historial completo |
| 4 | Marca ítems del checklist | Guarda quién marcó y cuándo; recalcula el porcentaje |
| 5 | Publica un comentario o adjunta evidencia | Se añade al historial; el archivo va al bucket privado |

## **9.5  F-05 · Cerrar el acta y exportarla**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Escribe conclusiones y fecha de próxima reunión | Guarda |
| 2 | Pulsa Cerrar acta | Advierte cuántas acciones abiertas seguirán vivas y pide confirmación |
| 3 | Confirma | La reunión pasa a cerrada y queda en solo lectura. Las acciones no se tocan |
| 4 | Pulsa Word o PDF | Genera el documento en servidor y registra el evento EXPORT en auditoría |

## **9.6  F-06 · Vigilar los arrastres (Dirección)**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Entra a Arrastres | Lista las acciones abiertas con al menos una revisión, ordenadas por prórrogas y antigüedad |
| 2 | Lee los cuatro indicadores | Arrastradas, prórrogas acumuladas, en último plazo y antigüedad máxima |
| 3 | Abre una acción | Ve la línea de vida completa: cada reunión donde se trató y cada desplazamiento de fecha |
| 4 | Decide | Puede reasignar responsable, escalar o declarar último plazo desde la ficha |

## **9.7  F-07 · Consultar el panel ejecutivo**

| Paso | Acción del usuario | Respuesta del sistema |
| :---- | :---- | :---- |
| 1 | Entra al módulo | El panel es la pantalla de inicio |
| 2 | Cambia el ámbito | Todos los indicadores y listados se recalculan para esa empresa |
| 3 | Revisa vencidos y arrastres | Puede saltar directamente a la acción desde cualquier fila |

## **9.8  Diagrama de estados**

| Estados |
| :---- |
| REUNIÓN   borrador ──► en\_curso ──► cerrada          (sin retorno)   ACCIÓN — etapa del pipeline   nuevo ──► asignado ──► en\_proceso ──► validacion ──► finalizado     ▲                                                      │     └──────────── reapertura (registra historial) ─────────┘   ACCIÓN — plazo   original\_due  (fijo)   due\_date      ──► se mueve SOLO por topic\_review   is\_final      false ──► true   (irreversible salvo rol Dirección)   Cerrar la reunión NO cambia la etapa de ninguna acción. |

# **10  Especificación de pantallas**

Ocho pantallas. Cada una indica propósito, datos que consume, componentes, acciones disponibles y los estados vacío, de carga y de error. Los identificadores P-xx se usan en las pruebas.

## **10.1  P-01 · Panel ejecutivo**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones |
| Propósito | Responder en un vistazo cómo va el cumplimiento del ámbito seleccionado |
| Datos | v\_kpi\_global, v\_compliance\_by\_company, v\_compliance\_by\_owner, v\_carried\_over, vencidos, próximas reuniones |
| Indicadores | Reuniones del mes · Pendientes abiertos · Vencidos · Arrastrados · Finalizados · Cierre promedio en días |
| Componentes | KpiStrip, ComplianceBars, OwnerList, OverdueTable, CarriedList, NextMeetings |
| Acciones | Cambiar ámbito · Nueva reunión · Saltar a una acción · Ir a Arrastres |
| Aviso | Si hay acciones arrastradas, banda superior con el conteo y enlace directo |
| Vacío | "Sin reuniones registradas" con botón para crear la primera |
| Carga | Esqueletos de tarjeta, no spinner de pantalla completa |

## **10.2  P-02 · Listado de reuniones**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones/reuniones |
| Columnas | Código · Reunión y tipo · Empresa · Fecha · Asistencia (presentes/total) · Temas · Arrastres · Estado |
| Orden | Fecha descendente |
| Filtros | Ámbito (global) · texto · estado · rango de fechas |
| Acciones | Abrir expediente · Nueva reunión |
| Paginación | 25 por página, servidor |
| Vacío | "Sin reuniones en este ámbito" con acción de creación |

## **10.3  P-03 · Expediente de reunión**

Es la pantalla más densa del módulo. Se organiza en bloques verticales en este orden exacto, porque el orden es funcional: los arrastres antes que lo nuevo.

| Bloque | Contenido | Editable |
| :---- | :---- | :---- |
| Barra superior | Código, estado, botones de transición, exportar, guardar | — |
| 1\. Datos de la reunión | Título, empresa, área, tipo, fecha, horas, modalidad, lugar, responsable del acta, preside, objetivo | Si no está cerrada |
| 2\. Participantes | Tabla con nombre, cargo, departamento, empresa, rol en reunión y asistencia. Alta desde directorio o invitado externo | Si no está cerrada |
| 3\. Pendientes heredados | Solo si hay candidatos según RN-15. Tabla con origen, antigüedad, checklist, prórrogas y botón Retomar | Si no está cerrada |
| 4\. Pendientes retomados | Solo si ya hay revisiones en esta reunión. Muestra decisión, plazo anterior y nuevo | Lectura |
| 5\. Temas tratados | Bloques plegables, uno por tema, con botón "+ Agregar nuevo tema" | Si no está cerrada |
| 6\. Conclusiones | Conclusiones, fecha y enfoque de la próxima reunión | Si no está cerrada |

### **10.3.1  Bloque de tema — contenido de cada uno**

* Cabecera plegable: número de tema, código de acción, título, prioridad, etapa, plazo y porcentaje de checklist.

* Pipeline en chevron de cinco pasos, pulsable para cambiar de etapa.

* Nombre y descripción.

* Responsable principal, aprobador, prioridad y fecha compromiso.

* Colaboradores como fichas con botón de quitar y desplegable para añadir.

* Empresas: principal fija más relacionadas, con desplegable para añadir.

* Checklist con barra de avance, marcado con registro de autor y fecha, y campo para añadir ítems.

* Pie: número de revisiones y prórrogas, enlace al historial completo y eliminar tema.

## **10.4  P-04 · Panel de revisión (retoma)**

| Aspecto | Detalle |
| :---- | :---- |
| Formato | Panel lateral deslizante sobre el expediente. No navega a otra página |
| Cabecera | Código de la acción, etiqueta "Retomar en {código de reunión}" y título |
| Línea de vida | Componente Lifeline con un nodo por reunión donde se trató y el desplazamiento de fechas |
| Resumen | Nació en · Antigüedad y prórrogas · Plazo original · Plazo vigente con días de retraso · Avance del checklist |
| Avisos | Si está en último plazo, aviso rojo. Si lleva dos o más prórrogas, aviso ámbar sugiriendo cerrar el ciclo |
| Formulario | Decisión · Nuevo plazo · Etapa · Comentario obligatorio · Evidencia |
| Validaciones | Comentario vacío bloquea. Decisión distinta de cerrado sin fecha bloquea. Prórroga sobre último plazo sin rol Dirección bloquea |
| Resultado | Cierra el panel, refresca el expediente y muestra confirmación con el nuevo plazo |

## **10.5  P-05 · Pipeline**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones/pipeline |
| Columnas | Nuevo · Asignado · En proceso · Validación · Finalizado |
| Tarjeta | Código, prioridad, título, mini pipeline, barra de checklist, responsable, empresas, plazo y, si aplica, contador de revisiones |
| Distintivos | Borde rojo si está vencida; borde naranja si es arrastrada |
| Interacción | Arrastrar y soltar entre columnas. Clic abre la ficha completa |
| Permiso | Solo puede mover quien puede editar la acción; en caso contrario se muestra aviso y no se mueve |
| Filtros | Texto, responsable y prioridad, además del ámbito global |
| Accesibilidad | El arrastre debe tener alternativa por teclado: seleccionar tarjeta y mover con flechas, o menú de etapa |

## **10.6  P-06 · Arrastres**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones/arrastres |
| Propósito | Tablero de Dirección: qué no se está cerrando y desde cuándo |
| Indicadores | Acciones arrastradas · Prórrogas acumuladas · En último plazo · Antigüedad máxima |
| Columnas | Código · Acción y checklist · Origen y días · Revisiones y prórrogas · Plazo original · Plazo vigente · Responsable · Etapa |
| Orden | Prórrogas descendente, luego plazo vigente ascendente |
| Vacío | "Ninguna acción arrastrada" — es el estado deseable, redactarlo como tal |

## **10.7  P-07 · Directorio**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones/directorio |
| Personas | Nombre, correo, cargo, departamento, empresa, rol y porcentaje histórico de asistencia |
| Empresas | Listado con color de marca y conteo de acciones |
| Exclusiones | Listado de exclusiones activas con alta y baja. Solo rol Administrador |
| Acciones | Cambiar rol de un usuario (solo Administrador) |

## **10.8  P-08 · Auditoría**

| Aspecto | Detalle |
| :---- | :---- |
| Ruta | /operaciones/auditoria |
| Acceso | Solo Administrador y Director. Para el resto, pantalla de acceso restringido, no error |
| Columnas | Fecha y hora · Autor · Acción · Entidad · Empresa · Detalle |
| Filtros | Rango de fechas, tipo de acción, entidad y empresa |
| Volumen | Paginación de 50 filas con carga bajo demanda |

## **10.9  Ficha de acción (panel lateral)**

Accesible desde cualquier pantalla al pulsar una acción. Contiene: línea de vida, pipeline pulsable, descripción, responsable, aprobador, colaboradores, empresas, los tres datos de plazo (original, vigente, prórrogas), checklist e historial completo con campo para publicar comentarios y evidencias.

# **11  Contratos de servidor**

Todas las escrituras son Server Actions. Las lecturas van en queries.ts como funciones server-only. Los tipos de entrada y salida se declaran con Zod en schema.ts y se derivan a TypeScript, nunca al revés.

## **11.1  Lecturas**

| Función | Entrada | Devuelve |
| :---- | :---- | :---- |
| getDashboard | scope: "ALL" | companyId | KPIs, cumplimiento por empresa y responsable, vencidos, arrastres, próximas |
| listMeetings | scope, filtros, paginación | Reuniones con conteos de asistencia, temas y revisiones |
| getMeetingFile | meetingId | Reunión, participantes, temas nacidos, revisiones y candidatos heredados |
| getInheritedTopics | meetingId | Acciones candidatas según RN-15 |
| listTopics | scope, filtros | Acciones para el pipeline, con checklist agregado |
| getTopic | topicId | Acción, checklist, revisiones e historial |
| listCarried | scope | Acciones abiertas con al menos una revisión |
| listAudit | filtros, paginación | Registro de auditoría |

## **11.2  Escrituras**

| Server Action | Entrada | Efecto y reglas |
| :---- | :---- | :---- |
| createMeeting | companyId | Crea en borrador. RN-01 |
| updateMeeting | meetingId, campos parciales | Rechaza si la reunión está cerrada. RN-05, RN-08 |
| closeMeeting | meetingId | Pasa a cerrada. No toca acciones. RN-06, RN-07 |
| upsertParticipant | meetingId, datos | Congela cargo y departamento al crear |
| removeParticipant | participantId | — |
| createTopic | meetingId, datos | Fija original\_due. RN-02, RN-09 |
| updateTopic | topicId, campos | RN-10 a RN-14. Genera historial si cambia el plazo |
| setTopicStage | topicId, stage | Registra historial y closed\_at. RN-11, RN-31 |
| deleteTopic | topicId | Solo si no tiene revisiones; en caso contrario se rechaza |
| addChecklistItem | topicId, texto | — |
| toggleChecklistItem | itemId | Guarda autor y fecha. Genera historial |
| linkCompany / unlinkCompany | topicId, companyId | No permite quitar la principal. RN-12 |
| linkCollaborator / unlink | topicId, userId | — |
| reviewTopic | topicId, meetingId, decision, newDue, stage, comment, evidence | El núcleo del módulo. RN-15 a RN-26 |
| addUpdate | topicId, texto, evidencia | Solo inserción |
| uploadAttachment | entityType, entityId, archivo | Valida tipo y tamaño; devuelve ruta de almacenamiento |
| setUserRole | userId, role | Solo Administrador |
| addDenylist / removeDenylist | userId, companyId | Solo Administrador. RN-28 |

## **11.3  Pseudocódigo de reviewTopic**

| lib/ops/actions.ts |
| :---- |
| export async function reviewTopic(input: ReviewInput) {   const data \= ReviewSchema.parse(input)   // Zod: comment obligatorio (RN-17)   const user \= await requireSession()   const topic \= await getTopicOrThrow(data.topicId)   const meeting \= await getMeetingOrThrow(data.meetingId)     assert(meeting.status \!== "cerrada", "La reunión está cerrada")   assert(canReview(user, topic), "Sin permiso para registrar retomas")   if (topic.is\_final && data.decision \=== "prorroga")       assert(isDirection(user), "Solo Dirección extiende un último plazo")  // RN-23   if (data.decision \!== "cerrado")       assert(Boolean(data.newDue), "Debe fijar el nuevo plazo")  // RN-18     const previousDue \= topic.due\_date   const next \= applyDecision(topic, data)   // pura, en rules.ts (RN-19 a RN-22)     await db.transaction(async tx \=\> {     await tx.upsert("topic\_reviews", {                 // RN-25       topic\_id: topic.id, meeting\_id: meeting.id, meeting\_date: meeting.meeting\_date,       user\_id: user.id, previous\_due: previousDue, new\_due: next.due\_date,       decision: data.decision, comment: data.comment, evidence: data.evidence     }, { onConflict: "topic\_id,meeting\_id" })       await tx.update("meeting\_topics", topic.id, {       due\_date: next.due\_date, extensions: next.extensions, is\_final: next.is\_final,       stage: next.stage, closed\_at: next.closed\_at, current\_meeting\_id: meeting.id     })       await tx.insert("task\_updates", {                   // RN-26       topic\_id: topic.id, user\_id: user.id, kind: "revision",       body: buildReviewLine(data.decision, previousDue, next.due\_date, data.comment)     })   })     if (data.decision \=== "escalado") await notifyEscalation(topic)   // RN-22   revalidatePath(\`/operaciones/reuniones/${meeting.id}\`)   revalidatePath("/operaciones/arrastres") } |

## **11.4  applyDecision — función pura**

| lib/ops/rules.ts |
| :---- |
| export function applyDecision(topic: Topic, d: ReviewInput): TopicPatch {   const base \= { due\_date: topic.due\_date, extensions: topic.extensions,                  is\_final: topic.is\_final, stage: d.stage, closed\_at: null }     switch (d.decision) {     case "sin\_cambio":     case "escalado":       return { ...base, due\_date: d.newDue\! }       case "prorroga":                     // RN-19       return { ...base, due\_date: d.newDue\!, extensions: topic.extensions \+ 1 }       case "ultimo\_plazo":                 // RN-20       return { ...base, due\_date: d.newDue\!, is\_final: true,                extensions: d.newDue \!== topic.due\_date                              ? topic.extensions \+ 1 : topic.extensions }       case "cerrado":                      // RN-21       return { ...base, stage: "finalizado", closed\_at: new Date().toISOString() }   } }   // original\_due NO aparece en ninguna rama: es inmutable por diseño (RN-09). |

# **12  Componentes de interfaz**

Lista de componentes a construir. Los marcados como cliente necesitan estado local o eventos; el resto son Server Components.

| Componente | Tipo | Responsabilidad |
| :---- | :---- | :---- |
| OpsShell | Servidor | Rail de navegación, selector de ámbito, guard de sesión y alta automática en app\_users |
| ScopeSelect | Cliente | Selector de ámbito; persiste la elección por usuario |
| KpiStrip | Servidor | Seis indicadores del panel |
| ComplianceBars | Servidor | Barras de cumplimiento por empresa con color de marca |
| OwnerWorkload | Servidor | Cumplimiento y carga por responsable |
| MeetingsTable | Servidor | Listado con conteos |
| MeetingHeaderForm | Cliente | Datos generales con guardado al perder el foco |
| ParticipantsTable | Cliente | Alta, edición en línea y baja de participantes |
| InheritedPanel | Servidor | Bloque de pendientes heredados; dispara el panel de revisión |
| ReviewDialog | Cliente | Formulario de retoma con validaciones y avisos |
| Lifeline | Servidor | Línea de vida del pendiente. Elemento visual distintivo del módulo |
| TopicBlock | Cliente | Bloque plegable de tema con todos sus campos |
| StageChevron | Cliente | Pipeline de cinco pasos en chevron, pulsable |
| ChecklistList | Cliente | Ítems con marcado, autor, fecha y alta |
| ReviewedTable | Servidor | Tabla de pendientes retomados en la reunión |
| PipelineBoard | Cliente | Kanban con arrastre y alternativa por teclado |
| TopicCard | Cliente | Tarjeta del Kanban |
| TopicDrawer | Cliente | Ficha completa de la acción con historial |
| CarriedTable | Servidor | Tablero de arrastres |
| AuditTable | Servidor | Registro de auditoría con filtros |
| ExportButtons | Cliente | Descarga de Word y PDF con estado de progreso |

### **12.0.1  Lifeline — especificación del componente distintivo**

Recibe una acción con sus revisiones y dibuja una línea horizontal con un nodo en rombo por cada hito. Es el componente que hace visible de un vistazo la diferencia entre una acción que avanza y una que solo cambia de fecha.

| Hito | Nodo | Contenido |
| :---- | :---- | :---- |
| Origen | Contorno azul marino | Código de la reunión, fecha y plazo original |
| Revisión sin cambio | Contorno azul marino | Código de reunión, fecha y etiqueta de la decisión |
| Prórroga | Relleno naranja | Código de reunión, fecha y "plazo anterior → nuevo plazo" |
| Último plazo | Relleno rojo | Idem, con la fecha final destacada |
| Cierre | Relleno verde | Fecha de cierre |
| Hoy (si sigue abierta) | Rojo si está vencida, neutro si no | Fecha actual y plazo vigente |

# **13  Exportación documental**

El acta se genera en el servidor, no en el navegador. Word y PDF deben salir de la misma plantilla para que sean idénticos.

## **13.1  Implementación**

| Formato | Herramienta | Ruta |
| :---- | :---- | :---- |
| Word (.docx) | Librería docx en Node | GET /operaciones/api/actas/\[id\]/export?format=docx |
| PDF | Puppeteer sobre la plantilla HTML | GET /operaciones/api/actas/\[id\]/export?format=pdf |

## **13.2  Contenido obligatorio del acta**

* Membrete: isotipo del grupo, nombre de la organización, marca de la reunión, código de acta y fecha.

* Datos generales: empresa, área, lugar o plataforma, fecha, horas, responsable del acta y quien preside.

* Participantes: nombre, cargo, departamento, empresa, rol en la reunión y asistencia.

* Objetivo de la sesión.

* **Pendientes de reuniones anteriores:** código, acción, reunión de origen, decisión, plazo anterior, nuevo plazo y comentario. Este bloque solo aparece si hubo retomas.

* Temas tratados: por cada uno, descripción, responsable, colaboradores, aprobador, empresas y checklist con su estado de marcado.

* **Tabla de acciones:** código, acción, responsable, aprobador, empresas, plazo original, plazo vigente, prórrogas y etapa. Incluye tanto los temas nuevos como los retomados.

* Conclusiones.

* Próxima reunión: fecha prevista y enfoque.

* Bloque de firmas: preside, responsable del acta y aprobación de dirección.

* Pie: nombre del producto, proveedor, código de acta y sello de generación.

## **13.3  Reglas de exportación**

| ID | Regla |
| :---- | :---- |
| RN-34 | La exportación verifica permiso de lectura sobre la reunión antes de generar el documento. |
| RN-35 | Cada exportación registra un evento EXPORT en auditoría con el formato solicitado. |
| RN-36 | El nombre del archivo es el código de la reunión: MTG-STX-2026-0828-001.docx |
| RN-37 | Los plazos vencidos se marcan visualmente en la tabla de acciones del documento. |
| RN-38 | El Word debe abrirse correctamente en Word de escritorio, Word web y Google Docs, y ser editable. |

# **14  Notificaciones y trabajos programados**

## **14.1  Correos**

| Evento | Destinatarios | Contenido |
| :---- | :---- | :---- |
| Reunión convocada | Participantes | Fecha, hora, lugar, objetivo y enlace al expediente |
| Acta cerrada | Participantes | PDF adjunto y resumen de acciones asignadas a cada uno |
| Acción asignada | Responsable y colaboradores | Acción, plazo, checklist inicial y enlace |
| Recordatorio de plazo | Responsable | A tres días y a un día del vencimiento |
| Acción vencida | Responsable y aprobador | El día siguiente al vencimiento |
| Último plazo declarado | Responsable, aprobador y director | Aviso de que no habrá más prórrogas |
| Acción escalada | Aprobador y director de la empresa principal | Motivo y comentario de la revisión |
| Resumen semanal | Directores | Arrastres, vencidos y cumplimiento de la semana |

## **14.2  Trabajos programados**

| Trabajo | Frecuencia | Fuente |
| :---- | :---- | :---- |
| Recordatorios de plazo | Diario 07:00 hora local | v\_topic\_health con days\_to\_due en 3 y en 1 |
| Aviso de vencidas | Diario 07:15 | v\_topic\_health con is\_overdue verdadero y sin aviso previo |
| Resumen semanal | Lunes 08:00 | v\_carried\_over y v\_compliance\_by\_company |

Implementar con cron de Vercel o con el orquestador de flujos ya en uso. Registrar cada envío para no duplicar avisos ante reintentos.

## **14.3  Tiempo real**

Suscripción por empresa sobre meeting\_topics y topic\_reviews. Es necesaria porque durante la reunión varias personas trabajan sobre el mismo expediente: si dos usuarios editan temas distintos, ambos deben ver los cambios sin recargar.

| Suscripción |
| :---- |
| const channel \= supabase.channel(\`ops:${companyId}\`)   .on("postgres\_changes",       { event: "\*", schema: "ops", table: "meeting\_topics", filter: \`company\_id=eq.${companyId}\` },       payload \=\> refreshTopic(payload.new.id))   .on("postgres\_changes",       { event: "INSERT", schema: "ops", table: "topic\_reviews" },       payload \=\> refreshMeeting(payload.new.meeting\_id))   .subscribe() |

# **15  Sistema de diseño**

El módulo adopta la identidad de Stratix Communications: azul marino corporativo con acento índigo. No usar la paleta turquesa de Eminat Medical Center, que pertenece a otra marca del grupo.

## **15.1  Paleta**

| Rol | Valor | Uso |
| :---- | :---- | :---- |
| Azul marino 950 | \#0E1326 | Fondo del rail de navegación |
| Azul marino 900 | \#1B2340 | Titulares, botones primarios, cabeceras de tabla |
| Azul marino 800 | \#232C52 | Estado activo de navegación, pasos completados |
| Índigo | \#4F46E5 | Acento de marca: numeración de secciones, foco, enlaces |
| Violeta | \#6D28D9 | Etapa de validación en el pipeline |
| Naranja institucional | \#E07A33 | Prórrogas, arrastres, etapa en proceso, acción principal |
| Verde | \#1E8E6A | Cierres y cumplimiento alto |
| Ámbar | \#B8830F | Advertencias |
| Rojo | \#C0392B | Vencidos y último plazo |
| Lienzo | \#EDEFF4 | Fondo de la aplicación |
| Línea | \#DBE0EB | Bordes y separadores |
| Texto secundario | \#69728C | Metadatos y descripciones |

## **15.2  Tipografía**

| Rol | Fuente | Uso |
| :---- | :---- | :---- |
| Titulares | Sora 600 | Títulos de sección, indicadores, nombres de pantalla |
| Texto | Inter 400/500 | Contenido general, formularios, tablas |
| Datos | IBM Plex Mono | Códigos, fechas técnicas, valores de indicadores y etiquetas de campo |

El uso de monoespaciada para códigos y etiquetas no es decorativo: distingue de un vistazo lo que es identificador de lo que es contenido redactado.

## **15.3  Componentes visuales propios**

* **Chevron de pipeline:** cinco pasos con recorte en punta de flecha. Gris para pendiente, azul marino para completado, naranja para el actual.

* **Línea de vida:** nodos en rombo sobre línea horizontal, con el color de cada decisión.

* **Tarjeta con borde lateral:** rojo si vencida, naranja si arrastrada.

* **Indicador con esquina biselada:** triángulo de color en la esquina superior derecha según el estado del dato.

## **15.4  Accesibilidad y responsive**

* Contraste mínimo 4,5:1 en texto normal. Verificar naranja sobre blanco: usar el tono 600 para texto.

* Foco visible en todo elemento interactivo. No eliminar el contorno sin sustituirlo.

* El arrastre del Kanban debe tener alternativa por teclado y por menú.

* Nunca comunicar estado solo con color: acompañar siempre con etiqueta de texto.

* Respetar prefers-reduced-motion.

* Puntos de quiebre: escritorio completo; hasta 1200 px el Kanban baja a dos columnas y los indicadores a tres; hasta 1024 px el rail pasa a barra horizontal y todas las rejillas a una columna.

* El expediente debe ser usable en tableta: es donde se toma el acta durante la reunión.

## **15.5  Rendimiento**

| Métrica | Objetivo |
| :---- | :---- |
| Carga del panel ejecutivo | Menos de 1,5 s con 500 acciones |
| Apertura del expediente | Menos de 1 s con 30 temas |
| Cambio de etapa en el Kanban | Respuesta optimista inmediata, confirmación en menos de 500 ms |
| Generación del acta | Menos de 5 s |

Los indicadores del panel se leen de vistas, no se calculan en la aplicación. Evitar consultas N+1 al listar temas con su checklist: agregar el conteo en la consulta.

# **16  Pruebas y criterios de aceptación**

## **16.1  Pruebas unitarias — obligatorias**

Sobre lib/ops/rules.ts, sin base de datos. Cada regla de negocio con lógica tiene su prueba.

| Prueba | Verifica |
| :---- | :---- |
| applyDecision · sin\_cambio | Mueve el plazo, no toca prórrogas ni is\_final |
| applyDecision · prorroga | Incrementa extensions en uno y mueve el plazo. RN-19 |
| applyDecision · ultimo\_plazo con fecha nueva | Marca is\_final e incrementa extensions. RN-20 |
| applyDecision · ultimo\_plazo sin cambio de fecha | Marca is\_final sin incrementar extensions. RN-20 |
| applyDecision · cerrado | Lleva a finalizado, registra closed\_at, no mueve el plazo. RN-21 |
| applyDecision · cualquier rama | original\_due nunca aparece en el resultado. RN-09 |
| isInherited | Aplica los cinco criterios de RN-15, incluida la exclusión de ya revisadas |
| canExtendFinal | Solo admin y director. RN-23 |
| buildMeetingCode | Formato y secuencia por empresa y día. RN-01 |
| buildTopicCode | Formato y secuencia por empresa y año. RN-02 |
| checklistPercent | Redondeo correcto y cero ítems devuelve 0 |
| visibleCompanies | Pertenencia menos exclusión. RN-28 |

## **16.2  Pruebas de integración**

* Retomar una acción crea exactamente una fila en topic\_reviews y una en task\_updates.

* Retomar dos veces en la misma reunión actualiza la revisión existente en lugar de duplicarla. RN-25

* Cerrar una reunión con acciones abiertas no cambia la etapa de ninguna. RN-06

* Un usuario excluido de una empresa no recibe sus reuniones ni sus acciones, ni siquiera consultando la API directamente. RN-28

* Un participante no puede registrar una prórroga aunque manipule la petición.

* El código de reunión no colisiona con dos creaciones simultáneas para la misma empresa y día.

## **16.3  Criterios de aceptación**

El módulo se acepta cuando estos escenarios se ejecutan de principio a fin sin intervención técnica.

| ID | Escenario | Resultado esperado |
| :---- | :---- | :---- |
| CA-01 | Crear una reunión, añadir tres participantes, dos temas con checklist y cerrarla | El acta exportada contiene todo lo registrado y las dos acciones siguen abiertas |
| CA-02 | Crear una segunda reunión de la misma empresa dos semanas después | Las dos acciones abiertas aparecen en el bloque de heredados |
| CA-03 | Retomar una acción con decisión Prórroga y nueva fecha | El plazo vigente cambia, el original se conserva, el contador sube a uno y la línea de vida muestra tres nodos |
| CA-04 | Retomar la misma acción en una tercera reunión con Último plazo | is\_final queda en true y la interfaz avisa. El acta imprime la decisión y ambas fechas |
| CA-05 | Intentar prorrogar esa acción con un usuario Participante | La opción no aparece; forzando la petición, el servidor la rechaza |
| CA-06 | Prorrogarla con un usuario Director | Se permite y queda registrada en auditoría como excepción |
| CA-07 | Mover una tarjeta en el Kanban de En proceso a Validación | La etapa cambia y aparece una línea de historial con etapa anterior y nueva |
| CA-08 | Marcar todos los ítems del checklist de una acción | El avance llega al 100 % y cada ítem muestra quién lo marcó y cuándo |
| CA-09 | Añadir dos empresas relacionadas a una acción | La acción aparece en el pipeline de las tres empresas, una sola vez en cada uno |
| CA-10 | Consultar el panel con ámbito en una sola empresa | Todos los indicadores y listados corresponden solo a esa empresa |
| CA-11 | Exportar el acta de una reunión con retomas | El Word incluye la tabla de pendientes de reuniones anteriores con plazo anterior y nuevo |
| CA-12 | Entrar con un usuario recién creado en la plataforma | Accede al módulo sin configuración previa, con rol Participante, y ve sus propias acciones |
| CA-13 | Excluir a un usuario de una empresa desde el directorio | Esa empresa desaparece de su selector de ámbito y de todos sus listados |
| CA-14 | Revisar la auditoría tras los pasos anteriores | Cada creación, cambio de etapa, retoma, cierre y exportación está registrada con autor y fecha |

# **17  Plan de trabajo**

Estimación para un desarrollador a tiempo completo con apoyo puntual de diseño y QA. Las semanas son de trabajo efectivo.

| Sprint | Alcance | Entregable verificable | Duración |
| :---- | :---- | :---- | :---- |
| 0 | Migración del esquema, políticas RLS, vistas, catálogos y alta automática de usuarios | La base responde a las consultas del panel con datos de prueba | 3 días |
| 1 | Shell del módulo, selector de ámbito, panel ejecutivo y listado de reuniones | Un usuario entra, ve indicadores reales y navega | 1 semana |
| 2 | Expediente de reunión: datos generales, participantes y temas con checklist | Se puede levantar un acta completa de principio a fin | 1,5 semanas |
| 3 | Retoma de pendientes: heredados, panel de revisión, línea de vida y reglas RN-15 a RN-26 | CA-02, CA-03, CA-04, CA-05 y CA-06 pasan | 1,5 semanas |
| 4 | Pipeline con arrastre, ficha de acción, historial y vista de arrastres | CA-07, CA-08 y CA-09 pasan | 1 semana |
| 5 | Exportación Word y PDF en servidor con plantilla corporativa | CA-11 pasa y el documento abre correctamente en Word y Google Docs | 4 días |
| 6 | Adjuntos, notificaciones, trabajos programados y tiempo real | Los correos llegan y el expediente se actualiza entre dos sesiones abiertas | 1 semana |
| 7 | Directorio, auditoría, permisos finos y endurecimiento | CA-12, CA-13 y CA-14 pasan | 4 días |
| 8 | QA, accesibilidad, rendimiento y piloto | Checklist del anexo C completo | 2 semanas |

**Total estimado:** nueve a diez semanas hasta el fin del piloto. El sprint 3 es el de mayor riesgo y el que no debe recortarse: contiene la lógica que distingue al módulo.

## **17.1  Orden de construcción recomendado**

Construir de dentro hacia fuera. Primero las reglas puras en rules.ts con sus pruebas, después las Server Actions, después la interfaz. Una regla probada antes de tener pantalla ahorra días de depuración cuando la pantalla ya existe.

## **17.2  Piloto**

Comité operativo semanal de Stratix durante dos semanas: volumen bajo, participantes conocidos y plazos cortos. Es la condición ideal para calibrar el flujo de retomas antes de abrir el módulo al resto de las marcas. Recoger en ese periodo tres datos: cuántos clics cuesta levantar un acta completa, si el bloque de heredados se usa antes que los temas nuevos, y cuántas retomas se registran sin comentario significativo.

# **18  Definición de terminado y riesgos**

## **18.1  Definición de terminado**

Una tarea del sprint está terminada cuando cumple todo lo siguiente. No es una lista aspiracional: es el criterio de revisión.

* El código está en la rama del módulo y pasó revisión de un segundo par de ojos.

* Las reglas de negocio implicadas tienen prueba unitaria en verde.

* TypeScript compila sin errores y sin any en código de dominio.

* La pantalla funciona en escritorio y en tableta, con foco visible y navegable por teclado.

* Los estados vacío, de carga y de error están implementados con texto propio, no genérico.

* Toda escritura queda registrada en auditoría.

* El texto de interfaz está en español, en tono directo y sin jerga técnica visible para el usuario.

* Se probó con un usuario de rol Participante, no solo con Administrador.

## **18.2  Riesgos y mitigación**

| Riesgo | Impacto | Mitigación |
| :---- | :---- | :---- |
| Catálogo de empresas duplicado con el del CRM | Alto | Definir desde el sprint 0 cuál es el maestro y sincronizar por sigla. Es el error más caro de este tipo de integración |
| La retoma se implementa como duplicación de la acción | Alto | Prueba de integración explícita: retomar no debe crear filas en meeting\_topics |
| El último plazo queda como simple advertencia | Alto | CA-05 y CA-06 lo verifican en servidor, no en interfaz |
| Adopción baja por fricción al levantar el acta | Medio | Medir clics en el piloto; guardado automático al perder el foco, sin botones intermedios |
| Arrastre del Kanban inaccesible por teclado | Medio | Alternativa por menú desde el primer día, no como añadido posterior |
| Rendimiento del panel al crecer el volumen | Medio | Indicadores desde vistas e índices del apartado 6 desde el inicio |
| Exportación distinta entre Word y PDF | Bajo | Una sola plantilla como fuente de ambos formatos |

## **18.3  Decisiones abiertas para confirmar antes del sprint 1**

| Decisión | Responsable | Fecha límite |
| :---- | :---- | :---- |
| Origen maestro del catálogo de empresas | Dirección de Marketing y Desarrollo | Antes del sprint 0 |
| Rol por defecto de un usuario nuevo (se propone Participante) | Dirección de Marketing | Antes del sprint 0 |
| Ubicación de la entrada del módulo en el menú principal | Desarrollo | Sprint 1 |
| Plantilla gráfica definitiva del acta exportada | Diseño | Antes del sprint 5 |
| Remitente y firma de los correos del módulo | Dirección de Marketing | Antes del sprint 6 |

# **Anexo A · Esquema de base de datos**

Fragmento de la migración inicial. El archivo completo se entrega como supabase/migrations/20260901\_ops\_schema.sql.

| 20260901\_ops\_schema.sql (extracto) |
| :---- |
| create schema if not exists ops; create extension if not exists "pgcrypto";   create type ops.app\_role       as enum   ('admin','director','meeting\_owner','participant','viewer'); create type ops.meeting\_status as enum ('borrador','en\_curso','cerrada'); create type ops.attendance     as enum ('presente','ausente','invitado'); create type ops.topic\_stage    as enum   ('nuevo','asignado','en\_proceso','validacion','finalizado'); create type ops.priority       as enum ('baja','media','alta','critica'); create type ops.review\_decision as enum   ('sin\_cambio','prorroga','ultimo\_plazo','escalado','cerrado'); create type ops.update\_kind    as enum   ('cambio\_estado','checklist','plazo','revision','comentario','reasignacion');   create table ops.meeting\_topics (   id                 uuid primary key default gen\_random\_uuid(),   code               text unique,   meeting\_id         uuid not null references ops.meetings(id),   current\_meeting\_id uuid references ops.meetings(id),   company\_id         uuid not null references ops.companies(id),   related\_companies  uuid\[\] not null default '{}',   title              text not null,   description        text,   owner\_id           uuid not null references ops.app\_users(id),   collaborators      uuid\[\] not null default '{}',   approver\_id        uuid references ops.app\_users(id),   priority           ops.priority    not null default 'media',   stage              ops.topic\_stage not null default 'nuevo',   original\_due       date,   due\_date           date,   extensions         int  not null default 0,   is\_final           boolean not null default false,   closed\_at          timestamptz,   created\_by         uuid references ops.app\_users(id),   created\_at         timestamptz not null default now(),   updated\_at         timestamptz not null default now() );   create table ops.topic\_reviews (   id           uuid primary key default gen\_random\_uuid(),   topic\_id     uuid not null references ops.meeting\_topics(id) on delete cascade,   meeting\_id   uuid not null references ops.meetings(id) on delete cascade,   meeting\_date date not null,   user\_id      uuid references ops.app\_users(id),   previous\_due date not null,   new\_due      date not null,   decision     ops.review\_decision not null,   comment      text not null,   evidence     text,   created\_at   timestamptz not null default now(),   unique (topic\_id, meeting\_id)          \-- RN-25 );   \-- original\_due inmutable (RN-09) create or replace function ops.protect\_original\_due() returns trigger language plpgsql as $$ begin   if old.original\_due is not null      and new.original\_due is distinct from old.original\_due then     new.original\_due := old.original\_due;   end if;   if old.original\_due is null then     new.original\_due := coalesce(new.original\_due, new.due\_date);   end if;   return new; end $$;   create trigger trg\_protect\_original\_due   before update on ops.meeting\_topics   for each row execute function ops.protect\_original\_due(); |

# **Anexo B · Códigos de documento**

| Entidad | Formato | Ejemplo | Secuencia |
| :---- | :---- | :---- | :---- |
| Reunión | MTG-{SIGLA}-{AAAA}-{MMDD}-{NNN} | MTG-EMG-2026-0828-001 | Por empresa y día |
| Acción | ACC-{SIGLA}-{AAAA}-{NNNN} | ACC-EMC-2026-0042 | Por empresa y año |
| Documento interno | STX-SPEC-{AAAA}-{MÓDULO}-{NNN} | STX-SPEC-2026-OMH-001 | Manual |

Siglas vigentes de las marcas del grupo: EMG (Eminat Group), EMC (Eminat Medical Center), ERG (Eminat Research Group), PSC (Premier Specialty Center), STX (Stratix Communications), ODM (Ondara Media), DCI (DaCoach IS), VNF (Vivi Negrete Foundation), CZS (Corazón Salud). Al incorporar una marca nueva, la sigla se registra en companies antes de crear reuniones.

# **Anexo C · Checklist de QA**

Verificar cada punto antes de dar el módulo por terminado. Marcar con el usuario indicado en cada caso.

| \# | Verificación | Rol de prueba |
| ----- | :---- | :---- |
| 1 | Un usuario nuevo entra al módulo sin configuración previa | Participante |
| 2 | El selector de ámbito lista solo empresas visibles | Participante |
| 3 | Los indicadores del panel cambian al cambiar el ámbito | Director |
| 4 | Se puede levantar un acta completa sin salir de la pantalla | Resp. reunión |
| 5 | El cargo del participante queda congelado tras cambiarlo en el directorio | Administrador |
| 6 | El bloque de heredados aparece con las acciones correctas | Resp. reunión |
| 7 | La retoma no duplica la acción | Resp. reunión |
| 8 | El comentario vacío impide guardar la revisión | Resp. reunión |
| 9 | La prórroga incrementa el contador y conserva el plazo original | Resp. reunión |
| 10 | El último plazo bloquea nuevas prórrogas | Participante y Director |
| 11 | La línea de vida muestra un nodo por reunión con las fechas correctas | Director |
| 12 | Cerrar el acta no cierra las acciones | Resp. reunión |
| 13 | El acta cerrada queda en solo lectura en todos sus bloques | Resp. reunión |
| 14 | El arrastre en el Kanban registra historial | Participante |
| 15 | Existe alternativa por teclado al arrastre | Participante |
| 16 | El checklist guarda autor y fecha de marcado | Participante |
| 17 | Una acción transversal aparece una sola vez por empresa | Director |
| 18 | El Word exportado abre en Word y Google Docs y es editable | Cualquiera |
| 19 | El PDF y el Word muestran el mismo contenido | Cualquiera |
| 20 | La exclusión de empresa se aplica también en la API | Administrador |
| 21 | La auditoría registra creación, cambio, retoma, cierre y exportación | Director |
| 22 | Los correos de recordatorio llegan a tres días y a un día | Cualquiera |
| 23 | El expediente es usable en tableta | Resp. reunión |
| 24 | Contraste y foco cumplen en todas las pantallas | Cualquiera |
| 25 | El panel carga en menos de 1,5 s con 500 acciones | Cualquiera |

# **Anexo D · Datos de prueba**

Sembrar el entorno de desarrollo con este escenario, que reproduce el caso completo de arrastre y permite validar todas las reglas de la sección 7 sin construir datos a mano.

| Elemento | Contenido |
| :---- | :---- |
| Empresas | Las nueve marcas del grupo con sus siglas y colores |
| Usuarios | Ocho personas cubriendo los cinco roles |
| Reunión 1 | Hace 26 días. Comité operativo de Stratix con cinco participantes y tres temas |
| Reunión 2 | Hace 13 días. Seguimiento donde una acción se prorroga y otra se cierra |
| Acción A | Campaña Weight Loss (EMC \+ STX \+ ODM). Nace en la reunión 1, prorrogada en la 2, hoy vencida y con checklist al 40 % |
| Acción B | Manual de marca PSC. Abierta, en validación, dentro de plazo |
| Acción C | Perfiles de contratación. Cerrada, alimenta el tiempo promedio de cierre |
| Acción D | Sección Corazón Salud. Nace en la reunión 2, vencida sin prórroga, prioridad crítica |
| Exclusión | Un usuario excluido de una empresa para probar RN-28 |

| Referencia de comportamiento El prototipo HTML entregado junto a este documento viene sembrado exactamente con este escenario. Al crear una reunión nueva, la Acción A aparece en el bloque de heredados lista para retomarse. Antes de escribir la primera línea de código, ábralo y recorra el flujo completo: crear reunión, retomar el pendiente, declarar último plazo y exportar el acta. Media hora ahí ahorra una semana de interpretación. |
| :---- |

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQ4AAABWCAYAAAA+G3iLAAAHXklEQVR4Xu3dTaid1RXGcS1+xSod1JFHQbBIZjqwg4KgtZpZdaBIBwUFpYQcO6qDUh0ItkLBQXBQcKJRJ34MHAjqIA60VBz6EQLpJBdMRLEURVuKttyufdwn2XnW2u/e73vuzf36D37knmevtd57ws4iuTchF6yvr18AAGO4AABaXAAALS4AgBYXAECLCwCgxQUA0OICAGhxAQC0uAAAWlyArTe7/rb1iNYBW8UFNXZx79eLXPjO3K09mCb4+WVxYFtxQcku66V6eUdY03kyW+sXtG6n0veV3aJ1kaBvV/3cYOdzQUkv7khrOq9nttbtVPq+MhYHdgUXLOmlnWBNZ/bM17qdSt9XxuLAruCCRC/sRGs6t+cZWrdT6fvKuhYHsN25IAkufNcvaqu5rqhf0/ONeMZOoe8rY3FgV3BBElz45HWtW0Uwf8MXh837a89sO/uzfh7iHe1pCWYkLA7sCi5Igguf/FbrxgpmdpM5B/U8+yCfPxmc6YwH9LzTjfq+8ryLgtped8gsPV8Inulqsiu0ttWjdcAQFyR6qTbqcum8MWROdXEEWW3G1MWR/C94b+d9cWxUrblQa4EhLkiCi1X6Qut7BbO6yZza4jgeZLUZqyyO5F6ZtyWLo7feXj+m59lRnQe0uCAJLteQr81VOiMS9HaTObXFMUhmlIvjFf1cc821OmNg3lYuji+1Nts3dSYwxAWJXajL9YKN8FOdFwn6FrQuMutYHNqjrOY+zWp0ds8ztDbr+uJo0Df1eYsezXrmAUNcsGQX6029aGPoPKX1vX25d2hxuK8/rMpmXhM8Z13rpMfVzzZxcQz1Vdyg/UAvF6jgwnXTWT1ztS4yG1gcWtvLeo/qrA4HdE4xT2uTzV4cF2pPjfYCY7ggYhftR3rxOh3SWcVMrV3QushsgxbHrP4Fw14HdWYxW2uTTV0cufdd7VPaA4zlgl52AQ/rhYxoX9HvaofqpXflxaF9Ez2scxvzN31xDPWPmQEMccEUejl7LqrWteqlt7Y4PtbaiNX9KeidYsctDvOl1gNjuWCq4IIOXnata9VLb21xLP7maEvQN/j8Wf1brdtucWhPxdXaB4zhgqmCyzl42bWuVS+9m7I4tK6of0Rrs221OLR+iPYCY7ggyZfrbc2H6MVsXVCta9VL7/leHK42G7s4/qB1kaBv8PPLPZdpfXY6yJrzgCEuSPSCmee1pqg9ENQ3L6fWFc75q9yR2XlcHJaf0rrC2MURPkNpT0+v1pY99uM+zXtmAjUuSPRyTaVzpz4j6N2UxaHPstef67kYvTgivb1aN6Zez6IaoJcLEr1cU+lcecbFWl8T9K66OO4Keoc8E2TJli8Oy/+rddn+oFZrqnOBIS5I9GJNoTMj2lMT9K20OMY823wzm/BdlTHP6O0L6m7Wmlrt2Nmluw+cXi/pOfYeFyzZZXpaL1enX+msIbPhryEsBD0rL448R/udXDdpcYx5Rk/P1LqeHnNCaxNdGiwPJC4YYpfrXvOa+cx8a07OOr9TsJ3Ze/iZOTb7/j+WesVcojV7kS4LpfXYO1wALOmiUFqPvcMFwJIuCqX12DtcACzpolBaj73DBcCSLgql9dg7XACUdFmwNJC4AFAsDSgXAECLCwCgxQUA0OICAGhxAQC0uAAAWlwAAC0uWJo/8tQfzb9N9V+/2tlD5jvzOz3bLey9nTCfmov07Hyw535hjmk+hc35u/nI/FDPgDFckNjFWjfvmUvNS+l1peZrs898Uql5rJKn3ptXqE3ZYc0qvefk+nogez/332quzR8f0bplf3S2fH5E64Le47l2v/lF/vimoC6ad6pSd6e53nyl58AYLtBLGLGa58yb2mc+lCwtg3+Yb6Qu0WVQq70lqE35Zi8Ol0Ws7tWe+qHz6GxMpvlcFoe9Pql9wCpcoJcwUqvRfH52GZzJlxd97pdBrXalxaFnQ3XF6/Q7jHe0LhI9IzJ0rmf5/f2tVVdm8h51cfwkz7xY+4EpXBBdTlWr0Xx+dhk8a35u/mJ+mS+xLoNa7YYsjjSzVVe8PmQe1DplNVcVz/ixeUJritpFXUTP8ufrnq91ZVaezeM/qvw+z3W/QwHGckHPparVaD7Py2B5Vl7yuV8GtdpocXxlXpBsUV/LymcP1RXZmT8y1Wifvp56Zq//af7VqtOseI9ucUjPW+bXmgO9XBBdTmU1L5o3tM98JJkug/8UH+syqNVGi+M3qUayc15rZh+/bK5o1Q1lKn+e6gda15oXnU3J8vPTe2wtjtvN45oDvVyQBL8Y1jtqPg1qziyDoFeXQa3WLY5iRunRqEZfaxbV5ezK4BlHivN75vKtant9WTSr9oyhM8tm+nytiXpzrX6N41hrVpQBNS4AgBYXAECLCwCgxQUA0OICAGhxAQC0uAAAWlwAAC0uAIAWFwBAiwsAoMUFANDiAgBocQEAtLgAAFpcAAAtLgCAFhcAQIsLAKDFBQDQ4gIAaHEBALS4AABaXAAALS4AgBYXAECLCwCgxQUA0PJ/CX3wyGJxGXMAAAAASUVORK5CYII=>