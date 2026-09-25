-- Billing v2: every free-text column carries the length limit its form declares.
--
-- Measured 25/09/2026 in the browser pass: a 466-character concept was stored, because nothing
-- along the way limited it, and it stretched a calendar cell to the height of the page.
--
-- The limits are declared ONCE, in src/features/billing-v2/domain/text-limits: the zod schema
-- reads them with `.max()` and the inputs with `maxLength`. These literals are the one copy SQL
-- cannot avoid, and `text-limits`' test reads this file back and compares every number with the
-- constant, so changing one without the other fails the suite.
--
-- 20260923223348_billing_v2_records.sql is already applied in prod and is not edited: this is a
-- new migration. Each constraint is added NOT VALID and validated right after, so a row that
-- is already too long aborts the push here, naming its constraint, instead of being silently
-- kept. Prod held 0 billing_v2_records rows on 25/09/2026. char_length() of NULL is NULL, which a
-- CHECK accepts, so the optional columns stay optional.

ALTER TABLE public.billing_v2_records
  ADD CONSTRAINT billing_v2_title_length CHECK (char_length(title) <= 120) NOT VALID,
  ADD CONSTRAINT billing_v2_payee_length CHECK (char_length(payee_label) <= 120) NOT VALID,
  ADD CONSTRAINT billing_v2_event_type_length CHECK (char_length(event_type_label) <= 60) NOT VALID,
  ADD CONSTRAINT billing_v2_note_length CHECK (char_length(note_text) <= 2000) NOT VALID;

ALTER TABLE public.billing_v2_records VALIDATE CONSTRAINT billing_v2_title_length;
ALTER TABLE public.billing_v2_records VALIDATE CONSTRAINT billing_v2_payee_length;
ALTER TABLE public.billing_v2_records VALIDATE CONSTRAINT billing_v2_event_type_length;
ALTER TABLE public.billing_v2_records VALIDATE CONSTRAINT billing_v2_note_length;
