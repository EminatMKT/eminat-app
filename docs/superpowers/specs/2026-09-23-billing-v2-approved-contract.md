# Billing v2 — approved contract

Date: 2026-09-23
Status: **approved by the user.** This supersedes the open alternatives in
[the database proposal](2026-09-23-billing-v2-database-proposal.md), which stays as the review
record and the rationale. Where the two disagree, this file wins.

This closes Task 1 of [the implementation plan](../plans/2026-09-23-billing-v2.md). No database has
been changed yet: the DDL below is the approved shape, and Task 5 turns it into a real migration.

## 1. Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | Currency | **Store `currency_code` per row.** Required `'USD'` on payments, NULL elsewhere |
| 2 | Row authorization | **Module-wide.** Anyone holding `cobranzas` reads, creates, edits and deletes every row, paid ones included |
| 3 | Offboarding | **Billing RLS also requires `usuarios.activo`.** Billing only — the shared helper stays untouched |
| 4 | Creator retention | **`ON DELETE SET NULL`**, plus a count-and-warn step in `/admin` before a hard delete |
| 5 | Release scope | **Calendar and reminders only.** No table view, no summary, no CSV |
| 6 | Reminder semantics | **America/Guayaquil** business day; Upcoming has **no horizon** |
| 7 | Summary scope (when built) | Selected **calendar month**, period spelled out in the heading |
| 8 | Legacy v1 | Tables, grants and data untouched; no route reaches them |

Decisions 5, 7 and the recipient model are tracked as deferred work in the central todo store,
entered 2026-09-23.

### Defaults taken without a separate question

These follow from the decisions above and from the plan's confirmed scope. They are recorded here
so nobody has to re-derive them, and so a disagreement has something concrete to point at.

- **One table** (`billing_v2_records`), alternative A of the proposal.
- **One month note per month, globally** — a consequence of decision 2: the dataset is shared, so
  the note belongs to the group rather than to each person. A per-owner scope would need a
  different unique key.
- **`record_type` is immutable** after insert. Turning a payment into an event would silently strip
  its amount and status through the subtype check.
- **`scheduled_on` on a payment is the due/planned date**, not the settlement date. This is the
  reading the plan's confirmed Upcoming/Overdue rule already assumes; the editor has to say so.
- **`TableView` is deferred**, `CalendarView` is built. Shared table presentation is meant to
  replace every table in the CRM, not to serve billing — which makes it a larger piece than this
  release, designed against its real consumers rather than against one feature. Deferring it ships
  the MVP; it comes back as its own change.

## 2. Field contract

`amount` is the only column that separates *unknown* from *explicitly zero*, and that distinction
is the whole reason it stays nullable: Canva's own form saves a blank amount as `0`, which is how a
missing figure turns into a confirmed obligation of nothing.

| Column | Type | Payment | Event | Month note | Meaning |
|---|---|---|---|---|---|
| `id` | `uuid` | PK | PK | PK | Application identity |
| `record_type` | `text` | `'payment'` | `'event'` | `'month_note'` | Immutable discriminator |
| `scheduled_on` | `date` | required | required | NULL | Due/planned date; event day |
| `scheduled_time` | `time` | optional | optional | NULL | Local wall clock, minute granularity |
| `note_month` | `date` | NULL | NULL | required | The month, as its first day |
| `title` | `text` | required | required | NULL | Concept |
| `category` | `text` | required | NULL | NULL | `payroll` or `contractors_vendors` |
| `payment_status` | `text` | required | NULL | NULL | `pending`, `scheduled`, `pending_approval`, `paid` |
| `payee_label` | `text` | required | NULL | NULL | Free text: person, vendor or payroll group |
| `amount` | `numeric` | optional | NULL | NULL | NULL is unknown, `0` is an explicit zero |
| `currency_code` | `text` | `'USD'` | NULL | NULL | Stored unit |
| `event_type_label` | `text` | NULL | optional | NULL | Free text, no catalog |
| `note_text` | `text` | optional | optional | required | Plain text |
| `closing_approval_follow_up` | `boolean` | settable | false | false | Visible marker only |
| `created_by_id` | `uuid` | server | server | server | Nullable FK, SET NULL on delete |
| `created_at` | `timestamptz` | server | server | server | Creation metadata |
| `updated_at` | `timestamptz` | server | server | server | Last write |

Never persisted: `has_amount` (derive from `amount IS NOT NULL`), Upcoming/Overdue/paid flags,
totals, month or year copies of a full date, formatted money, translated labels, colours, and a
copy of the creator's display name.

## 3. Mutation DTOs

The browser never sends actor or timestamps. The three creation shapes are separate types rather
than one partial record, so an event carrying an amount fails to compile instead of failing a CHECK.

```ts
export type BillingPaymentInput = {
  recordType: 'payment'
  scheduledOn: string          // ISO date
  scheduledTime: string | null // 'HH:mm'
  title: string
  category: 'payroll' | 'contractors_vendors'
  paymentStatus: 'pending' | 'scheduled' | 'pending_approval' | 'paid'
  payeeLabel: string
  amount: string | null        // decimal string, never a JS number
  noteText: string | null
  closingApprovalFollowUp: boolean
}

export type BillingEventInput = {
  recordType: 'event'
  scheduledOn: string
  scheduledTime: string | null
  title: string
  eventTypeLabel: string | null
  noteText: string | null
}

export type BillingMonthNoteInput = {
  recordType: 'month_note'
  noteMonth: string            // ISO date, first day of the month
  noteText: string
}

export type BillingRecordInput =
  | BillingPaymentInput
  | BillingEventInput
  | BillingMonthNoteInput
```

`amount` crosses the wire as a decimal string. A JS number cannot hold every cent value exactly,
and this is the field that decides what somebody gets paid.

An update carries the record's `id` plus the same subtype shape minus `recordType`, which is
immutable.

## 4. Approved DDL shape

Task 5 generates the migration file; this is what goes in it. Two differences from the proposal's
sketch, both from decisions 3 and 4:

```sql
  created_by_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
```

Nullable, and nulled when the person is deleted. Everything else in the proposal's
`CREATE TABLE` sketch — the subtype check, exact-cent amount bounds, the nonblank text pattern,
date range, month-start sentinel and minute precision — carries over unchanged, except that
`created_by_id` loses its `NOT NULL`.

### The creator trigger has to let the nulling through

`ON DELETE SET NULL` fires an ordinary `UPDATE` on the referencing row, so a blanket immutability
check on `created_by_id` would raise and block the user deletion — the exact failure the plan warns
about. The check allows the transition to NULL and nothing else:

```sql
    IF NEW.created_by_id IS DISTINCT FROM OLD.created_by_id
       AND NEW.created_by_id IS NOT NULL THEN
      RAISE EXCEPTION 'Billing authorship cannot be transferred';
    END IF;
```

Nulling an existing creator is referential cleanup and passes. Pointing the row at a different
person is transferring authorship, and filling a NULL creator back in is inventing one; both raise.
Reassigning who entered a payment is falsifying a record, which is why this is a constraint and not
a convention.

### RLS carries the active check

```sql
CREATE POLICY billing_v2_select ON public.billing_v2_records
FOR SELECT TO authenticated
USING (
  public.has_module('cobranzas')
  AND EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.auth_id = auth.uid() AND u.activo
  )
);
```

The same `USING` predicate goes on insert, update and delete, `WITH CHECK` included where the
operation takes one. `has_module()` checks role, not `activo`, so without the `EXISTS` a deactivated
person keeps full access until their JWT expires. The helper itself is left alone: around ten
modules depend on it, and changing it here would alter their behaviour as a side effect.

The `EXISTS` runs as the invoker and is therefore subject to `usuarios` RLS. Task 5 tests it rather
than assuming it: a deactivated person who cannot see their own row also fails the check, which is
the intended outcome, but it has to be observed and not reasoned about.

## 5. Reminder rule

```
overdue  : record_type = 'payment' AND payment_status <> 'paid' AND scheduled_on <  today
upcoming : record_type = 'payment' AND payment_status <> 'paid' AND scheduled_on >= today
paid     : absent from reminders, present in the calendar
```

`today` is the current date in `America/Guayaquil`, the timezone the test suite already runs under.
Upcoming is unbounded. Events and month notes are never reminders. Both groups render even when
empty, because an empty Overdue is information.

## 6. Deletion guard in /admin

`src/app/api/admin/delete-user/route.ts` currently turns a foreign-key failure into advice: reassign
the person's tasks, or deactivate. With `SET NULL` that failure never happens for billing, so the
advice never appears and the authorship of every payment that person entered quietly becomes NULL.

Before deleting, the route counts the person's billing rows and, when there are any, answers 409
with the count and a suggestion to deactivate instead. An explicit `force` flag proceeds. The
authorship is never handed to somebody else to clear the way.

## 7. What Task 5 must prove

Every predicate below came out of static review. None has been run against PostgreSQL.

- Each subtype rejects the other subtypes' columns, and required fields reject NULL.
- A payment without `currency_code` is rejected; USD is stored even when the amount is unknown.
- `-0.004`, `0.004`, `1.005`, negatives, `NaN` and infinities are rejected; `1.2300` is accepted.
  NULL and `0` survive a round trip through editor and API as different values.
- Required text rejects empty, spaces, tabs, newlines, NBSP and BOM; real multiline notes survive.
- Date bounds, leap days, the first-day month sentinel, minute precision and the rejection of
  `24:00`.
- Two concurrent month notes for the same month: one wins, with a usable error.
- A forged `created_by_id` on insert is ignored; repointing it at another person raises; nulling it
  through a user deletion passes.
- PostgREST, as a real authenticated user and never as service_role: anonymous, authenticated
  without the module, finance with the module, admin, and **a deactivated person holding a JWT
  issued before deactivation**, across SELECT, INSERT, UPDATE and DELETE.
- Legacy `cobranzas_*` tables, grants and row counts unchanged.
