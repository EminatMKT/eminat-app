import { beforeEach, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { reconcileMeetingNotifications, type DeliveryReader } from './mail-reconciliation'

const provider = { get: vi.fn<DeliveryReader['get']>() }
const job = { source: 'meeting', delivery_id: 'qa-delivery', provider_message_id: 'qa-provider' }
function fixture(saved = true) {
  const rpc = vi.fn(async (name: string) => ({ data: name === 'list_meeting_notification_reconciliation' ? [job] : saved, error: null }))
  return { db: { rpc } as unknown as SupabaseClient, rpc }
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'info').mockImplementation(() => undefined); vi.spyOn(console, 'warn').mockImplementation(() => undefined) })
it('defaults to disabled without touching storage or provider', async () => {
  const { db, rpc } = fixture()
  await reconcileMeetingNotifications({ db, provider, enabled: false })
  expect(rpc).not.toHaveBeenCalled(); expect(provider.get).not.toHaveBeenCalled()
})
it.each(['delivered','bounced','failed','complained','delivery_delayed'])('records verified provider state %s without sending', async state => {
  const { db, rpc } = fixture()
  provider.get.mockResolvedValue({ data: { id: 'qa-provider', last_event: state }, error: null })
  const result = await reconcileMeetingNotifications({ db, provider, enabled: true })
  expect(result.recorded).toBe(1)
  expect(rpc).toHaveBeenLastCalledWith('record_meeting_notification_delivery', expect.objectContaining({ p_provider_id: 'qa-provider', p_state: state }))
})
it.each(['wrong ID','read denied','network'])('never records unverified outcome: %s', async reason => {
  const { db, rpc } = fixture()
  if (reason === 'network') provider.get.mockRejectedValue(new Error('offline'))
  else provider.get.mockResolvedValue(reason === 'read denied' ? { data: null, error: { message: 'denied' } } : { data: { id: 'other', last_event: 'delivered' }, error: null })
  const result = await reconcileMeetingNotifications({ db, provider, enabled: true })
  expect(result.recorded).toBe(0); expect(result.warning).toBeTruthy(); expect(rpc).toHaveBeenCalledTimes(1)
})
it('does not claim reconciliation completed when durable recording fails', async () => {
  const { db } = fixture(false)
  provider.get.mockResolvedValue({ data: { id: 'qa-provider', last_event: 'delivered' }, error: null })
  expect((await reconcileMeetingNotifications({ db, provider, enabled: true })).recorded).toBe(0)
})
