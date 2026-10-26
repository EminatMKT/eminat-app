# QBO reconciliation on Vercel Hobby

GitHub scheduled runs started hours apart even though the workflow requested five minutes; actual runs completed in about 20 seconds. GitHub schedule events are best effort and can be delayed/dropped. Hobby permits only daily Vercel cron, so moving the same expression into vercel.json is not supported.

The dedicated existing VPS owns the five-minute systemd timer in scripts/ops/qbo-reconcile. Only its new service/timer units are managed; Nginx, Docker, Patient Portal and unrelated timers stay untouched. A single authenticated HTTPS request invokes the unchanged LILLY reconciliation endpoint, with no redirects or HTTP retries. Durable claims, provider reads, payment rules and idempotency remain in LILLY. systemd prevents overlap, uses UTC, persists missed activation across reboot, and keeps the existing CRON_SECRET in a root-only credential file loaded only for the dedicated service account. No QBO OAuth or database credentials are transferred.

A separate one-minute watchdog checks an atomic heartbeat written only after a complete successful worker response. More than ten minutes without success (or a missing heartbeat) emits an operational alert; failed requests and invalid responses never refresh it. Stale/recovery incidents use stable Resend idempotency keys. The authenticated alert endpoint sends fixed, patient-free content only to LILLY_QBO_RECONCILE_ALERT_TO using the existing verified sender/API key server-side. The local monitor retries alert failures and records successful notification to prevent repeated alerts. Test notifications are explicitly labeled. Alerting does not guarantee uptime: a host/network outage can also delay notification; external host monitoring remains a separate operational dependency.

## Controlled rollout

1. CI must pass, including the transaction-rollback opt-out/payment/replay rehearsal. Merge the exact reviewed tree. Apply only the membership-function migration through the existing protected Production workflow, using a verified fresh restorable backup. No patient records are repaired manually.
2. Deploy the exact merge to eminat-app; set only the dedicated alert recipient. Retain the current deployment for rollback and restore Ignored Build Step to exit 0.
3. Install the reviewed units/script and root-only credential file. Disable the GitHub scheduler flag and wait for an in-flight tick to finish before enabling the dedicated timer. The workflow no longer has a schedule trigger; manual dispatch remains disabled unless explicitly restored for rollback. Never enable both primary triggers.
4. Run a controlled empty-queue tick, verify fresh heartbeat and monitor test notification, and observe at least two automatic five-minute activations. Do not create a payment, invoice or patient.

## Rollback

Disable only lilly-qbo-reconcile.timer and lilly-qbo-watchdog.timer, and wait for their current jobs. Preserve heartbeat, notification incident and queue data. Restore the previous application deployment if required; the email-preference function correction is backward compatible and does not require reintroducing the bug. GitHub dispatch may be used only as a temporary manually approved fallback, with the VPS primary stopped. Do not restore a subdaily Hobby cron.
