-- VERIFICACIÓN de 20260831220806_actividades_fecha_inicio.sql — se corre DESPUÉS del `db push`.
--
-- SOLO LECTURA.
--
--   psql "$PROD_DB_URL" -f supabase/checks/verificar-fecha-inicio.sql
--
-- El guard que trae la migración ya comprobó lo suyo, pero comprueba con `<>`, que no ve los
-- NULL. Acá se repite lo mismo con `IS DISTINCT FROM`, que sí los ve: es la única forma de
-- enterarse si alguna fila quedó con el mes mal imputado. Lo demás es contrastar contra lo que
-- imprimió el precheck.

\echo '=== 1. La columna quedó como corresponde ==='
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'actividades'
   AND column_name  = 'fecha_inicio';

\echo ''
\echo '=== 2. Ninguna fila sin fecha (tiene que dar 0) ==='
SELECT count(*) AS sin_fecha_inicio
  FROM public.actividades
 WHERE fecha_inicio IS NULL;

\echo ''
\echo '=== 3. EL CHEQUEO QUE EL GUARD NO HACE: mes desviado, contando los NULL ==='
\echo '    Tiene que dar 0. El guard de la migración usa `<>` y por eso deja pasar la fila cuya'
\echo '    etiqueta de `mes` no estaba en la lista; `IS DISTINCT FROM` la agarra.'
SELECT count(*) AS desviadas
  FROM public.actividades
 WHERE mes IS NOT NULL
   AND EXTRACT(MONTH FROM fecha_inicio)::int IS DISTINCT FROM array_position(
         ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
         mes)::int;

\echo ''
\echo '=== 4. Mes por mes: `fecha_inicio` contra `mes`, que es el testigo ==='
\echo '    Las dos columnas de la derecha tienen que coincidir fila por fila.'
SELECT to_char(date_trunc('month', fecha_inicio), 'YYYY-MM') AS periodo,
       count(*)                                              AS por_fecha_inicio,
       count(*) FILTER (
         WHERE array_position(
                 ARRAY['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                       'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
                 mes)::int = EXTRACT(MONTH FROM fecha_inicio)::int)
                                                              AS coinciden_con_mes
  FROM public.actividades
 GROUP BY 1
 ORDER BY 1;

\echo ''
\echo '=== 5. Años: no puede quedar ninguno fuera de rango ==='
SELECT EXTRACT(YEAR FROM fecha_inicio)::int AS anio, count(*) AS filas
  FROM public.actividades
 GROUP BY 1
 ORDER BY 1;

\echo ''
\echo '=== 6. Los typos del Sheet quedaron corregidos (tiene que dar 0 y 0) ==='
SELECT count(*) FILTER (WHERE fecha_requerida IS NOT NULL
                          AND EXTRACT(YEAR FROM fecha_requerida) < 1900) AS requerida_typo,
       count(*) FILTER (WHERE fecha_entrega IS NOT NULL
                          AND EXTRACT(YEAR FROM fecha_entrega) < 1900)   AS entrega_typo
  FROM public.actividades;

\echo ''
\echo '=== 7. El total no cambió ==='
SELECT count(*) AS filas FROM public.actividades;
