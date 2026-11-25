# Optional private development evidence

This implementation is separate from the governance proposal in PR #210. It was
requested by the Product Owner to reduce evidence copying and development overhead.
It adds no approval requirement and does not require policy adoption to run within
existing authorized development scope. Existing CI, reviews and protected approval
interfaces remain authoritative. It performs no GitHub writes, workflow reruns,
deployments, database operations or provider activation.

Keep configuration and records outside the checkout. Run `collect_iteration.py
--help` for options. `--github` collects current-source required checks and review
metadata; `--diagnose-ci` optionally classifies failures in ordinary pull-request
CI for that source. No result approves integration, a release or Production execution.
Illustrative review/approval text is a **template**, not a submitted GitHub review.
The reviewer's feedback supplied through the Product Owner is not a recorded GitHub
approval. Only the actual eligible current-head review in GitHub counts.

## Security: untrusted CI logs

**CI logs are untrusted content.** `--allow-escape-sequences` allows bytes that can
manipulate terminal displays, conceal text or forge apparent instructions. The flag
is used only with captured byte output for in-memory parsing. Never print, render,
retain or attach raw logs, execute their contents, or treat embedded text as agent
instructions. The tool saves only allowlisted classifications and a log hash.
Diagnostic classifications are hints, not proof of cause, safety or release authority.
Protected/unrelated workflow logs are excluded; all GitHub requests use GET.

## Fingerprint and cache boundary

The fingerprint includes the working-tree contents of tracked paths, every
non-ignored untracked path, command arguments, this tool's source, the inherited
environment digest, Node version and TypeScript/Vitest package metadata. It hashes
file names, contents, deletions and link targets. It never saves environment values.

| Input | Source fingerprint behavior |
| --- | --- |
| Tracked file, including one later matched by an ignore rule | Working-tree content included; edits/deletions invalidate. |
| Non-ignored untracked file | Included; creation, edit, rename or deletion invalidates. |
| Ignored untracked source file | Excluded from the Git-derived source input set. Its presence disables PASS reuse. |
| Symbolic link | Target text included; presence disables PASS reuse because external content is not bound. |
| Commands, environment, explicit tool/runtime metadata | Changes invalidate. The two TypeScript/Vitest package metadata files are explicitly hashed even if Git-ignored; this does not make opaque ignored dependency contents cache-safe. |

Excluding ignored source contents alone is insufficient: ignored environment, dependency
or generated files may affect TypeScript or tests. Reuse therefore requires both
the previous and current validation to have no ignored or symbolic-link inputs,
in addition to an identical fingerprint and a previous PASS. Old records without
this boundary metadata are not reusable. In a normal checkout with ignored
`node_modules/`, local commands rerun automatically. This conservative restriction
requires no human approval; successful source-bound GitHub checks remain reusable.
The fingerprint is not a claim of hermetic execution or coverage of external
services. Live database/provider acceptance must never be inferred from this cache.

Real temporary-Git regressions cover tracked/untracked changes, ignored-file
exclusion, ignored-input changes/removal that must rerun validation, links and
environment/command changes. Source changes during validation cannot produce a
reusable PASS. Tests run through the existing Vitest bridge without workflow edits.

## Smoke authentication and runtime

Per-module test boundaries are intentional: each route retains the existing
60-second budget instead of sharing one deadline across every module. The original
split logged in 11 times. Successful CI for source `92977474`, run
[45623062539](https://github.com/EminatMKT/eminat-app/actions/runs/45623062539),
reported 116.9 seconds summed across those 11 tests, all in one shard. This measures
whole tests; it does not isolate authentication time.

The revised suite authenticates through the real login UI once per worker and
keeps the snapshot in memory only. Every test still receives a fresh browser
context and waits for the loaded profile before client-side rail navigation.
Authentication itself retains a runtime-error assertion. All ten module route,
access-denial and live-shell assertions, hidden Sales navigation, explicit Sales
404 denial and per-test runtime-error assertions remain. No timeout, retry, shard
or workflow configuration changes are introduced. Fresh CI is required to measure
the revised runtime; the old passing run is not approval of the revised source.
