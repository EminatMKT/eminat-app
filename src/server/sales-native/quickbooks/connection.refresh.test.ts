import { afterEach,describe,expect,it,vi } from 'vitest'

const { rpc,refresh,companyInfo } = vi.hoisted(() => ({
  rpc:vi.fn(async (name:string) => name === 'native_sales_qbo_claim_refresh'
    ? { data:[{ realm_id:'123456789',refresh_token_ciphertext:'sealed-refresh' }],error:null }
    : { data:true,error:null }),
  refresh:vi.fn(async () => ({ accessToken:'new-access',refreshToken:'new-refresh',
    accessExpiresAt:new Date(Date.now()+3600_000),
    refreshExpiresAt:new Date(Date.now()+90*24*3600_000) })),
  companyInfo:vi.fn(async () => ({ id:'123456789',
    name:'Eminat Medical Center LLC',legalName:null })),
}))
vi.mock('@/server/sales-native/auth',() => ({
  NativeSalesAuthError:class NativeSalesAuthError extends Error {
    constructor(readonly status:number,readonly code:string) { super(code) }
  },
}))
vi.mock('@/server/sales-native/patient-qbo-auth',() => ({ patientQboActor:vi.fn() }))
vi.mock('@/shared/db/supabaseAdmin',() => ({ supabaseAdmin:() => ({
  from:() => ({ select:() => ({ eq:() => ({ eq:() => ({
    maybeSingle:async () => ({ data:{ realm_id:'123456789',
      access_token_ciphertext:'sealed-access',status:'CONNECTED',
      access_expires_at:new Date(Date.now()+3600_000).toISOString(),
      refresh_expires_at:new Date(Date.now()+90*24*3600_000).toISOString(),
    },error:null }),
  }) }) }) }),
  rpc,
}) }))
vi.mock('./client',() => ({ QBO_CALLBACK:
  'https://app.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback',
  QboClient:class QboClient { refresh = refresh; companyInfo = companyInfo },
}))
vi.mock('./token-vault',() => ({
  openQboToken:(_cipher:string) => _cipher === 'sealed-refresh' ? 'current-refresh' : 'current-access',
  sealQboToken:(token:string) => `sealed-${token}`,
}))
import { readConnectedQboCompany } from './connection'

describe('controlled refresh of a still-valid QBO token',() => {
  afterEach(() => { vi.clearAllMocks();vi.unstubAllEnvs() })

  it('claims the lease, rotates both encrypted tokens, then probes CompanyInfo',async () => {
    vi.stubEnv('LILLY_QBO_OAUTH_ENABLED','true')
    vi.stubEnv('LILLY_QBO_CLIENT_ID','controlled-client-id')
    vi.stubEnv('LILLY_QBO_CLIENT_SECRET','controlled-client-secret')
    vi.stubEnv('LILLY_QBO_TOKEN_KEY','controlled-token-key')
    vi.stubEnv('LILLY_QBO_REDIRECT_URI',
      'https://app.stratixsolutions.us/api/sales-native/quickbooks/oauth/callback')
    expect(await readConnectedQboCompany(true)).toEqual({
      realmId:'123456789',companyName:'Eminat Medical Center LLC',legalName:null,
    })
    expect(refresh).toHaveBeenCalledExactlyOnceWith('current-refresh')
    expect(rpc).toHaveBeenCalledWith('native_sales_qbo_claim_refresh',expect.any(Object))
    expect(rpc).toHaveBeenCalledWith('native_sales_qbo_finish_refresh',
      expect.objectContaining({ p_access_ciphertext:'sealed-new-access',
        p_refresh_ciphertext:'sealed-new-refresh' }))
    expect(companyInfo).toHaveBeenCalledExactlyOnceWith('123456789','new-access')
  })
})
