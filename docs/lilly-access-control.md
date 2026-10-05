# LILLY Access Control — audit and rollout

## Architecture

`actividades.empresa` and `projects.company_code` reference `empresas.codigo`.
This is the operational company/brand scope. `usuarios.empresa_id` is a person's
organizational affiliation and does **not** grant access. `equipos` and
`departamentos` describe internal organization; they are not the V1 security
axis. In the current catalog, `S` is the Stratix task brand, while `STRATIX`
is the affiliation entry with `recibe_actividades = false`.

`usuario_empresas_acceso(usuario_id, empresa_codigo)` grants multiple company
scopes per user. The `admin` role, when active, has global access without rows
in this table. A `project_members` row also grants access to that **one**
Project and its linked Tasks; it never grants the Project's whole company.
Workers with configured scopes can edit Tasks only in their company grants, not
through membership alone. Assignment creation for a configured recipient
requires the company grant or specific Project membership. Users without scopes
temporarily keep legacy behavior until the final global switch is activated.

## Audit

Read-only Production audit on 2026-10-05 found 43 active users. No historical
permission inference or per-user backfill is required for this rollout. Admin
will assign scopes explicitly as users are configured. The earlier read-only
matrix remains available as optional background and writes no grants.

The same audit found 9 Tasks with a null company, 0 Projects without a valid
company, and 0 task/Project company mismatches. The 9 Tasks retain legacy read
visibility, including for configured users, until they are classified. They
are not reassigned automatically. The final global switch requires their
classification and blocks new company-less Tasks after activation.

Current broad reads: `actividades` is gated by module rather than company;
`usuarios`, `empresas`, `equipos`, `departamentos`, `cargos`, and
`usuario_cargos` are visible to all staff. `v_kpis_globales` runs as its owner
and exposes global aggregates to authenticated callers despite Task RLS; this
branch revokes that grant. `v_produccion_responsable` exposes hours and is
likewise revoked for authenticated callers.

Security-definer review: `can_access_project` is a boolean identity-bound
helper and now includes company grants; `lilly_team_workload` and
`lilly_task_metrics` reject non-admin callers; `claim_task_assignment_emails`
is service-role-only; `admin_reassign_and_delete` is service-role-only;
`create_meet_activity_for_topic`, `update_meet_activity`, and
`set_actividad_responsables` are invoker functions, so they retain RLS.
Task audit/notification triggers write privileged records but do not expose
Task rows. The legacy `v_kpis_globales` grant was the concrete bypass found.

The Calendar API and Report API use the caller's Supabase session, not
`service_role`; Production and Requests use the shared `actividades` query.
Admin user editing uses `service_role` behind `requireAdmin`; inactive admins
are now rejected there and by the database `is_admin()` helper. Team workload
remains admin-only. Client filter options derive from RLS-visible users,
companies, Projects, and Tasks.

Company grants do not grant a product module. The current `finanzas` and
`medico_investigacion` roles do not have the `tasks` module in the seeded role
matrix. The isolated E2E grants that module to its disposable fixture roles so
it can exercise company RLS. Giving those real roles Tasks/Calendar access is
a separate administrative role decision before expecting those screens to work
for Marco or medical/research users.

## Rollout

1. Apply the three additive access migrations in Preview. The final global
   switch remains `false`. An active user's first Admin-assigned scope makes
   company RLS effective for that user immediately. Multiple grants combine.
2. Users without explicit scopes keep the legacy visibility. Removing all a
   user's scopes returns them to that fallback while the switch is off. This
   transitional behavior must be understood when Admin removes a final scope.
   Company-less historical Tasks also keep legacy read visibility temporarily.
3. Validate configured and unconfigured user sessions in the connected App and
   Supabase Preview. No inferred grants are written.
4. Later, configure every active user, classify the 9 company-less Tasks, and
   review `lilly_access_preflight`. Only then call the service-role-only
   `activate_lilly_access_control()` for the final cutover. It checks coverage,
   Task/Project company validity, and linked-company consistency, then removes
   the fallback for users without scopes and company-less Tasks.
5. This PR prepares the progressive rollout for Production. It does not merge
   or activate the final global switch.

## Current limitations

The baseline on `main` already removed `actividades.responsable_id` in its
multi-responsable migration. The older email dispatcher still selects that
column, and the old assignment email trigger is dropped. This predates the
access-control branch and needs a separate notification repair before claiming
that assignment email delivery works end to end. Internal notifications created
by the current assignment flow remain subject to recipient and Task visibility.

The dedicated Supabase branch `lilly-access-control-preview` was created on
2026-10-05. Supabase initialized it at migration `20261002171906`, behind
Production's `20261005033135`, so the six missing baseline migrations and the
two access migrations were applied there in order. Its migration history now
ends at `20261005100000`. It has zero users, Tasks, Projects and access grants;
the preflight returns zero for every finding and enforcement remains `false`.
That empty result does not validate the proposed Production grants. No
Production SQL was changed.

The Vercel Preview deployment is built from this feature branch, but the
project-wide Vercel Preview variables still point to the separate Supabase
`lilly-tasks-metrics-preview` branch. Do not treat the web deployment as an
end-to-end test of `lilly-access-control-preview` until the environments are
isolated and connected deliberately. CI runs the access isolation E2E with
real sessions against disposable local Supabase instead.
