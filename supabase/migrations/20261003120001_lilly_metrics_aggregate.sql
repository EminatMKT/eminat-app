-- Security-definer function only returns aggregates, never task rows or clinical data.
CREATE OR REPLACE FUNCTION public.lilly_task_metrics(
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_empresa text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL, p_team_id uuid DEFAULT NULL, p_department_id uuid DEFAULT NULL,
  p_estado text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Metrics requires admin' USING ERRCODE = '42501'; END IF;
  IF p_from IS NOT NULL AND p_to IS NOT NULL AND p_from > p_to THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;
  WITH base AS (
    SELECT a.id, a.estado, a.fecha_entrega, a.empresa, a.created_at, lead.responsable_id,
           u.nombre_display AS user_name, u.equipo_id,
           e.nombre AS team_name, e.departamento_id, d.nombre AS department_name
    FROM public.actividades a
    LEFT JOIN LATERAL (
      SELECT ar.usuario_id AS responsable_id FROM public.actividad_responsables ar
      WHERE ar.actividad_id = a.id ORDER BY ar.es_lider DESC, ar.usuario_id LIMIT 1
    ) lead ON true
    LEFT JOIN public.usuarios u ON u.id = lead.responsable_id
    LEFT JOIN public.equipos e ON e.id = u.equipo_id
    LEFT JOIN public.departamentos d ON d.id = e.departamento_id
    WHERE (p_from IS NULL OR a.created_at >= (p_from::timestamp AT TIME ZONE 'America/Guayaquil'))
      AND (p_to IS NULL OR a.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'America/Guayaquil'))
      AND (p_empresa IS NULL OR a.empresa = p_empresa)
      AND (p_user_id IS NULL OR EXISTS (
        SELECT 1 FROM public.actividad_responsables ar
        WHERE ar.actividad_id = a.id AND ar.usuario_id = p_user_id))
      AND (p_team_id IS NULL OR u.equipo_id = p_team_id)
      AND (p_department_id IS NULL OR e.departamento_id = p_department_id)
      AND (p_estado IS NULL OR a.estado = p_estado)
  ), bucket AS (
    SELECT *, (estado = 'Completado') AS completed,
      (estado NOT IN ('Completado', 'Cancelado')) AS pending,
      (estado NOT IN ('Completado', 'Cancelado') AND fecha_entrega < (now() AT TIME ZONE 'America/Guayaquil')::date) AS overdue
    FROM base
  ), totals AS (
    SELECT count(*) AS total, count(*) FILTER (WHERE completed) AS completed,
      count(*) FILTER (WHERE pending) AS pending, count(*) FILTER (WHERE overdue) AS overdue
    FROM bucket
  ), users AS (
    SELECT responsable_id AS id, coalesce(user_name, 'Sin responsable') AS name,
      count(*) AS total, count(*) FILTER (WHERE completed) AS completed,
      count(*) FILTER (WHERE pending) AS pending, count(*) FILTER (WHERE overdue) AS overdue
    FROM bucket GROUP BY responsable_id, user_name
  ), teams AS (
    SELECT equipo_id AS id, coalesce(team_name, 'Sin equipo') AS name,
      count(*) AS total, count(*) FILTER (WHERE completed) AS completed,
      count(*) FILTER (WHERE pending) AS pending, count(*) FILTER (WHERE overdue) AS overdue
    FROM bucket GROUP BY equipo_id, team_name
  ), departments AS (
    SELECT departamento_id AS id, coalesce(department_name, 'Sin departamento') AS name,
      count(*) AS total, count(*) FILTER (WHERE completed) AS completed,
      count(*) FILTER (WHERE pending) AS pending, count(*) FILTER (WHERE overdue) AS overdue
    FROM bucket GROUP BY departamento_id, department_name
  ), daily AS (
    SELECT (created_at AT TIME ZONE 'America/Guayaquil')::date AS day,
      count(*) AS total, count(*) FILTER (WHERE completed) AS completed
    FROM bucket GROUP BY (created_at AT TIME ZONE 'America/Guayaquil')::date
  ), companies AS (
    SELECT empresa AS id, coalesce(empresa, 'Sin empresa') AS name,
      count(*) AS total, count(*) FILTER (WHERE completed) AS completed,
      count(*) FILTER (WHERE pending) AS pending, count(*) FILTER (WHERE overdue) AS overdue
    FROM bucket GROUP BY empresa
  )
  SELECT jsonb_build_object(
    'overview', (SELECT to_jsonb(t) || jsonb_build_object('completionRate', CASE WHEN t.total = 0 THEN 0 ELSE round(100.0 * t.completed / t.total, 1) END) FROM totals t),
    'users', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.pending DESC, x.name), '[]'::jsonb) FROM users x),
    'teams', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.pending DESC, x.name), '[]'::jsonb) FROM teams x),
    'departments', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.pending DESC, x.name), '[]'::jsonb) FROM departments x),
    'companies', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.pending DESC, x.name), '[]'::jsonb) FROM companies x),
    'trend', (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.day), '[]'::jsonb) FROM daily x)
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.lilly_task_metrics(date,date,text,uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lilly_task_metrics(date,date,text,uuid,uuid,uuid,text) TO authenticated, service_role;
