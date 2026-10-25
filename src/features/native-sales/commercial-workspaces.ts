import type { SalesOrganizationOption } from '@/server/sales-native/auth'

// Approved commercial lines, in default order. Corporate memberships alone
// never publish a workspace. Adding a line does not grant anyone access:
// discovery and every data request still require their exact active membership.
const commercialWorkspaces = [
  { organizationCode: 'emc', labelKey: 'sales.workspace.emc' },
] as const

export function authorizedCommercialWorkspaces(organizations: SalesOrganizationOption[]) {
  return commercialWorkspaces.flatMap(workspace => {
    const membership = organizations.find(option => option.code === workspace.organizationCode)
    return membership ? [{ ...workspace, organizationId: membership.organizationId }] : []
  })
}
