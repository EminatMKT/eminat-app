# Eminat Group — Operations Management Hub
### Submódulo: Meeting & Action Tracker · v2.0 · Producto de Stratix Solutions

---

## 1. Qué cambia respecto de la v1

La primera versión era una lista de pendientes con empresa, estado y responsable. Servía para saber *qué falta*, no para saber *por qué sigue faltando*.

```
ANTES   Empresa → Tarea → Estado → Responsable → Seguimiento

AHORA   Empresa → Reunión → Temas → Acciones → Responsables
                → Checklist → Pipeline → Evidencia → Cierre
```

Tres decisiones sostienen la versión nueva:

**1. La acción no pertenece al acta: la sobrevive.** Un tema abierto el 2 de agosto no se copia ni se reescribe el 28. Se *retoma*. La acción es una sola entidad con un código propio que atraviesa todas las reuniones donde se discutió, y cada retoma deja constancia del plazo anterior, el nuevo y la decisión que lo justificó.

**2. Un tema es un objeto, no un párrafo.** Cada uno lleva responsable principal, colaboradores, aprobador, empresas involucradas, prioridad, fecha compromiso, checklist propio y pipeline propio. El botón "Agregar nuevo tema" instancia ese objeto completo.

**3. Nada se sobrescribe.** Cambiar de etapa, marcar un ítem del checklist o mover un plazo genera una línea de historial fechada y firmada. El estado actual es el resultado de la historia, no un campo que alguien editó.

---

## 2. El caso que motivó la versión: el pendiente que no muere

Escenario real: reunión del 2 de agosto, acción "Campaña Weight Loss — EMC" con plazo al 17. El 15 de agosto se revisa y se prorroga al 26. Hoy, 28 de agosto, sigue abierta y vencida.

Al abrir el expediente de hoy, el módulo muestra un bloque **"Pendientes de reuniones anteriores"** con esa acción, su origen, su antigüedad en días, el porcentaje de checklist completado y las prórrogas acumuladas. El botón *Retomar* abre el panel de revisión, que exige tres cosas:

| Campo | Por qué es obligatorio |
|---|---|
| **Decisión** | Se mantiene el plazo · Prórroga · Último plazo · Escalado a dirección · Cerrado en reunión |
| **Nuevo plazo** | Obliga a comprometer una fecha, no a dejarla "en revisión" |
| **Comentario** | Es el texto que aparecerá en el acta; sin él no se guarda |

Al registrar la revisión, el sistema:
- conserva el **plazo original** intacto y actualiza el **plazo vigente**;
- incrementa el contador de **prórrogas**;
- si la decisión es *último plazo*, marca la acción como cerrada a extensiones — volver a moverla exige rol de Director o Administrador, y queda registrado como excepción;
- añade la revisión a la tabla "Pendientes retomados" del acta, que se exporta al Word;
- avisa a partir de la segunda prórroga sugiriendo declarar el último plazo en lugar de seguir extendiendo.

**Línea de vida del pendiente.** Es el elemento visual característico del módulo: una línea horizontal con un nodo en rombo por cada reunión donde la acción se trató, mostrando el desplazamiento de fechas. Naranja para prórroga, rojo para último plazo, verde para cierre. En un vistazo se distingue una acción que avanza de una que solo cambia de fecha.

```
MTG-STX-2026-0802-001    MTG-STX-2026-0815-001    HOY
   ◇ 02 ago                  ◆ 15 ago              ◆ 28 ago
   Plazo 17 ago           17 ago → 26 ago       Vencido 26 ago
```

---

## 3. Arquitectura funcional

```
┌─ PANEL EJECUTIVO ────────────────────────────────────────┐
│ Reuniones del mes · Abiertos · Vencidos · Arrastrados    │
│ Finalizados · Cierre promedio (días)                     │
│ Cumplimiento por empresa · Cumplimiento por responsable  │
└──────────────────────────────────────────────────────────┘
        │
┌─ REUNIONES ──────────────────────────────────────────────┐
│ Expediente: datos generales · participantes ·            │
│ pendientes heredados · temas · conclusiones · próxima    │
│ Exportación Word / PDF                                   │
└──────────────────────────────────────────────────────────┘
        │
┌─ PIPELINE ───────────────────────────────────────────────┐
│ Kanban de 5 etapas con arrastre                          │
│ Nuevo ▸ Asignado ▸ En proceso ▸ Validación ▸ Finalizado  │
└──────────────────────────────────────────────────────────┘
        │
┌─ ARRASTRES ──────────────────────────────────────────────┐
│ Acciones abiertas tras 2+ reuniones, ordenadas por       │
│ prórrogas y antigüedad. Es el tablero de la dirección.   │
└──────────────────────────────────────────────────────────┘
        │
┌─ GOBIERNO ───────────────────────────────────────────────┐
│ Directorio · Auditoría · Configuración de marca y datos  │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Modelo de datos (conceptual)

Diez entidades. La relación clave está en negrita.

**companies** — `id · code (sigla) · name · brand_color · country · is_active`
El código corto (EMG, EMC, ERG, PSC, STX, ODM, DCI, VNF, CZS) es la llave natural para cruzar con el resto del CRM.

**users** — `id · auth_user_id · full_name · email · position · department · company_id · role · is_active`
`role` ∈ {admin, director, meeting_owner, participant, viewer}. Los responsables de acciones se eligen siempre de aquí; no hay campos de texto libre.

**user_companies** — `user_id · company_id · role`
Un usuario puede operar en varias marcas con rol distinto en cada una.

**access_denylist** — `user_id · company_id · reason`
Exclusión explícita. **Prevalece sobre cualquier permiso concedido**; la visibilidad se calcula como pertenencia menos exclusión.

**meetings** — `id · code · company_id · area · meeting_type_id · title · location · modality · meeting_date · start_time · end_time · secretary_id · chair_id · objective · agenda · conclusions · next_meeting_date · next_meeting_notes · status · created_by`
Código: `MTG-{SIGLA}-{AÑO}-{MMDD}-{NNN}` → `MTG-EMG-2026-0828-001`. Estados: borrador → en curso → cerrada.

**meeting_participants** — `id · meeting_id · user_id | guest_name · position · department · company_id | guest_company · role_in_meeting · attendance (presente/ausente/invitado) · is_guest`
`position` y `department` se guardan como fotografía del momento: el acta de 2024 debe seguir diciendo lo que decía en 2024. El historial de participación de una persona sale de agregar esta tabla.

**meeting_topics** — la entidad central
`id · code · meeting_id (origen) · current_meeting_id (última revisión) · company_id (principal) · related_companies[] · title · description · owner_id · collaborators[] · approver_id · priority · stage · original_due · due_date · extensions · is_final · closed_at · created_at`

- `meeting_id` nunca cambia: es donde nació.
- `current_meeting_id` apunta a la última reunión que la revisó.
- `original_due` nunca cambia; `due_date` es el plazo vigente. La diferencia entre ambos es la métrica de deslizamiento.
- `is_final` bloquea nuevas prórrogas salvo excepción de dirección.
- Código: `ACC-{SIGLA}-{AÑO}-{NNNN}`.

**checklists** — `id · topic_id · text · done · done_by · done_at · evidence`
Quién completó, cuándo y con qué evidencia. El porcentaje del checklist es el avance real; la etapa del pipeline es la declaración de avance. Cuando divergen, hay un problema que conviene ver.

**topic_reviews** — la entidad que hace posible el arrastre
`id · topic_id · meeting_id · meeting_date · user_id · previous_due · new_due · decision · comment · evidence · created_at`
Una fila por cada vez que una acción se retoma en una reunión posterior. Es la fuente de la línea de vida, del contador de prórrogas y de la tabla "Pendientes retomados" del acta.

**task_updates** — `id · topic_id · user_id · kind (cambio_estado / checklist / plazo / revision / comentario) · from · to · body · evidence · created_at`
Historial inmutable.

**attachments** — `id · entity_type · entity_id · file_name · mime_type · size · storage_path · uploaded_by`

**audit_logs** — `id · actor_id · action · entity_type · entity_id · company_id · before · after · created_at`

### Relaciones

```
companies 1─n meetings 1─n meeting_participants
                       1─n meeting_topics (origen)
meeting_topics 1─n checklists
               1─n task_updates
               1─n topic_reviews n─1 meetings   ← el arrastre entre reuniones
               n─n companies (principal + relacionadas)
               n─n users (responsable, colaboradores, aprobador)
```

Una acción con `related_companies = [EMG, STX, ODM]` y `company_id = EMC` aparece en el pipeline de las cuatro marcas, sin duplicarse.

---

## 5. Flujo completo del usuario

**Antes de la reunión.** El responsable abre una reunión nueva; el sistema asigna código y fecha. Se cargan los participantes desde el directorio (cargo y departamento se autocompletan). Se escribe el objetivo.

**Durante la reunión — primer bloque.** El módulo presenta los pendientes heredados de actas anteriores de esa empresa. Se revisan uno por uno: se decide, se fija el nuevo plazo y se escribe el comentario que quedará en el acta. Este bloque va primero por diseño: los arrastres se atienden antes de abrir temas nuevos.

**Durante la reunión — segundo bloque.** "Agregar nuevo tema" por cada punto tratado. Cada tema recibe responsable, aprobador, colaboradores, empresas involucradas, prioridad, fecha compromiso y su checklist.

**Al cerrar.** Se escriben conclusiones y la fecha de la próxima reunión. Se cierra el acta: queda en solo lectura, **pero sus acciones siguen vivas** y aparecerán como pendientes heredados en la siguiente sesión. Se exporta a Word o PDF.

**Entre reuniones.** Los responsables marcan ítems del checklist y mueven sus tarjetas en el pipeline. Cada movimiento queda en el historial. La dirección vigila el tablero de Arrastres.

**En la siguiente reunión.** El ciclo se cierra sobre sí mismo: lo que quedó abierto vuelve a aparecer, con toda su historia visible.

---

## 6. Permisos

| Acción | Admin | Director | Resp. reunión | Participante | Consulta |
|---|:--:|:--:|:--:|:--:|:--:|
| Abrir y editar reuniones | ✓ | ✓ | ✓ | — | — |
| Cerrar actas | ✓ | ✓ | ✓ | — | — |
| Crear temas y acciones | ✓ | ✓ | ✓ | — | — |
| Editar cualquier acción | ✓ | ✓ | — | — | — |
| Editar acciones propias | ✓ | ✓ | ✓ | ✓ | — |
| Registrar prórrogas | ✓ | ✓ | ✓ | — | — |
| Extender un último plazo | ✓ | ✓ | — | — | — |
| Exportar Word y PDF | ✓ | ✓ | ✓ | ✓ | — |
| Ver auditoría | ✓ | ✓ | — | — | — |
| Roles y exclusiones | ✓ | — | — | — | — |

La fila que importa es "extender un último plazo". Es el único freno estructural contra la prórroga infinita: cuando una acción llega a ese punto, moverla deja de ser una decisión operativa y pasa a ser una decisión de dirección con registro en auditoría.

---

## 7. Exportación documental

El Word generado incluye membrete con isotipo, marca, código de reunión y fecha; datos generales; participantes con cargo, departamento y estado; objetivo; **pendientes de reuniones anteriores con plazo anterior, nuevo plazo y decisión**; temas tratados con su checklist marcado; tabla de acciones con plazo original, plazo vigente y prórrogas; conclusiones; próxima reunión; y bloque de firmas. El PDF usa la misma plantilla.

Para producción conviene mover la generación al servidor —`docx` para Word y Puppeteer sobre la misma plantilla para PDF— de modo que ambos formatos sean idénticos, las fuentes queden incrustadas y el evento `EXPORT` se registre desde el backend.

---

## 8. Integración en el CRM y despliegue como producto Stratix Solutions

**Ubicación.** Módulo dentro del CRM existente, junto a Marketing, Clientes, Proyectos y Operaciones. Ruta sugerida `/(crm)/operaciones/` con vistas para panel, reuniones, expediente, pipeline, arrastres, directorio y auditoría.

**Autenticación.** No crear login propio. Los usuarios del módulo referencian los del CRM; el rol operativo es un atributo adicional, no una cuenta nueva.

**Catálogo de empresas.** Debe ser el mismo del CRM o una vista sincronizada por la sigla. Dos catálogos divergentes es el error más caro de este tipo de integración.

**Multiempresa / marca blanca.** Como producto de Stratix Solutions para varios clientes, tres cosas se configuran sin tocar código: nombre de la organización, nombre del módulo y proveedor. Cada organización cliente vive en su propio espacio de datos; las siglas y colores de marca alimentan toda la interfaz. El prototipo ya expone esta configuración.

**Notificaciones.** Con el proveedor de correo transaccional ya en uso:
- convocatoria al abrir la reunión;
- acta aprobada en PDF a los participantes;
- recordatorio a 3 y a 1 día del plazo de cada acción;
- alerta al responsable y al aprobador cuando una acción entra en último plazo;
- resumen semanal de arrastres a cada director.

**Tiempo real.** Suscripción por empresa para que el pipeline y el expediente se actualicen mientras varias personas trabajan sobre la misma reunión.

**Analítica.** Los indicadores del panel —cumplimiento por empresa y por responsable, tiempo promedio de cierre, prórrogas acumuladas— se consumen directamente desde el mismo origen para tableros externos.

---

## 9. Puesta en marcha

| Fase | Alcance | Duración |
|---|---|---|
| 1 | Modelo de datos y catálogos reales (empresas, personas, roles) | 2 días |
| 2 | Portar las vistas del prototipo al CRM; auth y permisos | 2 semanas |
| 3 | Exportación en servidor con plantilla corporativa | 3–4 días |
| 4 | Notificaciones, adjuntos y tiempo real | 1 semana |
| 5 | Piloto y ajuste antes de extender al grupo | 2 semanas |

**Piloto recomendado:** el comité operativo semanal de Stratix. Volumen bajo, participantes conocidos y plazos cortos — condiciones ideales para calibrar el flujo de retomas antes de llevarlo a EMC y al comité de dirección.

---

## 10. Sobre el prototipo

`Eminat_Operations_Management_Hub.html` funciona sin servidor: se abre con doble clic y guarda en el navegador.

Viene con datos sembrados que reproducen el caso completo: una reunión de hace 26 días, otra de hace 13 donde una acción fue prorrogada, y esa misma acción hoy vencida y esperando revisión. Al crear una reunión nueva aparecerá en el bloque de pendientes heredados, lista para retomar.

En **Configuración** se conecta la base de datos, se cambia la marca del despliegue y se puede ver el módulo con los ojos de cualquier rol para validar la matriz de permisos —incluido el bloqueo de prórroga sobre un último plazo.
