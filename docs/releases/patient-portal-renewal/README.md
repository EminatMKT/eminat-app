# Coordinated Patient Portal release

The Patient Portal is a separate application with a local Git repository and no configured GitHub remote. This reviewed patch records its exact scoped source change alongside the LILLY PR without mixing applications or repositories. The manifest pins the baseline, Portal commit and patch checksum.

Apply only to the matching clean Portal baseline. Verify the patch checksum, apply/check in an isolated copy, run Portal tests/TypeScript/changed-file lint/build and the synthetic renewal browser rehearsal. Deploy the matching Portal build only after the guarded additive LILLY schema and exact LILLY runtime are ready. Retain the preceding Portal image/container configuration for rollback. Do not modify Nginx, DNS, other applications or unrelated containers.

All Portal API communication retains the existing server-only Patient API boundary and origin/session controls. There are no direct database, QuickBooks credential or mock-production paths in this change.
