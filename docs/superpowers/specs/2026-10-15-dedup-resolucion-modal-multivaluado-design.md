# Dedup engine — resolution modal + multivalued attributes — Design

**Origin:** Wagner, 2026-10-15, after a real browser walkthrough (importing the real patient
`.xlsx`, scanning, opening pairs) of the already-built dedup engine
(`docs/superpowers/specs/2026-10-12-motor-duplicados-ambiente-design.md`). The walkthrough
confirmed the engine works end to end, but exposed two real usability problems:

1. Opening a pending pair renders the comparison inline, stuck at the bottom of a list that can
   hold dozens of pairs — in practice you have to scroll past the entire list to reach the two
   decision buttons.
2. Resolving a conflicting field is binary (left or right) even for attributes where that
   doesn't make sense — a patient can legitimately have two valid phone numbers, and forcing a
   pick discards one on screen even though (thanks to the already-built `paciente_contactos`
   mechanism) the data itself survives in the database either way.

**Guiding principle, inherited from the previous spec and not up for debate:** the program
suggests, the person decides. No merge ever runs on its own.

## Scope of this document

Two pieces, both scoped to the **Duplicados submodule** (`DuplicatesTab`) — the resolution flow
*during* import (`src/shared/import/MergeCandidateRow`) is **explicitly out of scope** for now:

1. A **modal** replaces today's inline comparison.
2. A **generic** mechanism so the shared engine knows, from the shape of the data — not from a
   list of field names — which attributes of a pair don't resolve with a binary pick but instead
   keep several values at once. Medical uses it for `telefono`/`email`.

While this screen is already being touched: the pending-pairs list today shows only a badge
("Coincidencia exacta"/"parcial") and a date, no name — a finding from the same walkthrough,
already logged as a Minor in the original engine's final review. Fixed here because the file is
already being touched for the modal, not because it was part of the original goal.

**Explicitly out of scope, for a future round if this one goes well:**
- Carrying the same modal/mechanism to the import flow (`MergeCandidateRow`). Noted as a
  candidate task, no design of its own yet.
- Selective discard with finer granularity than "left / right / both" — e.g. a "manually edit a
  third value" pattern for non-multivalued fields — explicitly rejected for this round: resolving
  a plain field stays strictly left or right, no free-text editing.
- Any notion of "primary" vs. "alternate" among a multivalued field's surviving values — no such
  distinction exists. Every surviving value sits at the same level.

## What already exists and gets reused

Verified in code, not just in the previous spec:

- **`paciente_contactos`** (`supabase/migrations/20260824001303_paciente_contactos.sql`) is
  already, in practice, the multivalued storage for phone/email per patient —
  `UNIQUE (paciente_id, tipo, valor, fuente)`, `ON DELETE CASCADE` against `pacientes`. Both
  manual add/edit (`usePacientes/mutations`) and import (`escribirImport`) already mirror each
  patient's own phone/email there when the patient is created or edited.
- **The child-row move step when merging** (`fusionar_duplicado`, migration `...120500`,
  rewritten today for the final review's Critical #2) already reassigns every one of the loser's
  `paciente_contactos` rows to the winner, row by row — and already knows how to **skip one
  specific row without aborting the whole merge** (today the trigger is a uniqueness collision;
  here the same mechanism gets a second trigger: the person's explicit choice). This document
  does not invent that mechanism, it reuses it with a second way to fire it.
- **Resolution of the scalar column `pacientes.telefono`/`pacientes.email`** stays exactly as it
  is today — `NO_SON_CHOQUE` in `pacienteIdentity.fusionarCampoSimple` already excludes them
  from `choques`, and the existing value already silently wins over the incoming one when it has
  a value. **This spec does not touch that resolution.** The multivalued piece is a separate
  layer, exclusively over `paciente_contactos` — there is no "which of the two phones ends up in
  the `pacientes.telefono` column" decision to make here.
- **`FieldCompare`** (`src/shared/components/ui/FieldCompare/`) already resolves the binary
  left/right pick for a plain field — unchanged for those fields.
- **`ConfirmModal`** (`src/shared/components/ui/ConfirmModal/`) is already this repo's dialog
  pattern — trapped focus, explicit close, overlay. The new resolution modal follows the same
  pattern instead of inventing a new one.

## Section 1 — Structural detection of "multivalued" in the shared engine

`DedupStrategy<T>` (`src/shared/dedup/strategy.ts`) **gains no new field** to declare which
attributes are multivalued. Instead, the generic component that builds the comparison (today,
what `comparePacientes`/`FieldCompare` use internally on Medical's side) decides from the shape
of the value: when comparing `a[campo]` against `b[campo]`, if the value is an array
(`Array.isArray`), the field is treated as multivalued — regardless of what it's an array of, or
what the field is called. If it's a scalar, it follows the usual path (left/right pick).

This means the shared engine never imports or knows about `Paciente` or `paciente_contactos` —
it stays exactly as agnostic as it is today. All the responsibility for **when** a field shows up
as an array falls on each module's own adapter.

**Invariant:** the array's element type is generic (`T[]`, not `string[]`) — the engine never
assumes a multivalued value is text. For Medical, each element is
`{ id: string; valor: string }` (see Section 2), because the selective-discard mechanism
(Section 4) needs to reference one specific `paciente_contactos` row, not just a bare string. A
future consumer with a different element shape needs no change to the engine — only to its own
adapter.

## Section 2 — Medical's adapter builds the multivalued view

`pacienteDedupStrategy`/`comparePacientes` (or whatever component replaces them when building
the modal) need, for a pair of patients, the list of **every** phone and email value on each
side — not just the scalar column. This is built by reading `paciente_contactos` filtered by
`paciente_id` and `tipo`, deduplicated by value, for each patient in the pair:

```
telefono: [{ id: <paciente_contactos.id>, valor: <text> }, ...]
email:    [{ id: <paciente_contactos.id>, valor: <text> }, ...]
```

If a patient has no contact of that type at all (neither a mirrored scalar column nor a
`paciente_contactos` row, which shouldn't happen given add/edit/import already mirror, but can
happen with older data), the list is simply empty — the field doesn't show up in the modal for
that pair when both sides are empty, same as today's "nothing differs to review" when there's
nothing to show.

**Where the `id` comes from:** real, already-existing `paciente_contactos` rows — nothing new is
created to build this view, it's a read.

## Section 3 — The modal

Replaces today's inline `PairDetail` render inside `DuplicatesTab`. Same pattern as
`ConfirmModal`: a real dialog (`role="dialog"`, focus trapped on open, returned on close), an
overlay that dims but doesn't allow interacting with the list behind it, explicit close (Cancel
button + Esc).

Content, top to bottom, always visible without scrolling unless the field grid itself is long (in
which case only the grid scrolls, not the whole screen — the actions stay fixed at the bottom):

1. Summary of both patients (as today).
2. Conflicting-field grid:
   - Scalar field: unchanged `FieldCompare`, left/right pick.
   - Multivalued field: one row per distinct value across both sides (deduplicated union), each
     with its own checkbox, **all checked by default** — touching nothing preserves today's
     behavior (nothing is lost).
3. The four actions (Cancel / Not the same person / Keep separate / Merge).

## Section 4 — The RPC: selective discard of multivalued values

`fusionar_duplicado` gains a new, optional parameter defaulting to an empty list:
`p_contactos_excluidos uuid[]` — ids of the **loser's** `paciente_contactos` rows the caller
decided NOT to keep.

In the child-row move step that already exists (the per-row loop, with its
`BEGIN ... EXCEPTION WHEN unique_violation` already built today for Critical #2), a row whose
`id` is in `p_contactos_excluidos` gets skipped the same way a colliding row does — it's never
moved, and when the loser patient is deleted at the end of the function, it cascades away on its
own via the already-existing `ON DELETE CASCADE`. No new code path is needed for "discard"; it's
literally the same path that already exists for collisions, with a second reason to take it.

**Invariants the implementation must satisfy:**

- **Every id in `p_contactos_excluidos` must actually belong to the loser** (same
  `paciente_id = p_perdedor_id`) — if not, the whole merge is rejected (not silently ignored; an
  id that doesn't belong to the loser is a malformed client call, not a normal case to tolerate).
- An id that's in `p_contactos_excluidos` but would have collided anyway (already covered by
  today's mechanism) is not an error — it simply never moves, for either reason.
- Excluding **every** value of a contact type for one side is valid — a patient can end up with
  no phone numbers in `paciente_contactos` after a merge. There is no minimum number of contacts
  to keep.
- The winner's scalar `pacientes.telefono`/`pacientes.email` column is **not touched** by this
  mechanism — it keeps resolving exactly as it already does today, out of scope for this spec
  (see "What already exists and gets reused").

**Who builds the exclusion list:** the client. The modal knows, from the unchecked boxes, which
of the loser's `paciente_contactos.id`s the person doesn't want to keep — it builds the array and
sends it alongside `p_valores_finales` in the same `fusionar_duplicado` call.

## Section 5 — Pending-pairs list: show names

A walkthrough finding, fixed along the way: `ParDuplicado` (the list row) today only renders the
level badge and the date. It starts including the summary of both items — the same
`renderResumen` function the shared engine already receives as a prop and that today is only used
inside the opened pair's detail. No new data is required, just using something `DuplicatesTab`
already has on hand for each row of the list.

## Tests — what the implementation has to prove

- **Shared engine:** a field whose value is an array renders with checkboxes, not
  `FieldCompare`; a scalar field behaves exactly as today. The engine imports nothing from
  Medical to achieve this.
- **Medical's adapter:** the multivalued view of a pair includes every value from both sides,
  deduplicated, with their real `paciente_contactos` ids.
- **RPC — default case:** merging without unchecking anything leaves exactly the same result as
  today (every contact from both sides survives) — zero behavior change if the person never
  touches the new feature.
- **RPC — real exclusion:** a `paciente_contactos` id from the loser listed in
  `p_contactos_excluidos` does not appear in `paciente_contactos` after the merge (not on the
  winner — it was obviously never there — and not orphaned on the loser, which no longer
  exists).
- **RPC — foreign id:** an id in `p_contactos_excluidos` that belongs to a different patient
  (not this merge's loser) rejects the whole merge with a clear error, rather than silently
  ignoring it.
- **Modal:** opens with trapped focus, Cancel/Esc closes it and returns focus, actions stay
  visible without scrolling the list behind it.
- **List:** every pending row shows both patients' names, not just the badge.

## Future tasks noted, no design of their own yet

- Carry this same modal/mechanism to the import flow (`MergeCandidateRow`), if this round in
  Duplicados works out. Today import resolves with a single "Merge with this" checkbox per whole
  candidate — much coarser than what lands here.
