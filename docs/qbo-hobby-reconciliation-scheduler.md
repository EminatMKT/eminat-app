# QuickBooks reconciliation on Vercel Hobby

Vercel Hobby rejects the five-minute cron in PR #155. This release removes only
`/api/sales-native/quickbooks/reconcile` from `vercel.json`. The route and
LILLY reconciliation worker remain unchanged. GitHub Actions schedules one
authenticated GET about every five minutes; GitHub schedules are best effort and
may run late or be skipped. The durable LILLY event queue retains pending work.

The scheduler is disabled unless the repository variable
`LILLY_QBO_RECONCILE_SCHEDULER_ENABLED` is exactly `true`. It also requires
the existing `CRON_SECRET` to be bound as a GitHub repository secret with the
same value used by Vercel Production. Neither value is copied into code or logs.
Pull requests run contract tests only and never call Production. The runner makes
one request without HTTP retries or redirects; worker claims, payment validation,
idempotency and audit remain inside LILLY.

## Enablement gate

Keep the scheduler variable unset/false and `LILLY_QBO_OAUTH_ENABLED=false`
through this deployment. Before enabling later, confirm Production OAuth and
the EMC realm, the GitHub/Vercel `CRON_SECRET` binding, and the webhook and
reconciliation health. Enable the repository variable only after those checks.
Use one controlled dispatch and inspect sanitized Actions status and LILLY
audit. Do not treat GitHub schedule as a strict payment-confirmation SLA.

## Rollback

Set `LILLY_QBO_RECONCILE_SCHEDULER_ENABLED=false` first and wait for an active
tick to finish before restoring the previous Vercel deployment. The previous
deployment's five-minute Vercel cron remains incompatible with Hobby; do not
reactivate it. No schema or payment data is changed by this scheduler PR.
