# Exenciones vigentes

Cada fila es una regla que un archivo NO cumple, firmada a propósito. Sin la fila, la marca del
archivo no vale: el centinela frena igual.

**Por qué existe esta tabla.** Una marca de exención cuesta una línea de comentario, y un escape
gratis convierte cualquier regla en una sugerencia. Acá la excusa se paga en visibilidad: entra
en el diff, se revisa como código y se ve crecer. El día que esta tabla tenga cuarenta filas, el
problema no es la tabla — es que hay cuarenta archivos que nadie arregló.

**Para agregar una:** poner la marca en el archivo
(`// centinela-exime: <clave>@<version> — <razón>`) **y** la fila acá. La razón de la tabla
puede ser más corta que la del código; la del código es la que explica.

**Para sacar una:** arreglar el archivo y borrar las dos.

⚠️ La versión de la marca tiene que ser **exactamente** la que declara la regla en su bloque
`check:`. Cuando una regla cambia, sube su `version:` y **todas sus marcas caducan de golpe**:
los archivos vuelven a frenar y hay que revisar si la excusa sigue siendo cierta con la regla
nueva. Es a propósito — una excusa sin fecha de vencimiento es deuda invisible.

| archivo | regla | desde | por qué, en corto |
|---|---|---|---|
| `src/features/stratix-mkt/hooks/useTablero/index.ts` | `archivo-extenso@2` | 2026-08-25 | 20 derivaciones del mismo conjunto filtrado |
| `src/features/stratix-mkt/hooks/useActividadForm/index.ts` | `archivo-extenso@2` | 2026-08-25 | alta, edición y borrado comparten el payload |
| `src/features/stratix-mkt/hooks/useActividadForm/index.ts` | `useState@1` | 2026-08-25 | la ficha y el formulario son dos cosas |
| `src/features/stratix-mkt/hooks/useReporte/index.ts` | `archivo-extenso@2` | 2026-08-25 | la otra mitad sólo se usa desde acá |
| `src/features/stratix-mkt/hooks/useKanban/index.ts` | `useState@1` | 2026-08-25 | el mes y el gesto de arrastre no se tocan |
| `src/features/stratix-mkt/hooks/useSolicitudes/index.ts` | `useState@1` | 2026-08-25 | la pestaña elige vista, los criterios filtran |
| `src/features/stratix-mkt/utils/report-html/index.ts` | `archivo-extenso@2` | 2026-08-25 | es UNA plantilla HTML |
| `src/features/stratix-mkt/utils/act-detail-fields/index.test.ts` | `archivo-extenso@2` | 2026-08-25 | son casos de prueba, no lógica |
| `rules/centinela/reglas.ts` | `archivo-extenso@2` | 2026-08-25 | ya salieron los tipos y el parser |
| `rules/centinela/evaluar.ts` | `archivo-extenso@2` | 2026-08-25 | dos funciones que son una sola idea |
| `src/shared/auth/permissions/modulos/index.ts` | `archivo-extenso@2` | 2026-08-29 | es el catálogo de módulos: crece de a una entrada |
| `src/features/admin/org-catalogs/catalogo.ts` | `archivo-extenso@2` | 2026-08-29 | es el catálogo organizacional: crece de a una entrada |
| `src/features/reuniones/components/listado/ReunionRow/index.tsx` | `bloques-similares@2` | 2026-08-29 | ninguna fila compartida admite código + fecha + estado |
| `src/features/reuniones/components/listado/EstadoListado/index.tsx` | `bloques-similares@2` | 2026-08-29 | no hay un estado-de-lista compartido; ErrorList es de formularios |
| `src/features/reuniones/components/listado/ReunionesListado/index.tsx` | `bloques-similares@2` | 2026-08-29 | la parte reusable YA se reusa: ListToolbar + NewButton |
| `src/features/reuniones/components/listado/ReunionesListado/index.tsx` | `useState@1` | 2026-08-29 | buscar y abrir el expediente no viajan juntos |
| `src/shared/components/ui/ConfirmModal/index.tsx` | `useState@1` | 2026-08-29 | lo que se tipea y el "está corriendo" no viajan juntos |
| `src/features/reuniones/components/expediente/DatosGenerales/index.tsx` | `bloques-similares@2` | 2026-08-29 | `Field` se reusa; OrgModal es data-driven y este no |
| `src/features/reuniones/components/expediente/CuandoYDonde/index.tsx` | `bloques-similares@2` | 2026-08-29 | la otra mitad del mismo formulario |
| `src/features/reuniones/components/expediente/ExpedienteView/index.tsx` | `bloques-similares@2` | 2026-08-29 | es `Modal` + los campos; no agrega markup propio |
| `src/shared/components/ui/ErrorList/index.tsx` | `bloques-similares@2` | 2026-08-29 | no hay lista de errores compartida; WarningCallout es otra cosa |
| `src/shared/components/ui/ModalHead/index.tsx` | `bloques-similares@2` | 2026-08-29 | ES la unificación: sale de Modal y absorbe a ActivityFormHeader |
| `src/shared/components/ui/Modal/index.tsx` | `bloques-similares@2` | 2026-08-29 | el encabezado salió a ModalHead; sólo se agregó el pie |
| `src/shared/components/ui/ConfirmModal/index.tsx` | `bloques-similares@2` | 2026-08-29 | dejó de dibujar sus botones: usa Button y el footer de Modal |
| `src/features/stratix-mkt/components/modals/ActivityCampos/index.tsx` | `bloques-similares@2` | 2026-08-29 | es la mitad de NewActivityModal, que pasaba el techo de 150 |
| `src/features/stratix-mkt/components/modals/ActivityPlanificacion/index.tsx` | `bloques-similares@2` | 2026-08-29 | la otra mitad del mismo formulario |
| `src/features/stratix-mkt/components/modals/SolicitantePicker/index.tsx` | `bloques-similares@2` | 2026-08-29 | el único select que muestra inactivos deshabilitados |
| `src/features/stratix-mkt/components/modals/ActivityNumeros/index.tsx` | `bloques-similares@2` | 2026-08-29 | los tres campos de esfuerzo, sacados del mismo formulario |
| `src/features/stratix-mkt/components/modals/ActivityNumeros/index.tsx` | `select-con-default@2` | 2026-08-29 | el mes en curso significa algo; no depende del orden de la lista |
| `src/features/stratix-mkt/components/modals/ActivityPlanificacion/index.tsx` | `select-con-default@2` | 2026-08-29 | toda tarea del Kanban empieza en Pendiente |
| `src/features/stratix-mkt/components/modals/ActivityAcciones/index.tsx` | `bloques-similares@2` | 2026-08-29 | son dos `Button`; lo propio es qué rótulo lleva cada estado |
| `src/features/stratix-mkt/components/modals/ActivityAsignacion/index.tsx` | `bloques-similares@2` | 2026-08-29 | los dos selects obligatorios, con la invariante de la marca vigente |
| `src/features/stratix-mkt/components/modals/NewActivityModal/index.tsx` | `bloques-similares@2` | 2026-08-29 | quedó como armador: Modal + los campos + el pie, sin markup propio |
