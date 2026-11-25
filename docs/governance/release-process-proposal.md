# Proposal: one release record, explicit decisions, reusable evidence

**Status: PROPOSED FOR FORMAL REVIEW — not adopted; no release or production action is authorized by this proposal.**

Reviewed baseline: `main` at `4fcd1c82a96a8d080c83730da4fe374323800cb1`, November 19, 2026.
This is a separate governance proposal, not an amendment to PR #209's approvals or release gates.

## Existing requirements and the source of duplication

[AGENTS.md](../../AGENTS.md) requires a reviewed PR merged to `main`, reserves Production
migrations to the Production maintainer, and requires committed precheck/check/rollback artifacts.
The guarded schema process additionally binds execution to a reviewed commit/digest, the exact
pending set, fresh backup evidence and protected Production approval. The active main ruleset
requires PRs and successful `checks`/`e2e`, with strict status checks and no force pushes.

An independent human review is an explicit condition of the current Meta release authorization.
It must not be described as already supplied by the owner's other account, or as a universal
numeric approval requirement quoted from AGENTS.md. Applicable reviewer requirements must be
identified before release work starts, with their source recorded. No existing condition is waived.

Scope approval, technical review and approval to execute a protected Production operation are
three different decisions. Repeating the same decision in multiple chats adds no evidence.

## Proposed responsibilities

| Responsibility | Accountable person and decision |
| --- | --- |
| Scope | Project owner approves one versioned scope: behavior, target, acceptance criteria and excluded live operations. |
| Technical readiness | An eligible human reviewer supplies the existing required PR review for the current head. Qualified specialist or independent review applies where the affected risk or an existing release condition requires it; combine these responsibilities where permitted. |
| Database execution | Production maintainer validates target/backup/pending set and owns migration execution and verification within the reviewed process. |
| Release coordination | Named release lead maintains the canonical checklist, checks gates, coordinates the permitted integration and records deployed SHA/verification. |

The Product Owner owns product direction, priorities, branding, functional scope and architecture
decisions informed by technical evidence. A specialist's recommendation is not an adopted policy
or an additional approval hierarchy. Qualified technical review, business risk acceptance and
mandatory Production approval remain distinct responsibilities; existing requirements still apply.
Routine iterations within accepted scope proceed without renewed scope approval. A UI, text,
reporting or performance change follows the relevant review/CI requirements; unrelated database,
recovery or payment execution gates do not apply unless the actual change affects those risks or
an existing release-specific condition requires them. Unknown sensitive impact requires review.

Role combinations are allowed only where existing controls permit them and independence is real.
Two accounts belonging to one person never establish independence. Agents may prepare evidence,
changes and checklists; they do not approve their own work or perform operations AGENTS.md forbids.
If an applicable qualified reviewer or maintainer is unavailable, identify that staffing blocker at
intake; unrelated staffing gaps do not stop permitted routine development.

## One canonical checklist

Use one canonical release record; when evidence is sensitive, keep it private and use the primary
release PR body only as a non-sensitive index. Linked schema/preparation PRs use the same release ID.
Link original immutable artifacts and decisions rather than copying audits into new reports or public
attachments. Existing GitHub reviews and protected approvals remain authoritative in their interfaces.
For each item record **owner, result and evidence URL/reference**. Use N/A with a reason only when
that gate truly does not apply; enforced controls cannot be marked N/A.

- [ ] Release ID, primary/related PRs, current head SHA, target and responsible people identified.
- [ ] Owner approval linked to the versioned scope; disabled/live provider operations stated explicitly.
- [ ] Required CI successful for the current head/base as required by existing protections; run IDs linked.
- [ ] Technical human review recorded for the current head; all applicable reviewer conditions satisfied.
- [ ] Database impact classified; exact ordered SQL files/digests and precheck/check/rollback artifacts linked.
- [ ] Target inventory reconciled; backup still available/fresh; prechecks and recovery limitations accepted.
- [ ] Required protected-environment/run approvals recorded; maintainer execution and postchecks complete
      at the stage required by the existing database process, or staged behind a verified default-off gate.
- [ ] Permitted reviewed integration to `main` completed; merge SHA and deployment record linked.
- [ ] Actual Production SHA/aliases, authorized navigation and essential negative access cases verified.
- [ ] Release lead records completion or one named blocking gate, its responsible person and next action.

Database sequencing must match the existing process. If a guarded database operation requires a
reviewed `main` SHA, use an additive schema/preparation PR that remains safe and unused on the old
schema, then maintainer verification, then the feature-activation PR. Each changed head still needs
its required CI/review; linked PRs do not require repeated owner approval of unchanged business scope.
Never expose code that depends on unapplied schema, or pause/change automatic deployment controls
to solve ordering. Verify staged default-off behavior before the preparation PR can merge.

Publishing a default-off interface and activating a real provider are separate scopes. OAuth,
subscriptions, ingestion, messaging, credentials and paid resources require their applicable explicit
authorization; their activation is not implied by an interface release.

## Evidence reuse and refresh rules

| Evidence | Reuse | Refresh trigger |
| --- | --- | --- |
| Owner scope approval | Keep the original linked decision; no new chat confirmation for the same approved scope/target. | Material scope/target/risk change, expiry, or an explicit commit-specific limitation. |
| Required CI | Reuse successful checks at the required exact head; do not rerun because a chat/assignee changed. | Changed head/base/dependencies or another trigger required by the existing protections. Never transfer a green check to another SHA. |
| Technical validation/review | Carry forward unaffected artifacts with their source SHA, inputs and environment; review the delta. | Current-head sign-off plus affected security, authorization, schema or recovery changes. Do not repeat unrelated general audits. |
| Target/backup/run evidence | Reuse while the exact target, SQL set, inventory and freshness remain valid. | Drift, expired backup evidence, changed SQL/target, failed execution or a new run-bound approval requirement. |

An explicit exact-SHA authorization is never silently broadened to another commit. A failed migration
stops the operation; inspection and an authorized recovery decision precede any retry. Database
backups are not restored automatically. Existing freshness and recovery gates remain authoritative.

The optional development tool `scripts/dev/collect_iteration.py` implements private evidence
collection without changing CI or adding an approval gate. It collects current-head GitHub checks,
review metadata and applied rules through GET requests, and can run selected source unit tests plus
type checking. It reuses local PASS results only with identical source/tool/command fingerprints.
An explicit private configuration may enable passive HTTPS checks of existing non-production login
pages; redirects are not followed and no credentials or response bodies are saved. Keep configuration
and records outside the public checkout. The tool preserves human decisions, never approves a release
and never treats local validation or a reachable login page as production acceptance. Its help text
contains the invocation; no workflow installation, deployment or paid resource is needed.

## Adoption — separate reviewed decision

1. Review the current PR, including this proposal and the optional evidence-collection code.
   Owner, qualified technical reviewer and Production
   maintainer agree on responsibilities, gate applicability and the canonical checklist.
2. Finalize the proposal before final approval; complete the existing required PR checks and reviews.
   A maintainer may then adopt it through the ordinary reviewed PR workflow in a later authorized
   action. This task does not merge this proposal or authorize a Production deployment.
3. Record the adopted policy version/effective date and use this checklist in the next module PR.
   Evaluate whether missing ownership, repeated decisions or stale evidence caused delays.

No AGENTS.md hard prohibition, guard, workflow, branch protection, Production environment approval,
deployment setting or credential is changed or authorized to change by this proposal. Adoption
remains pending required review and a verified compliant integration path under the existing rules.
Existing releases, including #209, retain their outstanding conditions; this is not retroactive approval.

References: [schema release process](../native-sales-schema-release.md),
[guarded schema workflow](../../.github/workflows/native-sales-guarded-schema.yml),
[backup freshness validator](../../scripts/migration/check_restorable_backup.py).
