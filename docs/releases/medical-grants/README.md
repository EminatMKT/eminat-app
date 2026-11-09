# Medical registry privilege minimization

Owner authorized the exact three-table correction on 2026-10-29. Production audit found all three Medical registry tables empty, RLS gated by medical module, but anon and authenticated had unnecessary maintenance rights. Native Sales and Portal are commercial; this change does not enable clinical use or decide HIPAA applicability.

Migration 20261029150000 removes all anon privileges and only TRUNCATE/REFERENCES/TRIGGER from authenticated on pacientes, paciente_fuentes and paciente_contactos. RLS-gated authenticated CRUD and service/owner access remain. No rows, policies, functions, application code or business behavior change.

Local PostgreSQL 17.11 grant/rollback rehearsal passed with integer-only fixtures. Additional gate tests reject populated baseline, RLS-policy drift, retained maintenance privilege and lost authorized DML. Local test's permission predicate is a stand-in; Production read-only tests separately confirmed false medical predicate for seller, finance, nonstaff Portal and anonymous categories.

Use Medical guarded grants workflow on merged exact main SHA, through existing Production environment approval. It requires a fresh restorable provider backup before apply, refuses any pending migration other than this version, and checks the exact live empty-table/RLS/ACL baseline. Preserve check output's unrelated public schema/function/policy fingerprint and verify it afterward. Database connection uses existing protected owner secret with fixed project and TLS certificate validation; never print it. No manual SQL-editor workaround for a failed protected gate.

Rollback SQL restores captured prior ACLs, including the known excess privileges, and needs an explicit rollback decision. A rollback of the app alone does not undo database ACLs. No database migration/provider relocation, payment, clinical record inspection or new integration is part of this release.
