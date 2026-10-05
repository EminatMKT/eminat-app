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
Workers can edit Tasks only in their company grants, not through membership
alone. Assignment creation requires the recipient to have the company grant or
specific Project membership after enforcement is enabled.

## Audit

Read-only Production audit on 2026-10-05 found 43 active users. A deliberately
conservative role/affiliation/history proposal classifies 7 as clear, 20 as
ambiguous, 15 without a role candidate, and 1 global admin. The query in
`supabase/checks/lilly-access-backfill.sql` produces the per-user matrix after
Phase A is installed; it writes no grants. Do not turn its suggestions into
automatic permissions. Marco Aurelio Torres has affiliation `EMINAT` and
historical Tasks in `EMC`, `EMINAT`, and `ERG`; the historical work does not
justify EMC/ERG access. Ariana Sig-Tú has affiliation `STRATIX` and work across
many task brands. Two active records share the display name Daniel Valderrama,
with different roles; distinguish them by user ID during review.

The same audit found 9 Tasks with a null company, 0 Projects without a valid
company, and 0 task/Project company mismatches. The 9 Tasks need explicit
classification before activation.

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

1. Apply the two new migrations **only to a dedicated Supabase Preview**.
   They create grants and policies with `lilly_access_control.enforced = false`.
   Existing staff visibility remains until activation.
2. Run the backfill matrix and `SELECT * FROM public.lilly_access_preflight`
   through an administrative connection. Review every ambiguous person and
   every active person without a candidate. Assign grants through Admin, not
   with inferred SQL. Classify the 9 company-less Tasks.
3. Confirm no active non-admin lacks a scope, no Task or Project lacks a valid
   company, and no Project-linked Task has a mismatched company. Review
   `assignments_without_access` separately: old assignments do not silently
   become grants and may cease to be visible to their former assignees.
4. Run isolation tests with real Preview sessions for admin, Finance, Stratix,
   EMC+ERG, and a cross-Project member, including direct REST requests,
   Calendar, Team, Report, filters, and notifications. Only then call
   `activate_lilly_access_control()` using the Preview service role. It refuses
   activation if structural checks fail. Repeat the isolation tests with
   enforcement enabled.
5. Production requires a separate approved backfill and activation decision.
   No migration or grant from this branch should be applied there now.

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
ends at `20261005090100`. It has zero users, Tasks, Projects and access grants;
the preflight returns zero for every finding and enforcement remains `false`.
That empty result does not validate the proposed Production grants. No
Production SQL was changed.

The Vercel Preview deployment is built from this feature branch, but the
project-wide Vercel Preview variables still point to the separate Supabase
`lilly-tasks-metrics-preview` branch. Do not treat the web deployment as an
end-to-end test of `lilly-access-control-preview` until the environments are
isolated and connected deliberately. CI runs the access isolation E2E with
real sessions against disposable local Supabase instead.
