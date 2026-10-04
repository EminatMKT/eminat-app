# LILLY Task assignment notifications

The `actividades_assignment_email` trigger is the only producer for both the internal notification and the email outbox. Inserts with an assignee and updates that change `responsable_id` create one outbox row for the new assignee. The internal bell item is skipped for self-assignment; the email follows Meet's current self-assignment behavior. The trigger includes the actor's name only when it can resolve the authenticated user (or `created_by_id` on insert).

The task save API and Meet create/update API call the same outbox dispatcher after a successful write. A protected cron endpoint drains pending rows, including writes made outside those routes. `claim_task_assignment_emails` uses row locks and increments attempts atomically. A per-task event sequence prevents an old A→B→A assignment from sending after a newer one. Resend receives a stable idempotency key based on the outbox event ID. Explicit provider errors retry at most five times with backoff. Transport exceptions and sent rows that cannot be recorded remain in `sending` for manual reconciliation. Preexisting `failed` rows are not replayed automatically because their provider outcome is unknown.

## Production release preparation

1. Merge and deploy the companion Meet branch `feature/grace-delegate-task-assignment-notifications` **first**. It removes both the page call and `/api/notify-task` endpoint, so Meet no longer sends the second email. The currently deployed LILLY code already dispatches its outbox after Meet creation, so this order avoids a gap in assignment email delivery.
2. Apply `20261004120000_lilly_task_assignment_delivery.sql` to Supabase Production only as part of the approved release, after the existing outbox migration. Do not apply it merely by opening a PR.
3. Before deploying this LILLY branch, verify Production `RESEND_API_KEY`, `SUPABASE_SECRET_KEY` and `CRON_SECRET`. The sender defaults to `LILLY <notificaciones@stratixsolutions.us>`; set `TASK_NOTIFY_FROM_EMAIL` only if that verified sender needs an explicit override. `TASKS_PUBLIC_URL` is optional and defaults to `https://app.stratixsolutions.us/tasks`.
4. Merge and deploy this LILLY branch after the migration and environment are ready. The daily Vercel cron calls `GET /api/tasks/notifications/process` with `Authorization: Bearer <CRON_SECRET>`; the API routes still dispatch immediately after a Task write.

No Production migration or deployment was performed while preparing these branches. A task link goes to `/tasks`; opening a specific task from an arbitrary URL is not implemented because the current client task list does not provide a task-scoped authorization check for that deep link.
