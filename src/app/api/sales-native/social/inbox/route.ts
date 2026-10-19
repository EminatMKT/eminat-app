import { nativeSalesErrorResponse, resolveSalesActor } from '@/server/sales-native/auth'
import { nativeSalesDatabaseError } from '@/server/sales-native/errors'
import { salesCan } from '@/server/sales-native/policy'
import { visibleSocialAssets, visibleSocialConversations } from '@/server/sales-native/social/inbox-scope'
import { supabaseAdmin } from '@/shared/db/supabaseAdmin'

export const dynamic = 'force-dynamic'

/** Read-only Social inbox. Server derives asset scope; clients cannot request another tenant. */
export async function GET(request: Request) {
  try {
    const actor = await resolveSalesActor(request)
    if (!salesCan(actor, 'sales:read'))
      return Response.json({ code: 'SALES_ACCESS_DENIED' }, { status: 403 })
    const db = supabaseAdmin()
    const { data: assets, error: assetError } = await db.from('sales_social_assets')
      .select('id,display_name,asset_type,default_owner_member_id,default_team_id')
      .eq('organization_id', actor.organizationId).limit(500)
    if (assetError) return nativeSalesDatabaseError(assetError)
    const visible = visibleSocialAssets(actor, assets ?? [])
    const ids = visible.map(asset => asset.id)
    if (!ids.length) return Response.json({ data: { assets: [], conversations: [], messages: [], comments: [] } },
      { headers: { 'Cache-Control': 'no-store' } })
    const { data: conversations, error: conversationError } = await db.from('sales_social_conversations')
      .select('id,asset_id,channel,kind,last_event_at,last_text,unread,owner_member_id')
      .eq('organization_id', actor.organizationId).in('asset_id', ids)
      .order('last_event_at', { ascending: false }).limit(100)
    if (conversationError) return nativeSalesDatabaseError(conversationError)
    const scopedConversations = visibleSocialConversations(actor, visible, conversations ?? [])
    const conversationIds = scopedConversations.map(row => row.id)
    const { data: messages, error: messageError } = conversationIds.length
      ? await db.from('sales_social_messages')
        .select('id,conversation_id,direction,text_content,status,occurred_at')
        .eq('organization_id', actor.organizationId).in('conversation_id', conversationIds)
        .order('occurred_at', { ascending: false }).limit(100)
      : { data: [], error: null }
    if (messageError) return nativeSalesDatabaseError(messageError)
    const { data: comments, error: commentError } = await db.from('sales_social_comments')
      .select('id,asset_id,direction,text_content,status,occurred_at')
      .eq('organization_id', actor.organizationId).in('asset_id', ids)
      .order('occurred_at', { ascending: false }).limit(100)
    if (commentError) return nativeSalesDatabaseError(commentError)
    return Response.json({ data: { assets: visible.map(asset => ({ id: asset.id,
      displayName: asset.display_name || asset.asset_type })),
      conversations: scopedConversations, messages: messages ?? [], comments: comments ?? [] } },
    { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return nativeSalesErrorResponse(error) }
}
