-- Billing v2: a month note may be dated any day, and a month may hold any number of them.
--
-- Wagner, 26/09/2026: no limit — a note can be dated any day, several per month or per day, and
-- they are only grouped by month. The one-note-per-month index and the first-of-month CHECK were a default taken
-- without asking (spec 2026-09-23-billing-v2-approved-contract §1), not Canva evidence. Found in
-- the non-admin browser pass: a second note in a month failed on the unique index, and any day
-- but the 1st was refused.
--
-- Both objects only ever REFUSE rows, so dropping them cannot invalidate a stored one. The
-- column keeps its name: renaming it would touch every reader for no change in meaning to the
-- user, and the calendar still groups notes by the month of this date.

DROP INDEX public.billing_v2_one_note_per_month_idx;

ALTER TABLE public.billing_v2_records DROP CONSTRAINT billing_v2_month_start;

COMMENT ON COLUMN public.billing_v2_records.note_month IS
  'Day a month note is dated. Any day; the calendar groups notes by its month. NULL for payments and events.';
