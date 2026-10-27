# Patient Portal: shared staff Auth onboarding

Existing staff were excluded by both registration link eligibility and a blanket
login check against `usuarios`. Verified staff now use the same Auth identity and
existing password; login issues only the usual opaque Patient session. Profile
completion still invokes the unchanged service-only verified-Auth claim RPC.
No staff table, organization membership, permission, or staff metadata is written
or copied. Patient reads remain bound to the explicit identity and EMC Contact.

Signup-link duplicate errors `email_exists` and `user_already_exists` both use the
existing-account path; other Auth failures remain fail-closed.

Registration keeps its non-enumerating 202 response and rate limits. On an existing
eligible non-patient account it sends an inbox ownership link without the submitted
replacement password. It cannot reset the existing corporate password. Existing
patients receive no second onboarding link or identity. Unverified unrelated,
banned, deleted and unknown identities are ineligible for this recovery path.
Unconfirmed accounts created by normal Portal signup retain link recovery.

A matching commercial email remains review-required unless an approved explicit
Auth-to-patient Contact binding already exists. Email alone never claims a Contact.
The claim transaction and existing uniqueness constraints prevent retry duplicates;
the unchanged follow-up trigger creates the Portal Lead. No payment is involved.

Existing valid passwords shorter than the new-account 12-character rule are passed
to Supabase for verification on login only; signup keeps the 12-character minimum.
The global Auth configuration and corporate password-recovery policy are unchanged.

## Release gates

Run route unit tests, full CI (including isolated SQL onboarding rehearsal), and
protected Preview checks. Apply only the reviewed function migration through the
existing exact-commit/digest/backup protected schema workflow. Deploy the tested
merge commit; preserve previous deployment and Ignored Build Step `exit 0`.
No Portal source or image change is required: ES/EN forms already use current-
password login and route profile-required accounts into existing profile onboarding.

## Rollback

Restore the previous Vercel deployment. The narrowly scoped rollback SQL restores
only registration-link eligibility; it never deletes patient/Auth/Contact records.
