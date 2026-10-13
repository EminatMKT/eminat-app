# Directory birthdays release

## Production gate (13 October 2026)

- Supabase `eminat-app` physical scheduled backup: 13 Oct 2026 05:31:03 UTC, with **Restore** available in Database Backups. Point-in-time recovery is not enabled. Before applying, recheck the backup and preserve the current user audit.
- Read-only precheck: private profile table exists with RLS enabled and zero rows; all eight confirmed user IDs exist and are active; new columns, delivery table and migration version are absent.
- The migration does not update `public.usuarios`; eight confirmed birthdays are inserted in the private table without birth year. Ariana remains unconfirmed and absent.
- Rollback: disable `BIRTHDAY_SCHEDULER_ENABLED` in GitHub Actions; export the delivery log if populated; run `supabase/rollback/20261013020000_directory_birthdays_rollback.sql`. For a full database restore, use the verified Supabase physical backup, recognizing that it restores the whole database to its timestamp.

## Scheduler

After the migration, merge, deployment, and verification, set repository variable `BIRTHDAY_SCHEDULER_ENABLED=true`. The independent GitHub Actions job calls the existing LILLY Production domain at 08:07 America/Guayaquil daily using the existing `CRON_SECRET`. The server computes the local date; each `birthday/{usuario_id}/{year}` claim is unique and is written before calling Resend. Uncertain provider outcomes remain claimed for manual reconciliation, never automatic replay.

## Data still requiring confirmation

The audit found 43 active users; 38 currently visible in Directory and five legacy test/service accounts hidden by the Directory rule. Across active users, four lack company, seven lack a cargo assignment, and ten lack a team (which may legitimately be optional). Location data also needs confirmation: one profile says “Ubicación desconocida,” two say only “Miami,” and three say “Nueva, Ecuador.” Only eight birthdays were supplied and confirmed. Do not fill other profiles or birthdays from assumptions.
