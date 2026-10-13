# ANNIE Sales Phase B integration contract

Status: implementation prepared in code; no Production activation or identity mappings have been inserted. ANNIE remains the commercial source of truth. LILLY stores only reviewed identity/tenant links, never commercial records.

## Endpoint audit (ANNIE current main)

All paths are under `/api/v1`, use `GET`, require an ANNIE bearer session and `X-Organization-Id`, and pass through `AccessGuard`. The guard resolves an active Principal membership in an active Organization before applying the declared permission. CRM record reads also call `scope(actor, resource)`: Administrator/Superadmin/Auditor see their Organization; Operator sees owned/shared records; Sales Manager sees owned/team/shared records. FINANCE has no `commercial:read` capability.

| Path | Permission | Validation, pagination and filters | Response |
| --- | --- | --- | --- |
| `/{leads,contacts,accounts,opportunities}` | `commercial:read` | Zod `filters`, limit 1–100 (default 25), UUID cursor, `q`, resource-specific `status`/`stageCode`/`type`/`accountId`, owner/team, archive and follow-up; unknown keys rejected | `{data, nextCursor}` |
| `/{leads,contacts,accounts,opportunities}/:id` | `commercial:read` | UUID ID; scoped record lookup | `{data}` |
| `/pipeline` | `commercial:read` | Organization-scoped pipeline and ordered stages | `{data}` |
| `/:resource/:id/history` and `/pipeline/history` | `commercial:read` | Scoped parent, cursor/limit | `{data, nextCursor}` |
| `/:resource/:id/interactions` | `commercial:read` | Scoped parent | Interaction list |
| `/:resource/:id/task-requests` | `commercial:read` | Scoped parent | Task operations |
| `/sales-dashboard`, `/dashboard` | `commercial:read` | Organization and role scoped | Sales aggregates |
| `/integration/session/identity` (new, requires ANNIE API release) | `session:read` | Existing session and membership guard | Principal ID, Organization ID, role and `salesRead` capability |

CRM validation errors use `{code, details}` with HTTP 422. Authentication/permission failures use HTTP 401/403. The LILLY adapter returns only a stable error code and does not reflect upstream details.

## Explicit mapping activation

1. Discover tenant and Principal candidates read-only from both systems using immutable IDs and documented business evidence. Prepare a review table with LILLY `usuarios.id`, `auth_id`, `empresas.codigo`, ANNIE Principal ID and Organization ID. Do not join by email or create an inferred mapping.
2. A designated reviewer resolves each row and records `evidence_ref`, `approved_by`, and `approved_at`. Ambiguous candidates remain unmapped. Never alter ANNIE Principal, LILLY Auth ID, or merge accounts.
3. Insert reviewed tenant mappings before user mappings. `active` requires approval metadata. Database keys prevent conflicting user/Principal/Organization assignments. Mapping tables are hidden from browser roles and readable only by the LILLY service role.
4. Grant the LILLY `sales` module to approved roles in `role_modules`. Admin has the existing local module short-circuit. This local grant does not replace ANNIE authorization. FINANCE in ANNIE remains denied for Sales even if LILLY grants its module.
5. Deploy ANNIE `/integration/session/identity`, then configure server-only `ANNIE_SALES_API_ORIGIN` and secret-manager supplied `ANNIE_SALES_SESSION_TOKENS_JSON`. The JSON is a map from `principalId:organizationId` to that Principal's native ANNIE session token. Never use one shared token for multiple users. Never expose values through `NEXT_PUBLIC_`, logs, or the browser. Expired/revoked tokens fail closed.
6. Validate ADMIN, FINANCE, and seller controlled accounts in each tenant, including wrong Organization requests, direct detail ID guessing, cursor pagination, search/filter, and exact ANNIE IDs. Until these live tests pass, Phase B is pending.

The adapter calls ANNIE's new identity endpoint before every Sales read and checks Principal ID, Organization ID, and `salesRead`. It forwards only GET to fixed ANNIE API paths; query keys are allowlisted and ANNIE performs final validation and record authorization. No INSERT, PATCH, DELETE, synchronization, or commercial Supabase tables are provided.

## Rollback

Remove the LILLY `sales` module grants and unset the server-only ANNIE session configuration. ANNIE continues at its existing address. No redirect, shutdown, migration, or Production commercial data change is part of this branch.
