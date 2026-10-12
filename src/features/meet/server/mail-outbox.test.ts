import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { meetingMailPolicy, processMeetingMail, type MeetingMailJob, type MailProvider } from './mail-outbox'

const job: MeetingMailJob = {
  id: 'delivery-1', claim_id: 'claim-1', email: 'qa@example.test', name: 'QA', attempts: 1, kind: 'created',
  payload: { title: 'Controlled Meeting', date: '2026-10-12', startTime: '10:00', endTime: '11:00', location: 'QA room' },
}
const controlled = meetingMailPolicy({ MEETINGS_MAIL_MODE: 'qa', MEETINGS_QA_RECIPIENTS: 'qa@example.test' })
const provider = { send: vi.fn<MailProvider['send']>() }
function fixture(finish = true) {
  const rpc = vi.fn(async (name: string) => name === 'claim_meeting_mail'
    ? { data: [job], error: null } : { data: finish, error: null })
  return { db: { rpc } as unknown as SupabaseClient, rpc }
}
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'info').mockImplementation(() => undefined); provider.send.mockResolvedValue({ data: { id: 'provider-qa' }, error: null }) })
describe('Meeting mail durable worker', () => {
  it('is disabled by default and never claims pending jobs', async () => {
    const { db, rpc } = fixture()
    await processMeetingMail({ db, provider, policy: meetingMailPolicy({}) })
    expect(rpc).not.toHaveBeenCalled(); expect(provider.send).not.toHaveBeenCalled()
  })
  it('does not start QA with an empty allowlist', () => {
    expect(meetingMailPolicy({ MEETINGS_MAIL_MODE: 'qa' }).enabled).toBe(false)
  })
  it('sends creation snapshot, records provider acceptance, and uses delivery UUID as stable key', async () => {
    const { db, rpc } = fixture()
    const result = await processMeetingMail({ db, provider, policy: controlled, meetingId: 'meeting-id' })
    expect(provider.send.mock.calls[0][0].subject).toBe('Convocatoria de reunión: Controlled Meeting')
    expect(provider.send.mock.calls[0][0].text).toContain('QA room')
    expect(provider.send.mock.calls[0][1]).toEqual({ idempotencyKey: 'lilly-meeting/delivery-1' })
    expect(rpc).toHaveBeenLastCalledWith('finish_meeting_mail', expect.objectContaining({ p_claim_id: 'claim-1', p_outcome: 'accepted', p_provider_id: 'provider-qa' }))
    expect(result.deliveries[0].status).toBe('sent')
  })
  it('renders updates from the captured event instead of current mutable Meeting data', async () => {
    const { db, rpc } = fixture()
    rpc.mockResolvedValueOnce({ data: [{ ...job, kind: 'changed' }], error: null } as never)
    await processMeetingMail({ db, provider, policy: controlled })
    expect(provider.send.mock.calls[0][0].subject).toBe('Actualización de reunión: Controlled Meeting')
  })
  it('blocks recipients outside the controlled allowlist without provider calls', async () => {
    const { db, rpc } = fixture()
    await processMeetingMail({ db, provider, policy: meetingMailPolicy({ MEETINGS_MAIL_MODE: 'qa', MEETINGS_QA_RECIPIENTS: 'different@example.test' }) })
    expect(provider.send).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenLastCalledWith('finish_meeting_mail', expect.objectContaining({ p_outcome: 'dead' }))
  })
  it.each([429, 503])('retries explicit transient response %s', async statusCode => {
    const { db, rpc } = fixture()
    provider.send.mockResolvedValue({ data: null, error: { statusCode, message: 'transient' } })
    await processMeetingMail({ db, provider, policy: controlled })
    expect(rpc).toHaveBeenLastCalledWith('finish_meeting_mail', expect.objectContaining({ p_outcome: 'retry' }))
  })
  it('does not retry invalid requests', async () => {
    const { db, rpc } = fixture()
    provider.send.mockResolvedValue({ data: null, error: { statusCode: 422, message: 'invalid request' } })
    await processMeetingMail({ db, provider, policy: controlled })
    expect(rpc).toHaveBeenLastCalledWith('finish_meeting_mail', expect.objectContaining({ p_outcome: 'dead' }))
  })
  it.each(['transport', 'missing ID'])('retains %s as unknown instead of resending blindly', async reason => {
    const { db, rpc } = fixture()
    if (reason === 'transport') provider.send.mockRejectedValue(new Error('network timeout'))
    else provider.send.mockResolvedValue({ data: null, error: null })
    await processMeetingMail({ db, provider, policy: controlled })
    expect(rpc).toHaveBeenLastCalledWith('finish_meeting_mail', expect.objectContaining({ p_outcome: 'unknown' }))
  })
  it('never reports sent if durable acceptance recording failed', async () => {
    const { db } = fixture(false)
    const result = await processMeetingMail({ db, provider, policy: controlled })
    expect(result.deliveries[0].status).toBe('failed')
    expect(result.warning).toBeTruthy()
  })
})

