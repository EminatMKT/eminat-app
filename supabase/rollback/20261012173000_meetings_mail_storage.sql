-- Non-destructive rollback: pause worker/reconciliation and restore previous app first.
-- Run only with final authorization; no historic/business rows or queue evidence deleted.
SET LOCAL lock_timeout='3s';
DROP TRIGGER IF EXISTS meeting_mail_after_created ON public.meeting_events;
DROP TRIGGER IF EXISTS meeting_mail_after_editorial ON public.meetings;
DROP TRIGGER IF EXISTS meeting_mail_after_invitees ON public.meeting_participants;
-- Keep all mail tables, snapshots, provider IDs, RPCs and accepted dedupe records.
-- Reapplying the forward migration restores triggers without resetting activation watermark.
