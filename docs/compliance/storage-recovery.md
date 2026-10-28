# Storage and generated-document recovery
Reviewed 2026-10-28. **Current persistent-object recovery: NOT APPLICABLE to the inspected empty Supabase bucket. Future backup implementation: NOT VERIFIED.** Strategy below is proposed, not an operational backup claim.

## Actual inventory and authorization
| Store / artifact | Actual use and sensitivity | Recovery source |
| --- | --- | --- |
| Supabase `sales-membership-archive` | Private bucket, 0 objects; historical membership/agreement PDFs supported by schema but none present | Separate object backup required before critical uploads |
| `sales_membership_archive_documents` | 0 rows; stores pointers, kind, hash and byte count | Database backup restores metadata only |
| Current membership card/PDF | Generated on demand by authenticated patient route; no Storage API upload found in deployed LILLY source | Restore database/application/fonts/assets, then regenerate after authorization |
| Agreement acceptance / membership state | Database acceptance records and immutable consent evidence; no file bytes stored by these routes | Database recovery and consent integrity verification; do not regenerate an historical signed document and call it original evidence |
| Generated exports/documents | Reviewed LILLY paths return generated output; no additional persistent Storage writer identified | Preserve source records and exact generator version; client-downloaded copies are outside server backup |
| Portal/public static assets | Application/site release assets | Existing controlled release/host backup process; not evidence of a complete Hostinger file inventory |

Live metadata query read counts only, no file names, keys or patient bytes. Supabase bucket blocks browser anon/authenticated object access by restrictive policy; metadata table RLS and grants deny browser access. Server-only/operator authorization remains required. No public bucket or anonymous file URL was introduced.

## Separate object strategy — before first critical upload
1. Assign owner and legally approve destination, region, PHI suitability/BAA, encryption and access. Do not create a paid service or copy sensitive files from this task.
2. Use a separately authorized backup identity with source read scope and destination create-only scope. Keep Production object deletion and backup deletion permissions separate. Never put service keys in a Preview or public script.
3. Copy to dated/versioned destination prefixes; retain a protected manifest of object versions, byte count and SHA-256. Coordinate manifest/database snapshot timing to preserve pointer consistency. An unversioned mirror or sync-with-delete is not protection against accidental deletion/corruption.
4. Approve retention/legal holds with counsel. Proposed baseline for review: seven daily recovery generations plus an independently retained incident snapshot; this is not adopted and may be inadequate for consent/medical-record retention. Do not auto-purge original evidence.
5. Verify native versioning/immutability on the chosen destination. No source bucket versioning or provider deleted-object recovery guarantee was established here. Assume deletion may be unrecoverable without the independent copy.
6. Monitor count/hash completeness and failed runs, and perform a synthetic canary restore before any production-file exercise. Record aggregate evidence and authorized reviewer.

## Restore and reconciliation
Create a private isolated destination after separate authorization. Restore bucket settings and restrictive policies before bytes. Restore the matching database metadata and backed-up object versions, verify all expected pointer→object hash/size pairs, and flag missing/orphaned objects without publishing names. Test access denials and one synthetic authorized read. Never repair Storage by inserting only `storage.objects` metadata: bytes must be restored through supported provider APIs.

Rollback leaves the original bucket and backup intact; no destructive sync/delete. If hashes mismatch, quarantine the destination and retain both manifests for investigation. Production replacement/cutover and deletion require their own approved scope. Do not infer file recovery from a successful database restore.

## Ownership and acceptance
Owner, destination, executed agreement, encryption/key recovery evidence, schedule, retention, alert recipient and exercise record: **PENDING before critical files are introduced**. Actual empty inventory removes the previously unverified-current-object assumption; it does not establish recovery of files held in other systems.

Sources: [Supabase backup exclusions](https://supabase.com/docs/guides/platform/backups), [clone exclusions](https://supabase.com/docs/guides/platform/clone-project).
