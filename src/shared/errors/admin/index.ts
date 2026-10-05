/** Every error text the admin routes answer with; functions take the detail they interpolate. */
const ADMIN_ERRORS = {
  unknownCatalog: 'Unknown catalog.',
  nameRequired: 'The name is required.',
  inUseCheckFailed: 'Could not check whether it is in use. Try again.',
  missingField: (field: string) => `A required field is missing: ${field}.`,
  inUse: (count: number) => `In use by ${count} record(s). Reassign them before deleting.`,
  idRequired: 'id is required.',
  oldIdRequired: 'oldId is required.',
  userIdRequired: 'userId is required.',
  requiredFields: 'Required fields: email, password, nombre, apellido.',
  passwordTooShort: 'The password must be at least 8 characters long.',
  noFieldsToUpdate: 'No fields to update.',
  userNotFound: 'User not found in public.usuarios.',
  adminTierDelete: 'A user with the admin/superadmin role cannot be deleted. Change their role first.',
  lastAdminDelete: 'The last admin cannot be deleted.',
  lastAdminDemote: 'The last admin cannot be demoted.',
  sameOwner: 'The new owner cannot be the user being deleted.',
  relatedRecords: 'The user has related records (tasks, notifications or others). Use "Reassign and delete" to transfer their tasks to another member, or "Deactivate" to keep the history intact.',
  rowNotDeleted: 'The row was not deleted (0 rows affected). It may no longer exist.',
  rowNotUpdated: 'The row was not updated (0 rows affected). The id may not exist.',
  reassignFailed: 'The atomic reassignment failed.',
  authCreateFailed: 'Could not create the user in Auth.',
  passwordUpdateFailed: 'Could not update the password.',
  authEmailReverted: ' (Auth email reverted).',
  authRollbackDone: ' (the Auth account was reverted; no orphan left).',
  unexpectedDelete: 'Unexpected error while deleting the user.',
  unexpectedUpdate: 'Unexpected error while updating the user.',
  unexpectedCreate: 'Unexpected error while creating the user.',
  unexpectedReassign: 'Unexpected error during reassignment.',
  unexpectedResetPassword: 'Unexpected error while resetting the password.',
  // Welcome-email warnings end in a period: CredentialsPanel appends `admin.shareManually`.
  emailMissingKey: 'Email not sent: RESEND_API_KEY is missing.',
  emailUnknownError: 'unknown error',
  emailNotProduction: (env: string) => `Email not sent: the environment is "${env}", not production.`,
  emailFailed: (detail: string) => `Email not sent: ${detail}.`,
  invalidStatusOverride: (value: unknown) => `Invalid statusOverride: ${value}`,
  lookupFailed: (detail: string) => `Lookup failed: ${detail}`,
  dbDeleteFailed: (detail: string) => `DB delete failed: ${detail}`,
  authFailed: (detail: string) => `Auth: ${detail}`,
  emailTaken: (name: string) => `${name} already has an account with that email. Use "Reset" to change their password.`,
  authNote: (uid: string, detail: string) => `auth.users delete (id=${uid}) reported: ${detail}`,
  authEmailRevertFailed: (detail: string) =>
    ` (could not revert the Auth email: ${detail} — run the manual rollback in the dashboard).`,
  authRollbackFailed: (detail: string, uid: string) =>
    ` (rolling back the Auth account also failed: ${detail} — delete auth.users id ${uid} from the Supabase dashboard).`,
} as const

export default ADMIN_ERRORS

// ADMIN_ERRORS keeps the admin routes' messages in one place: the same text answered by several
// routes is written once, and a test or the UI can import the exact string instead of copying it.
