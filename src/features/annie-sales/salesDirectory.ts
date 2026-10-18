export type SalesDirectory = {
  users?: { principalId: string; role: string; displayName?: string }[]
  teams?: string[]
  teamNames?: Record<string, string>
}

const roles: Record<string, string> = {
  SUPERADMIN: 'Superadmin', ADMINISTRATOR: 'Administrator',
  SALES_MANAGER: 'Sales manager', OPERATOR: 'Seller',
  FINANCE: 'Finance', AUDITOR: 'Auditor',
}

export function roleLabel(role: string): string {
  return roles[role] ?? 'Team member'
}

export function ownerLabel(directory: SalesDirectory, id: string | null | undefined): string {
  if (!id) return 'Unassigned'
  const user = directory.users?.find(person => person.principalId === id)
  return user?.displayName?.trim() || (user ? roleLabel(user.role) : 'Team member')
}

export function teamLabel(directory: SalesDirectory, id: string | null | undefined): string {
  if (!id) return 'No team'
  return directory.teamNames?.[id]?.trim() || 'Team'
}
