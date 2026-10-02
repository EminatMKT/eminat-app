/** Response inits and query options the role routes share, named once. */
const ROLE_HTTP = {
  badRequest: { status: 400 },
  created: { status: 201 },
  countOnly: { count: 'exact', head: true },
} as const

export default ROLE_HTTP

// ROLE_HTTP exists so both role routes answer with the same statuses without each declaring them.
