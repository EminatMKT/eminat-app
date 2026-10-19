# ANNIE Sales absorption parity

ANNIE remains the commercial source of truth. This matrix distinguishes verified
Production behavior from capabilities that still need browser acceptance. ANNIE
`959be75ded593f296001d9833b104b3a40d0d22d` and LILLY
`9e39e7fc73b3305d2b0799005e948a3075169050` are deployed. Draft PRs #30
and #119 remain open. A visible control or passing unit test alone does not count
as Production parity.

| Area | Weight | Production verified | Staged branch | Remaining acceptance |
| --- | ---: | --- | --- | --- |
| Auth and session | 6% | Mapped SUPERADMIN reads all ten Sales sections without a second ANNIE login | Short-lived server assertion, role and tenant checks | Expiry, revocation and mapped non-admin role browser QA |
| Roles and permissions | 10% | SUPERADMIN read and synthetic write paths | ANNIE canonical role capabilities; LILLY gated write modes; Finance aggregate-only payment summary with commercial routes denied | Admin, manager, seller, finance and auditor live matrix |
| Leads | 15% | List/filter, synthetic create, stage transition, refresh persistence and ANNIE history | Edit, archive, convert, import, email and interaction controls | Assignment, full lifecycle, import and email browser QA; normal writes remain off |
| Contacts and Accounts | 8% | Lists/details, synthetic Account and linked Contact creation, canonical timelines | Edit, archive, links and history | Conversion, duplicates and relation regression in browser |
| Opportunities and Pipeline | 15% | Lists, seven stages, linked synthetic Opportunity creation and Proposal transition with history | Edit, archive and drag/drop with rejection rollback | Won/Lost and persisted drag/drop browser QA |
| Activities and follow-up | 10% | Task/meeting lists and canonical timeline on selected commercial records | Isolated task, meeting and interaction writes; email history | Synthetic write, follow-up, relation and normal-user browser QA |
| Memberships and PDF | 15% | Eight demo records, catalog, two-month advance month-to-month pricing, selected membership detail and ANNIE-generated PDF download of demo `1725-0007`; regenerated PDF omits phone/address and includes EMC program statement | Guarded synthetic enrollment, recorded-payment issuance and staff Family request/approval | Controlled creation, normal-user issuance and Family approval browser QA; no non-demo paid Family membership exists |
| Reports | 10% | ANNIE metrics and seller breakdown load; Won 9/Lost 1 agrees with stage breakdown | Guarded schedule settings | Role-scoped comparison, delivery status and schedule QA |
| Social | 8% | ANNIE provider view loads with Meta/Webhooks disabled | Connection, message, comment and Social Lead views | Meta live authorization remains externally blocked; reply and attribution QA |
| Navigation and UX | 3% | Ten Sales sections, readable owner/team names and loading states; all nine requested Sales screens rendered at iPhone SE width without page overflow; mobile Pipeline swipe cue live | Responsive UI implementation | Write forms and broader accessibility browser pass |

Last verified Production parity is approximately **52%**, counting partial areas
only to the extent exercised against ANNIE. On October 18, controlled QA writes
created one synthetic Lead, Account, Contact and Opportunity through LILLY;
the Contact linked to the Account, the Opportunity linked to both, and Lead and
Opportunity transitions persisted with ANNIE history. The four exact-allowlist
QA write switches were restored to `false` and Production redeployed from the
same LILLY source commit. The live UI again showed read-only access with no
create controls. Commercial writes, membership issuance, report schedules and
broad email remain off. QuickBooks Production, Stripe and real payments remain
outside this release.

Mobile read-only QA used Chrome iPhone SE emulation at 375 x 667. Dashboard,
Leads, Contacts, Accounts, Opportunities, Pipeline, Activities, Memberships
and Reports rendered without document-level horizontal overflow. The Pipeline
board itself scrolls horizontally. Exact-commit CI passed for `9e39e7f`, and
Production now shows its swipe hint and keyboard focus. Write forms remain
unverified with the Production QA switches off.

The controlled demo membership `1725-0007` originally served a stored legacy
PDF containing phone/address fields. ANNIE staff regenerated only this demo
PDF through the normal action; ANNIE logged `membership.pdf.regenerated`.
LILLY then downloaded the new ANNIE PDF. The rendered file shows the correct
demo member, code, PLUS/INDIVIDUAL plan and modality, no phone or street
address, and the Eminat Medical Center program statement. Its `2M` period is
labelled as a historical term in the PDF, not offered as a new purchase option.
No real membership PDF was accessed or changed. A controlled Seller session
is still unavailable to this browser connection; live Seller scope and server
denial remain unverified.

Release gate: exact ANNIE and LILLY commits; CI; synthetic workflow QA; mapped
role checks; browser desktop/mobile checks; backup and rollback; guarded deploy;
Production health and data integrity checks. Do not promote an incomplete
vertical slice or mark a row complete because a screen exists.

Confirmed owner rule: one recorded SalesPayment may fund one primary
membership. Family dependants may share that primary payment reference.
ANNIE's staged issuance path rejects a second primary for the same payment,
including concurrent requests. LILLY's synthetic-only enrollment path does
not accept a SalesPayment ID. The separate recorded-payment path remains
disabled unless `ANNIE_SALES_COMMERCIAL_MEMBERSHIP_WRITE_ENABLED=true`.
After-issuance Family requests remain disabled unless
`ANNIE_SALES_FAMILY_WRITE_ENABLED=true`; ANNIE requires an existing Contact,
an active paid primary Family membership, capacity below three, and explicit
authorized staff review. Approval creates a zero-charge dependant credential,
period, PDF and household relation. Both paths need controlled end-to-end
browser QA before a Production release.
