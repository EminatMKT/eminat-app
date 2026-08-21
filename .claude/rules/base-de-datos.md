# Base de datos

## `supabase db reset` está prohibido en este repo

Para aplicar migraciones en local se usa `pnpm supabase migration up`. Nunca `db reset`.

**Motivo:** `supabase/config.toml` apunta `sql_paths` a un `seed.sql` que **no existe**. Un reset
borra las actividades de la base local y no hay seed que las devuelva. No es un reset, es un
borrado sin vuelta: los datos de prueba de este repo se cargan por la UI (ver abajo), así que no
están en ningún `.sql` esperando para restaurarse.

Si la CLI sugiere `migration repair` o `db pull` porque el historial local está desalineado con
una rama sin mergear: **tampoco**. Reescriben el historial de esa rama. El workaround es aplicar
el `.sql` por psql, que es idempotente.

## Antes de un `db push` a dev o a prod: backup y precheck, en ese orden

1. **Backup** de **todas** las tablas que la migración toca, no solo la obvia.
2. **Precheck**: correr la consulta que demuestra que la migración no va a abortar a mitad de
   camino (un `SET NOT NULL` sobre una columna con huérfanos aborta y no tiene rollback).
3. Recién ahí el `push`, y después una consulta que verifique el resultado.

El `pg_dump` corre **dentro del contenedor**:

```bash
docker exec supabase_db_eminat-app pg_dump -U postgres -d postgres \
  -t public.<tabla> --data-only > supabase/rollback/predump-<nombre>-YYYYMMDD.sql
```

**Motivo:** dos cosas que ya pasaron. El `pg_dump` del host es v14 y el servidor es Postgres 17,
así que un dump directo aborta con `server version mismatch` — y eso se descubre en el peor
momento, justo antes de un push. Y el backup de la fase 2 cubrió solo `actividades` cuando la
migración también dropeaba `usuarios.responsable_ref`: sin esa tabla no había forma de
reconstruir el mapeo ref → persona, que era exactamente lo que permitía rehacer el backfill.

## Los datos de prueba se cargan por el frontend, no por seed

Para poblar la base —usuarios, actividades, catálogos— se usa la UI de la app. El seed SQL es la
**última** opción, no la primera.

Si el frontend no permite crear algo que hace falta, **eso es el bug**: se arregla el formulario
antes de escribir el INSERT.

**Motivo:** un seed escribe filas que ningún formulario podría producir, y esa diferencia esconde
agujeros de la UI hasta que es tarde. El QA del 12/08/2026 lo mostró en los dos sentidos: el seed
dejó 9 usuarios sin cuenta de Auth (imposible por la UI) y a la vez les puso `equipo_id`, tapando
que **el panel no tenía dónde asignar un equipo** — o sea que nadie creado desde el panel podía
recibir una tarea. Cada fila insertada por SQL es una funcionalidad que nadie probó.
Ver `docs/hallazgos-qa-2026-08-12.md`.

## Un dominio cerrado no se escribe en un `CHECK`: va a su tabla de catálogo

Una columna cuyo valor sale de una lista **no** lleva `CHECK (col IN ('a','b','c'))`. Va a una
tabla de catálogo con su clave natural, y la columna la referencia por FK. El catálogo se
administra desde `/admin` → Organización agregándole una entrada a `ORG_CATALOGS`
(`src/features/admin/org-catalogs.ts`): el CRUD ya es config-driven para los seis que hay, así
que sumar uno son unas líneas, no una pantalla.

Lo mismo vale para la lista escrita en un `.ts`. `SEGUROS` y `GENEROS` en
`src/features/medical/constants.ts` son la misma enumeración hardcodeada, solo que en el otro
idioma.

**La excepción, y es angosta:** si agregar un valor **exige código nuevo** —una rama, un color,
una columna de Kanban, un parser—, la tabla mentiría: dejaría dar de alta un valor que la app
no sabe manejar. Ahí queda como dominio cerrado, con `CHECK` **y** su objeto META en
TypeScript, los dos juntos.

La prueba es una sola pregunta: **¿alguien que no toca código puede agregar un valor y que
funcione?** Si sí, es catálogo. Si hay que desplegar para que ese valor sirva de algo, es
dominio cerrado.

| Columna | Dónde va | Por qué |
|---|---|---|
| `pacientes.seguro` | tabla `seguros` | una aseguradora nueva no es código |
| `pacientes.genero` | tabla `generos` | solo se muestra |
| `research_leads.stage` | `CHECK` + `PIPELINE_COLS` | cada etapa tiene su columna en el pipeline y su color |
| `paciente_fuentes.fuente` | `CHECK` + `FUENTE_META` | un sistema clínico nuevo necesita su parser de nombres |
| `pacientes.estado` | `CHECK` + META | el tablero cuenta `activo` aparte; un valor nuevo no se contaría solo |

**Motivo:** el repo ya lo pagó dos veces, y las dos costaron una migración. La matriz
rol→módulos vivía hardcodeada en TypeScript hasta que hubo que crear un rol para un contrato
nuevo; las marcas del grupo eran una constante `MARCAS` hasta que `empresas` tuvo que existir
para poder dar de baja una sin borrarle el color a sus actividades históricas. En los dos casos
el valor **no era código**: parecía código porque estaba escrito en un archivo `.ts`.

Un `CHECK` inline es esa misma constante escrita en SQL, y encima protegida por una migración:
para agregar `Oscar Health` a la lista de seguros hay que escribir un
`ALTER TABLE … DROP CONSTRAINT`, aplicarlo en local, pushearlo a dev y después a prod — con
backup y precheck, según la regla de acá arriba. Todo eso por el nombre de una aseguradora.
