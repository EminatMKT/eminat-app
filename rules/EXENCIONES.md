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
