# ANNIE Sales absorption parity

ANNIE remains the commercial source of truth. This matrix distinguishes the last
verified Production behavior from work staged in draft PRs #30 (ANNIE) and #119
(LILLY). A staged UI or passing unit test does not count as Production parity.

| Area | Weight | Production verified | Staged branch | Remaining acceptance |
| --- | ---: | --- | --- | --- |
| Auth and session | 6% | Mapped SUPERADMIN can read seven core sections without an ANNIE login | Short-lived server assertion, role and tenant checks | Expiry, revocation and mapped non-admin role browser QA |
| Roles and permissions | 10% | SUPERADMIN read path | ANNIE canonical role capabilities; LILLY gated write modes; Finance aggregate-only payment summary with commercial routes denied | Admin, manager, seller, finance and auditor live matrix |
| Leads | 15% | List and filters | Create, edit, transition, archive, convert, history, import UI, email, interactions | Controlled full lifecycle, assignment and import browser QA; normal writes enabled only after release gate |
| Contacts and Accounts | 8% | Lists and details | Isolated writes, links and history | Conversion, duplicates and relation regression in browser |
| Opportunities and Pipeline | 15% | Lists and seven stages | Isolated writes, transitions and drag/drop with rejection rollback | Won/Lost and persisted drag/drop browser QA |
| Activities and follow-up | 10% | Task list | Isolated task and interaction writes; email history; meeting follow-up task type; scoped ANNIE meeting list and guarded synthetic meeting creation/status updates with optional Lead/Contact/Opportunity links; read-only canonical timeline for selected Leads, Contacts, Accounts and Opportunities | Timeline and relation browser QA, normal-user QA |
| Memberships and PDF | 15% | None in LILLY Production | ANNIE catalog/pricing, family detail, PDF, guarded synthetic enrollment and default-off recorded-payment issuance from Won Opportunity | Controlled create/PDF QA, normal-user issuance browser QA, family add/relationship support in ANNIE. Owner rule: adding a dependant to an existing paid Family membership stays pending until staff approval and has no extra charge. |
| Reports | 10% | None in LILLY Production | ANNIE metrics, seller breakdown and guarded schedule settings | Role-scoped browser comparison, delivery status and safe schedule QA |
| Social | 8% | None in LILLY Production | ANNIE providers, connections, messages, comments and Social Leads | Meta live authorization remains externally blocked; reply and attribution QA |
| Navigation and UX | 3% | Core tabs | Memberships, Reports, Social and readable history labels | Mobile and accessibility browser pass |

Last verified Production parity remains approximately **21%**. Staged changes are
not included in this number. All new commercial write switches, membership QA,
report schedule updates and broad email are disabled by default. QuickBooks
Production, Stripe, real payments and Patient Portal are outside this release.

Release gate: exact ANNIE and LILLY commits; CI; synthetic workflow QA; mapped
role checks; browser desktop/mobile checks; backup and rollback; guarded deploy;
Production health and data integrity checks. Do not promote an incomplete
vertical slice or mark a row complete because a screen exists.

Confirmed owner rule: one recorded SalesPayment may fund one primary
membership. Family dependants may share that primary payment reference.
ANNIE's staged issuance path rejects a second primary for the same payment,
including concurrent requests. LILLY's synthetic-only enrollment path does
not accept a SalesPayment ID. The separate recorded-payment path remains
disabled unless `ANNIE_SALES_COMMERCIAL_MEMBERSHIP_WRITE_ENABLED=true` and
still needs controlled end-to-end browser QA before a Production release.
