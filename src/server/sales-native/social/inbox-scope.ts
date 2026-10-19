import type { SalesActor } from '../policy'

export type InboxAsset = {
  id: string
  default_owner_member_id: string
  default_team_id: string | null
}
export type InboxConversation = {
  id: string
  asset_id: string
  owner_member_id: string | null
}

/** Service-role queries must be reduced to the actor's organization and Sales scope. */
export function visibleSocialAssets<T extends InboxAsset>(actor: SalesActor, assets: readonly T[]): T[] {
  if (['SUPERADMIN', 'ADMINISTRATOR', 'AUDITOR'].includes(actor.role)) return [...assets]
  return assets.filter(asset => asset.default_owner_member_id === actor.memberId ||
    (actor.role === 'SALES_MANAGER' && !!asset.default_team_id &&
      actor.teamIds.includes(asset.default_team_id)))
}

export function visibleSocialConversations<T extends InboxConversation>(actor: SalesActor, assets: readonly InboxAsset[],
  conversations: readonly T[]): T[] {
  const visibleAssets = new Map(assets.map(asset => [asset.id, asset]))
  if (['SUPERADMIN', 'ADMINISTRATOR', 'AUDITOR'].includes(actor.role))
    return conversations.filter(row => visibleAssets.has(row.asset_id))
  return conversations.filter(row => {
    const asset = visibleAssets.get(row.asset_id)
    return !!asset && (row.owner_member_id === actor.memberId ||
      (actor.role === 'SALES_MANAGER' && !!asset.default_team_id &&
        actor.teamIds.includes(asset.default_team_id)))
  })
}
