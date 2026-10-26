# Validation evidence

## Portal

- New loopback-only renewal browser rehearsal: 5/5 pass (English desktop, Spanish mobile, v5 reuse/reacceptance, pending versus reconciled period, one invoice on retry, cancellation, early renewal). No external requests or real provider operations.
- Unit suite: 112/112 pass.
- TypeScript and lint for all changed renewal files: pass.
- Optimized production build and synthetic-fixture/official-Agreement bundle check: pass.
- Manual visual review in the existing Chrome profile: Spanish and English renewal screens show the unchanged current period, correct Family monthly quote, v5 reuse and no premature renewed period. Test identity/code explicitly identify LOCAL QA.

The existing Portal browser suite is 7/9 on BOTH the untouched baseline `1b91d09a796562dd81e1d9a730f1392d505272a2` and the renewal branch, with the same failures:

1. `keeps synthetic family and payment flows local` expects an `Agregar familiar` link not displayed by the existing full-household fixture.
2. `fits every patient page in a narrow mobile viewport` finds the existing `/perfil` page 431px wide at a 320px viewport.

Neither failing surface is changed in this release. The tests are not skipped, weakened or modified to conceal those existing findings. Renewal-specific mobile behavior passes independently. Existing unrelated Portal lint findings are also retained, with changed-file lint required to pass.

## LILLY

The initial audit correction CI passed in full. The complete renewal database transaction now passes in isolated CI, including Individual/Family, active/expired, pending/retry, consent, duplicate invoice/payment-period prevention, supported cancellation/void and identity/owner preservation. Final-head full CI and protected hosted Preview must still pass before readiness/merge/deployment; this document is not a release approval.

No Production business record has been manually changed. No invoice or payment has been created in Production during verification.
