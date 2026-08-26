# Base de datos

## `supabase db reset` está prohibido en este repo
<!-- check: block
     comando: supabase\s+db\s+reset
     version: 1
     test: falla @<bash> :: pnpm supabase db reset
     test: falla @<bash> :: npx supabase db reset --linked
     test: pasa @<bash> :: pnpm supabase migration up
     test: pasa @<bash> :: git commit -m "reset del formulario"
-->

Para aplicar migraciones en local se usa `pnpm supabase migration up`. Nunca `db reset`.

⚠️ Esta regla estuvo marcada `sin check: prohibición de un comando operativo` hasta el
25/08/2026, y era falso: el centinela intercepta Bash desde antes. La exención dejaba sin
protección justo a la regla que evita un borrado sin vuelta.

**Motivo:** `supabase/config.toml` apunta `sql_paths` a un `seed.sql` que **no existe**. Un reset
borra las actividades de la base local y no hay seed que las devuelva. No es un reset, es un
borrado sin vuelta: los datos de prueba de este repo se cargan por la UI (ver abajo), así que no
están en ningún `.sql` esperando para restaurarse.

Si la CLI sugiere `migration repair` o `db pull` porque el historial local está desalineado con
una rama sin mergear: **tampoco**. Reescriben el historial de esa rama. El workaround es aplicar
el `.sql` por psql, que es idempotente.

## Antes de un `db push` a dev o a prod: backup y precheck, en ese orden
<!-- sin check: secuencia operativa de despliegue, ocurre fuera del diff -->

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
<!-- check: block
     pattern: (?i)INSERT\s+INTO\s+"?(public"?\.)?"?(actividades|usuarios|pacientes|research_leads|notificaciones|solicitudes|paciente_contactos|paciente_fuentes)"?\b
     paths: supabase/migrations/
     files: .sql
     version: 1
     test: falla @supabase/migrations/20260825000000_x.sql :: INSERT INTO public.actividades (titulo) VALUES ('prueba');
     test: falla @supabase/migrations/20260825000000_x.sql :: insert into "public"."usuarios" (email) values ('a@b.c');
     test: pasa @supabase/migrations/20260825000000_x.sql :: INSERT INTO public.roles (key, label) VALUES ('admin', 'Admin');
     test: pasa @supabase/migrations/20260825000000_x.sql :: INSERT INTO public.empresas (codigo) VALUES ('EMC');
-->

El check no mira si hay `INSERT`, mira **en qué tabla**: un catálogo —roles, empresas, cargos,
jornadas— se siembra por migración y está bien, porque es estructura y no dato de trabajo. Lo
que no puede entrar por SQL son las tablas donde la gente trabaja: actividades, usuarios,
pacientes, leads. La lista vive en el `pattern` de la regla, no en el motor.


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

## El enum no se escribe en la línea de la columna: va a un `DOMAIN` con nombre

```sql
-- ❌ la lista de valores tapa la definición de la columna
genero  text CHECK (genero IN ('M','F','NB','ND')),
estado  text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','inactivo','alta')),

-- ✅ el dominio se declara una vez, con nombre, y la columna dice qué es
CREATE DOMAIN public.genero AS text
  CHECK (VALUE IN ('M','F','NB','ND'));
CREATE DOMAIN public.estado_paciente AS text
  CHECK (VALUE IN ('activo','inactivo','alta'));

genero  public.genero,
estado  public.estado_paciente NOT NULL DEFAULT 'activo',
```

El `DOMAIN` va **arriba de la tabla, en la misma migración**, y se nombra por lo que
representa (`estado_paciente`), no por dónde se usa (`pacientes_estado`): el nombre tiene que
seguir sirviendo cuando lo use una segunda tabla.

Sigue valiendo la regla de que el valor canónico **no** es la etiqueta (ver `codigo.md`): el
`DOMAIN` fija qué se puede guardar, y el objeto META de TypeScript le pone el `labelKey` y el
color a cada valor. Son las dos mitades del mismo catálogo y tienen que listar lo mismo.

**Motivo:** una columna se lee para saber **qué es**, y con el `CHECK` inline la línea dedica
más caracteres a la lista que al tipo — con seis valores no entra en el ancho de la pantalla y
la definición de la tabla deja de poder leerse de un vistazo. Es la misma razón por la que el
atributo `style` está prohibido en el JSX: el detalle tapa la estructura.

<!-- check: block
     detector: check_inline_enum
     paths: supabase/
     files: .sql
     version: 1
     test: falla @supabase/migrations/20260825000000_x.sql :: genero  text CHECK (genero IN ('M','F','NB','ND')),
     test: pasa @supabase/migrations/20260825000000_x.sql :: CREATE DOMAIN public.genero AS text CHECK (VALUE IN ('M','F','NB','ND'));
     test: pasa @supabase/migrations/20260825000000_x.sql :: ALTER TABLE pacientes ADD CONSTRAINT ok CHECK (edad >= 0)
-->

Y hay dos motivos mecánicos que el inline no da:

- **Un `CHECK` inline es anónimo.** Postgres le inventa un nombre (`pacientes_genero_check`,
  y con suerte ese) y para cambiar el dominio hay que ir a buscarlo a `pg_constraint` antes de
  poder dropearlo. Un `DOMAIN` se altera por su nombre, que es el que uno eligió.
- **El inline se copia.** En cuanto una segunda tabla necesita el mismo dominio, la lista se
  escribe dos veces y a partir de ahí se desincronizan en silencio: agregar un valor en una y
  no en la otra no falla, simplemente rechaza filas en un lado y no en el otro.

## El slug del módulo va en una variable, y la migración aborta si no existe

Una policy de RLS no lleva el slug escrito adentro, y menos repetido por tabla. Se declara una
vez en un `DO` block, se verifica que exista, y las policies se generan:

```sql
DO $$
DECLARE
  slug   text   := 'medical';
  tablas text[] := ARRAY['pacientes','paciente_fuentes'];
  tbl    text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN
    RAISE EXCEPTION 'slug de módulo desconocido: %', slug;
  END IF;
  FOREACH tbl IN ARRAY tablas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "mod_access" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING (public.has_module(%L))', tbl, slug);
  END LOOP;
END $$;
```

`20260624210414_dynamic_roles.sql` ya generaba las policies desde un array —el patrón está
hecho, no hay que inventarlo—, pero **sin** el `RAISE`. Esa es la parte nueva.

**Motivo:** un slug mal escrito **no falla, se vuelve invisible** — y es invisible justo para
quien podría notarlo.

`role_modules.module_slug` es `text NOT NULL`, sin FK y sin tabla `modules` detrás: nada en la
base valida un slug. Y `has_module()` abre con `SELECT public.is_admin() OR …`, así que
`has_module('medial')` devuelve **`true` para el admin**. El admin es exactamente quien escribe
la migración y quien la prueba: ve la tabla andando perfecto mientras está muda para todo el
resto del equipo. No hay error en ninguna consola, ni fila rechazada, ni policy que falle.

Es la misma forma que el guard faltante de las rutas API —**no falla, funciona de más**— con la
diferencia de que acá funciona de más para una sola persona, y esa persona es la que revisa.

El `RAISE EXCEPTION` cuesta tres líneas y hace que la migración aborte **al aplicarse**, en vez
de dejar tablas silenciosas que alguien va a descubrir cuando un médico diga que no ve nada.

<!-- check: block
     requires: has_module
     absent: RAISE EXCEPTION
     paths: supabase/migrations/
     files: .sql
     version: 1
     test: falla @supabase/migrations/20260825000000_x.sql :: EXECUTE format('CREATE POLICY "mod_access" ON public.%I USING (public.has_module(%L))', tbl, slug);
     test: pasa @supabase/migrations/20260825000000_x.sql :: IF NOT EXISTS (SELECT 1 FROM public.role_modules WHERE module_slug = slug) THEN RAISE EXCEPTION 'slug desconocido'; END IF;
-->

El arreglo de fondo es un catálogo `modules` con FK desde `role_modules.module_slug`. Mientras
no exista, esta regla es lo que hay: está anotado en `.todo/TODO.md`.
