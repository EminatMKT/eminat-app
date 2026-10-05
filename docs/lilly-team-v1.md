# LILLY Team V1

Team is an operational view of existing LILLY identities, not another directory or user store.

## Data model

- Organizational team: `usuarios.equipo_id → equipos.departamento_id → departamentos`. The existing `cargos` relationship supplies optional organizational role text. `empresas` remains the brand catalogue.
- Project team: `project_members(project_id, user_id, project_role)`. `Project Lead`, `Member`, and `Reviewer` describe participation; they grant no additional database permissions. Existing admin and project RLS rules remain authoritative.
- Work: `actividades.responsable_id` is still the sole primary assignee. `actividades.project_id` links a task to a project.

The Team page only shows coworkers in projects visible to a worker, plus the worker. An admin sees active people assignable in Tasks. Workers see project names and roles only through Projects RLS. Their profile task list requests their own assignments or another member's assignments within visible projects. Team never renders hours, days, rankings, or historical productivity. Admin workload comes from `lilly_team_workload()`, which checks the caller in Postgres and returns only pending and in-progress counts.

## Multi-assignee follow-up

Keep `actividades.responsable_id` as the primary owner. A later phase can add an `activity_collaborators(activity_id, user_id)` join table, with a unique composite key and RLS tied to the activity and project. Assignment notifications, task filters, and workload counting must then explicitly distinguish primary responsibility from collaboration so one task is not counted twice. No collaborator table or migration is included in Team V1.
