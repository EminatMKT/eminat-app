import { beforeEach,describe,expect,it,vi } from 'vitest'
vi.mock('@/shared/db/supabaseAdmin',() => ({supabaseAdmin:vi.fn()}))
import { nativeReportMailPolicy,processNativeSalesReports } from './report-delivery'

const job={
  id:'10000000-0000-4000-8000-000000000001',claimId:'10000000-0000-4000-8000-000000000002',
  organizationId:'10000000-0000-4000-8000-000000000003',
  scheduleId:'10000000-0000-4000-8000-000000000004',
  recipientMemberId:'10000000-0000-4000-8000-000000000005',
  recipientEmail:'freddy@stratix360.com',periodFrom:'2026-10-12',periodTo:'2026-10-18',
  cadence:'WEEKLY',reportPath:'/sales',
}
const report={leads:{total:4},opportunities:{total:3,won:1,lost:1},
  memberships:{sold:1},activities:{total:5}}
const qa=nativeReportMailPolicy({SALES_NATIVE_REPORT_MAIL_MODE:'qa',
  SALES_NATIVE_REPORT_QA_RECIPIENTS:'freddy@stratix360.com',
  SALES_NATIVE_REPORT_FROM_EMAIL:'LILLY <noreply@stratixsolutions.us>',
  SALES_NATIVE_REPORT_LINK_ORIGIN:'https://app.stratixsolutions.us'})
function fixture(recorded=true) {
  const rpc=vi.fn(async (name:string) => name==='native_sales_claim_due_reports'
    ? {data:[job],error:null}:name==='native_sales_report_detail'
      ? {data:report,error:null}:{data:recorded,error:null})
  const provider={emails:{send:vi.fn(async (_message:{from:string;to:string;subject:string;text:string},
    _options:{idempotencyKey:string}) => ({data:{id:'provider-qa'},error:null}))}}
  return {db:{rpc} as never,provider,rpc}
}
beforeEach(() => vi.clearAllMocks())

describe('native Sales scheduled report delivery',() => {
  it('never claims jobs when delivery is disabled or QA has no allowlist',async () => {
    const {db,rpc,provider}=fixture()
    expect(nativeReportMailPolicy({}).enabled).toBe(false)
    expect(nativeReportMailPolicy({SALES_NATIVE_REPORT_MAIL_MODE:'qa',
      SALES_NATIVE_REPORT_FROM_EMAIL:'a@example.test',
      SALES_NATIVE_REPORT_LINK_ORIGIN:'https://app.stratixsolutions.us'}).enabled).toBe(false)
    await processNativeSalesReports({db,provider,policy:nativeReportMailPolicy({})})
    expect(rpc).not.toHaveBeenCalled()
  })
  it('sends only scoped aggregate metrics and durably records acceptance',async () => {
    const {db,rpc,provider}=fixture()
    const result=await processNativeSalesReports({db,provider,policy:qa})
    expect(provider.emails.send).toHaveBeenCalledOnce()
    const [message,options]=provider.emails.send.mock.calls[0]
    expect(message.to).toBe('freddy@stratix360.com')
    expect(message.text).toContain('Won: 1')
    expect(message.text).toContain('https://app.stratixsolutions.us/sales')
    expect(options).toEqual({idempotencyKey:`lilly-native-sales-report/${job.id}`})
    expect(rpc).toHaveBeenLastCalledWith('native_sales_finish_report_delivery',expect.objectContaining({
      p_delivery_id:job.id,p_claim_id:job.claimId,p_status:'SENT',p_provider_message_id:'provider-qa',
    }))
    expect(result).toMatchObject({sent:1,failed:0})
  })
  it('blocks other recipients during controlled QA and records failure without sending',async () => {
    const {db,rpc,provider}=fixture()
    const policy=nativeReportMailPolicy({SALES_NATIVE_REPORT_MAIL_MODE:'qa',
      SALES_NATIVE_REPORT_QA_RECIPIENTS:'other@example.test',
      SALES_NATIVE_REPORT_FROM_EMAIL:'LILLY <noreply@stratixsolutions.us>',
      SALES_NATIVE_REPORT_LINK_ORIGIN:'https://app.stratixsolutions.us'})
    const result=await processNativeSalesReports({db,provider,policy})
    expect(provider.emails.send).not.toHaveBeenCalled()
    expect(rpc).toHaveBeenLastCalledWith('native_sales_finish_report_delivery',expect.objectContaining({
      p_status:'FAILED',p_error_code:'RECIPIENT_NOT_ALLOWED',
    }))
    expect(result).toMatchObject({sent:0,failed:1})
  })
  it('records uncertain provider outcome as failed and never reports success',async () => {
    const {db,rpc,provider}=fixture()
    provider.emails.send.mockRejectedValueOnce(new Error('transport unknown'))
    const result=await processNativeSalesReports({db,provider,policy:qa})
    expect(rpc).toHaveBeenLastCalledWith('native_sales_finish_report_delivery',expect.objectContaining({
      p_status:'FAILED',p_error_code:'PROVIDER_OUTCOME_UNKNOWN',
    }))
    expect(result.sent).toBe(0)
  })
  it('does not report acceptance when durable finish fails',async () => {
    const {db,provider}=fixture(false)
    await expect(processNativeSalesReports({db,provider,policy:qa})).rejects.toThrow('REPORT_OUTCOME_NOT_RECORDED')
  })
})
