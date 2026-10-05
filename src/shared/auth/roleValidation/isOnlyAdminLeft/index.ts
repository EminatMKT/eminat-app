import { ADMIN_ROLE } from '@/shared/auth/permissions'

type UserRole = { id: string; rol: string }

export default function isOnlyAdminLeft(users: UserRole[], targetId: string): boolean {
  const admins = users.filter((u) => u.rol === ADMIN_ROLE)
  return admins.length === 1 && admins[0].id === targetId
}

// Would removing or demoting this user leave zero admins? True only when the target is the one
// and only admin in the list. The routes that delete, reassign or demote a user ask it first.
