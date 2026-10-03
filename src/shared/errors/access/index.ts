/** What the API session guards answer when a caller has no session or lacks the permission. */
const ACCESS_ERRORS = {
  notAuthenticated: 'Not authenticated.',
  adminRequired: 'Admin role required.',
  moduleRequired: (slug: string) => `The ${slug} module is required.`,
} as const

export default ACCESS_ERRORS

// ACCESS_ERRORS gives requireAdmin and requireAccess one wording for the same 401/403, so every
// guarded route answers a missing session the same way.
