// NULL is reserved for rows that existed before Directory visibility was added.
// An explicit admin choice (true/false) always wins; new rows default to false.
const legacyHiddenEmails = new Set([
  'e2e-meet-tasks@stratixsolutions.us',
  'prueba@emc.health',
  'video@stratix360.com',
  'design@stratix360.com',
  'marketing@eminat.net',
])

export function isVisibleInDirectory(user: { directorio_visible?: boolean | null; email?: string | null }): boolean {
  if (user.directorio_visible !== null && user.directorio_visible !== undefined) return user.directorio_visible
  return !!user.email && !legacyHiddenEmails.has(user.email.toLowerCase())
}
