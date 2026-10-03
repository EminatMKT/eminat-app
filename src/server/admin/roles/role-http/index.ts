/** Response bodies, inits and query options the role routes share, named once. */
const ROLE_HTTP = {
  badRequest: { status: 400 },
  created: { status: 201 },
  countOnly: { count: 'exact', head: true },
  done: { ok: true },
  systemRoleDelete: { error: 'A system role cannot be deleted.' },
  roleInUse: { error: 'The role still has users. Reassign them before deleting it.' },
} as const

export default ROLE_HTTP

// ROLE_HTTP exists so both role routes answer with the same statuses and bodies without each
// declaring them.
