# API layers: thin routes, server use cases

**Date:** 2026-10-02 · **Status:** proposed, pilot on `create-user` · **Owner:** Wagner

## Problem

`src/app/api` has three styles at once:

- **Admin routes** are 100–200-line `route.ts` files that do everything: session check, body
  parsing, Supabase calls, rollbacks, error text, even the welcome email HTML (`create-user`, 199
  code lines).
- **Meet** is already layered (contracts, auth, service, responses, errors), but lives in
  `integrations/meet/_shared/` inside `app/`, and its `task-service.ts` is one 260-line file.
- **Small helpers** sprout next to routes (`delete-user/_shared/task-counts`,
  `roles/_shared/role-failure`) with no common home.

The same logic is copied between routes — the "try `auth_id`, then `id`" Auth-account loop
exists in `delete-user`, `reassign-and-delete` and `reset-password` — and nothing stops server
code that holds `service_role` from being imported by a browser module.

## Decision

Routes are transport only. Everything else is server code under `src/server/`, one folder per
use case, each file with one default export.

```
src/app/api/…/route.ts        export const POST = createUserHandler     (verbs only)
src/server/
  http/                        the shared kit, written once
    respond/                   result → NextResponse (status + catalog message)
    parse/                     body → zod contract, or 400
    guard/                     requireAdmin / requireModule / Meet actor, one shape
  <domain>/<action>/           one use case
    contract.ts                zod schema + input type
    handler.ts                 guard → parse → service → respond   (the "controller")
    service.ts                 business rules
    *.test.ts
  <domain>/repo/               service_role data access only
src/shared/errors/             catalogs: error key → message (status lives in respond)
```

### Layer rules

| Layer | May use | Must not use |
|---|---|---|
| `route.ts` | its handler | logic, Supabase, NextResponse |
| handler | http kit, contract, service | tables, SQL, Supabase |
| service | repos, other services, error keys | `Request`, `NextResponse`, status codes |
| repo | Supabase client, `TABLES` / `TABLE_COLUMNS` / `RPCS` | business rules |

A service returns `{ ok, data?, error? }` where `error` is a catalog key. Only `respond` turns a
key into an HTTP status and a message, so a status code appears in one place per error.

### Decisions taken by default (open to change)

1. **`src/server/`, not `src/features/<mod>/server/`.** One top-level folder makes "server code
   never reaches the browser" checkable: a Centinela rule can forbid importing `@/server` from any
   client module. `import 'server-only'` would make it a build error, but needs the `server-only`
   package added — a dependency change, deferred until approved.
2. **URLs stay as they are** during the migration. Resource-style URLs
   (`POST /api/admin/users`, `PATCH|DELETE /api/admin/users/[id]`) are a separate, later change
   because they also move client calls.
3. **Flat result `{ ok, data?, error? }`**, not a discriminated union: the repo compiles with
   `strict: false`, where union narrowing does not work (see the note in `requireAdmin`). Turning
   on `strictNullChecks` is its own project.

## Pilot: `POST /api/admin/create-user`

Today's route does, in order: admin guard → field and password checks → link-or-insert decision
(an existing `usuarios` row without Auth is linked, not duplicated) → create the Auth user →
insert or link the row (rolling the Auth user back on failure) → sync cargos (skipped when linking
with an empty list) → read the role label → send the welcome email (best effort, production only)
→ 201 with `{ user, emailWarning }`.

Target:

```
src/app/api/admin/create-user/route.ts      export const POST = createUserHandler
src/server/http/{respond,parse,guard}/
src/server/admin/users/create/
  contract.ts    zod: email, password ≥ 8, nombre, apellido, optional catalogs and cargoIds
  handler.ts     guard(admin) → parse(contract) → createUser → respond
  service.ts     the flow above, returning { ok, data, error }
src/server/admin/users/repo/                row lookup, insert, link
src/server/mail/welcome/                    HTML builder + Resend send
```

**Behavior must not change**: same statuses (400, 409, 201, 500), same response body, same
English messages from `ADMIN_ERRORS`, same rollback and link semantics. The pilot is accepted when
the route file is a single export, typecheck and the full unit suite pass, and the `e2e/roles.spec.ts`
user-creation test still passes.

## Migration order

1. `http/` kit + pilot (`create-user`).
2. A Centinela rule: `route.ts` exports only HTTP verbs and imports only from `@/server`.
3. The other admin routes; the shared Auth-account service replaces the three copies.
4. `mail/send`.
5. Meet: move `integrations/meet/_shared/*` into `src/server/meet/`, splitting `task-service.ts`.
6. Optional: resource-style URLs.

One endpoint per commit; each leaves the app working.
