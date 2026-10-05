-- READ ONLY. Run with an administrator connection in Preview, export for human
-- review, and assign scopes in Admin. This query never inserts grants.
WITH task_evidence AS (
  SELECT ar.usuario_id,
    array_agg(DISTINCT a.empresa ORDER BY a.empresa)
      FILTER (WHERE a.empresa IS NOT NULL) AS task_companies
  FROM public.actividad_responsables ar
  JOIN public.actividades a ON a.id = ar.actividad_id
  GROUP BY ar.usuario_id
), candidates AS (
  SELECT u.id, u.nombre_display AS usuario, u.rol,
    e.codigo AS affiliation, coalesce(t.task_companies, ARRAY[]::text[]) AS task_companies,
    CASE u.rol
      WHEN 'admin' THEN ARRAY[]::text[]
      WHEN 'stratix360' THEN ARRAY['S']::text[]
      WHEN 'finanzas' THEN ARRAY['EMINAT']::text[]
      WHEN 'contabilidad_rrhh' THEN ARRAY['EMINAT']::text[]
      WHEN 'medico' THEN ARRAY['EMC']::text[]
      WHEN 'investigacion' THEN ARRAY['ERG']::text[]
      WHEN 'medico_investigacion' THEN ARRAY['EMC','ERG']::text[]
      ELSE ARRAY[]::text[]
    END AS role_candidate
  FROM public.usuarios u
  LEFT JOIN public.empresas e ON e.id = u.empresa_id
  LEFT JOIN task_evidence t ON t.usuario_id = u.id
  WHERE u.activo
)
SELECT c.id AS usuario_id, c.usuario, c.rol, c.role_candidate AS scope_sugerido,
  c.affiliation AS empresa_de_pertenencia,
  c.task_companies AS empresas_en_tareas_historicas,
  ARRAY(SELECT x.empresa_codigo FROM public.usuario_empresas_acceso x
    WHERE x.usuario_id = c.id ORDER BY x.empresa_codigo) AS scopes_asignados,
  CASE
    WHEN c.rol = 'admin' THEN 'global por rol; no requiere asignación'
    WHEN c.role_candidate = ARRAY[]::text[] THEN 'sin candidato por rol'
    WHEN c.affiliation IS NOT NULL AND NOT
      (CASE WHEN c.affiliation = 'STRATIX' THEN 'S' ELSE c.affiliation END) = ANY(c.role_candidate)
      THEN 'rol y pertenencia difieren; revisar'
    WHEN EXISTS (SELECT 1 FROM unnest(c.task_companies) AS code
      WHERE NOT code = ANY(c.role_candidate))
      THEN 'trabajo histórico fuera del candidato; revisar'
    ELSE 'rol, pertenencia y tareas sin contradicción conocida'
  END AS evidencia,
  CASE
    WHEN c.rol = 'admin' THEN 'no aplica'
    WHEN c.role_candidate = ARRAY[]::text[] THEN 'sin scope'
    WHEN c.affiliation IS NOT NULL AND NOT
      (CASE WHEN c.affiliation = 'STRATIX' THEN 'S' ELSE c.affiliation END) = ANY(c.role_candidate)
      THEN 'ambigua'
    WHEN EXISTS (SELECT 1 FROM unnest(c.task_companies) AS code
      WHERE NOT code = ANY(c.role_candidate)) THEN 'ambigua'
    WHEN c.affiliation IS NULL AND cardinality(c.task_companies) = 0 THEN 'media'
    ELSE 'alta'
  END AS confianza
FROM candidates c
ORDER BY confianza, usuario;
