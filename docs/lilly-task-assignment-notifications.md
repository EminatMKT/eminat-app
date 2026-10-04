# LILLY Task assignment notifications

The `actividades_assignment_email` trigger is the only producer for both the internal notification and the email outbox. Inserts with an assignee and updates that change `responsable_id` create one outbox row for the new assignee. The internal bell item is skipped for self-assignment; the email follows Meet's current self-assignment behavior. The trigger includes the actor's name only when it can resolve the authenticated user (or `created_by_id` on insert).

The task save API and Meet create/update API call the same outbox dispatcher after a successful write. A protected cron endpoint drains pending rows, including writes made outside those routes. `claim_task_assignment_emails` uses row locks and increments attempts atomically. A per-task event sequence prevents an old A→B→A assignment from sending after a newer one. Resend receives a stable idempotency key based on the outbox event ID. Explicit provider errors retry at most five times with backoff. Transport exceptions and sent rows that cannot be recorded remain in `sending` for manual reconciliation. Preexisting `failed` rows are not replayed automatically because their provider outcome is unknown.

## Preview setup

1. Apply `20261004120000_lilly_task_assignment_delivery.sql` to Preview Supabase only, after the earlier LILLY outbox migration.
2. Configure Preview `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` and an allowed sender via `TASK_NOTIFY_FROM_EMAIL` if the default `notificaciones@stratixsolutions.us` is not verified. Set `TASKS_PUBLIC_URL` to the Preview `/tasks` URL if the Vercel deployment URL should not be used.
3. Vercel cron jobs invoke only production deployments. For Preview, invoke `GET /api/tasks/notifications/process` with `Authorization: Bearer <CRON_SECRET>` from a Preview scheduler or manually after fixture creation. The committed daily cron is a production recovery path for a future release, not a Preview deployment.
4. **Before testing Meet-originated creation**, disable Meet's legacy call from `stratix-meet/app/meetings/[id]/page.tsx` to `executeTaskCommand({ action: 'notify_created' })` and its separate Resend sender in `stratix-meet/app/api/notify-task/route.ts`. Meet currently sends a second email to the responsible person and team after LILLY has already sent the outbox email. The LILLY branch cannot prevent that external sender. Meet should continue to create/update canonical Tasks through LILLY; only its separate email send should be retired.

No Production migration or deployment is part of this branch. A task link goes to `/tasks`; opening a specific task from an arbitrary URL is not implemented because the current client task list does not provide a task-scoped authorization check for that deep link.
