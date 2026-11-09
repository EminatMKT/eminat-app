# ANNIE Sales QA bridge retirement audit

Baseline: Production/main `1b7c05b8d98dfdbf295c33a3404535b5e7abb9a2`, audited 2026-10-25. This PR prepares code retirement only. It does not merge, deploy, change environment settings, or activate the domain redirect.

## Current reference classification

The companion `annie-sales-qa-reference-inventory.csv` classifies every tracked reference to the requested settings, hostname, integration paths, and bridge imports against that exact baseline. Entries are file/line/reference metadata; no secret values or user identities are included.

| Reference | Classification at baseline | Actual use |
| --- | --- | --- |
| `ANNIE_SALES_QA_ENABLED` | ACTIVE_RUNTIME | Middleware currently blocks `/sales` when this setting is not true, even after native Sales becomes primary. The same setting also gates legacy-only QA endpoints. Disabling the environment flag alone is therefore unsafe before code retirement. |
| `ANNIE_SALES_QA_ALLOWLIST_JSON` | LEGACY_QA_ONLY | Exact user/Auth-ID gate in the old adapter and its access endpoint; bypassed by the native primary route. Its value is sensitive and was not retrieved. |
| `ANNIE_SALES_API_ORIGIN` | LEGACY_QA_ONLY | Outbound origin used only by the old adapter. The configured Production hostname is the legacy ANNIE domain. |
| `ANNIE_SALES_SESSION_TOKENS_JSON` | LEGACY_QA_ONLY | Old adapter session credential lookup; no native consumer. Values were not read. |
| `ANNIE_SALES_QA_WRITE_ENABLED` | LEGACY_QA_ONLY | Old Lead QA mutations and write-capability response. |
| `ANNIE_SALES_QA_CONTACT_WRITE_ENABLED` | LEGACY_QA_ONLY | Old Contact QA mutations and write-capability response. |
| `ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED` | LEGACY_QA_ONLY | Old Account QA mutations and write-capability response. |
| `ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED` | LEGACY_QA_ONLY | Old Opportunity QA mutations and write-capability response. |
| `ANNIE_SALES_TRUST_KEY` | SAFE_TO_REMOVE | Present in Production environment metadata, with no LILLY runtime source consumer. No value was read. |
| `/api/integrations/annie/sales/*`, `src/server/integrations/annie` | LEGACY_QA_ONLY | Still registered/callable old QA endpoints at baseline. Native Sales does not dispatch to these endpoints. |
| `src/features/annie-sales/useSalesQaAccess.ts` | ACTIVE_RUNTIME / LEGACY_QA_ONLY by function | The basic access hook is used by the shared shell and already selects native access during cutover. Its four write-access hooks belong exclusively to the old QA UI. The basic hook is retained under a neutral name; the write hooks are removed. |
| Legacy adapter unit tests / independence negative fixtures | TEST_ONLY | Old adapter tests leave with the removed implementation. Native independence and QBO rejection tests remain. |
| Historical rollout documentation | DOC_ONLY | Historical instructions remain as provenance; they are not instructions for the retired release. |

Production environment **names** still present (no values are recorded):

- `ANNIE_SALES_API_ORIGIN`
- `ANNIE_SALES_QA_ACCOUNT_WRITE_ENABLED`
- `ANNIE_SALES_QA_ALLOWLIST_JSON`
- `ANNIE_SALES_QA_CONTACT_WRITE_ENABLED`
- `ANNIE_SALES_QA_ENABLED`
- `ANNIE_SALES_QA_OPPORTUNITY_WRITE_ENABLED`
- `ANNIE_SALES_QA_WRITE_ENABLED`
- `ANNIE_SALES_SESSION_TOKENS_JSON`
- `ANNIE_SALES_TRUST_KEY`

The non-secret `ANNIE_SALES_QA_ENABLED` and `LILLY_NATIVE_SALES_PRIMARY` flags are both true in current Production configuration. Current Production `/sales` reaches `/sales-native`. The old API remains a runtime exposure, but it is not the native business implementation.

## Native business dependency evidence

Native runtime roots (`src/server/sales-native`, `src/app/api/sales-native`, `src/features/native-sales`, and `src/app/(app)/sales-native`) have no ANNIE environment reads, adapter imports, public origin, or legacy endpoint references. These production files are unchanged by this PR. The existing boundary test is retained and extended to the shared access hook, shell, `/sales`, access dispatcher, and middleware.

| Operation | Existing native implementation retained |
| --- | --- |
| Contacts, Leads, Opportunities | Native Sales API routes, actor/policy resolution, and LILLY Supabase queries; no legacy adapter dispatch. |
| Seller assignment / scope | Native actor/policy resolution, assignment helpers, and existing reassignment routes. No seller or module grants change. |
| Patient-originated leads | Existing Patient API and native `portal-leads` implementation. No Patient Portal changes. |
| QBO invoice flow | Existing `src/server/sales-native/quickbooks/automatic-invoice.ts` and native QuickBooks API routes. No provider calls or writes were triggered for this audit. |
| Agreement enforcement | Existing Patient API and enrollment/activation enforcement remain unchanged, with their existing tests. No agreements were accepted or modified. |
| Payment reconciliation | Existing native QuickBooks reconciliation/worker code and tests. No reconciliation, activation, invoice, payment, or renewal action was invoked. |

Read-only Production navigation confirmed the native `/sales-native` Dashboard and section surfaces for Contacts, Leads, Opportunities, Portal leads, Memberships, and Payments & Renewals. These are route/surface observations, not live invoice/reconciliation transaction tests. Some section reads remained in a loading state in the existing Chrome session; a normal page refresh restored the Dashboard. This audit does not claim successful completion of every live data read. Repeat those checks after a separately approved release; no native code changes are included for that observation. Local HTTP checks confirm 16 retired GET/POST requests return 404 and the native-disabled `/sales` entry returns a real 404. Targeted existing native Sales and Patient API unit tests plus new entry-route tests pass locally (42 files, 172 tests at the initial targeted run; an additional native-disabled middleware case was added afterward).

The active Patient Portal Nginx upstream is the LILLY-backed container on port 3321, whose data mode is `lilly` and API hostname is `app.stratixsolutions.us`. An old ANNIE-backed container remains retained outside the public route; no container or portal config is changed. Native QBO callback/provider configuration uses LILLY, not the legacy ANNIE origin.

Remaining ANNIE names in native import compatibility markers (for example spreadsheet formula-cell rejection) are data-format compatibility, not network, environment, or runtime service dependencies. Those markers and all historical schema/mapping migrations and checks are intentionally unchanged.

## Cleanup behavior

- Remove only the old ANNIE Sales adapter, its QA UI, endpoints, and implementation-specific tests.
- Keep the shared access-hook behavior and denial presentation; move them out of the retired feature directory without changing native access decisions.
- Keep `/sales` redirecting to `/sales-native` when native Sales is primary. When native primary is disabled, fail closed instead of falling back to ANNIE.
- Keep `/api/sales/access` delegating to the unchanged native access handler when native primary is enabled. Otherwise return a no-store denial with 404; never revive the old bridge.
- Replace only the obsolete ANNIE QA middleware check with the existing native-primary decision. This preserves a real pre-streaming 404 when native Sales is disabled, without consulting any ANNIE setting. The session-cookie/login middleware logic is byte-identical.
- Retain and extend independence tests so a legacy origin, route, import, or environment read cannot return to the active entry paths.

## Controlled release and later redirect gates

1. Review this PR and its complete diff; require CI success. No automatic deployment is part of this task.
2. Approve/merge and release the cleanup separately. Confirm native Sales, access denials, seller scope, Patient API, and read-only payment surfaces remain healthy.
3. Retire the nine obsolete Production environment entries in a separately authorized configuration change, after the cleanup is deployed. Values are not needed for removal. Do not disable only `ANNIE_SALES_QA_ENABLED` on the old release because the old middleware still consumes it. Retain rollback capability until the release is verified.
4. Confirm the legacy routes are no longer deployed/callable and no external consumer remains; repeat the ANNIE dependency check before enabling the redirect.
5. The ANNIE redirect stays inactive. Its existing Nginx configuration and rollback copy remain untouched. A later redirect change must preserve the existing HTTP ACME certificate-renewal validation path and TLS certificate.

No native Sales behavior, QBO, Patient Portal, Medical, authentication behavior, database schema/migration, production setting, Docker service, Nginx configuration, or domain is changed by this PR.
