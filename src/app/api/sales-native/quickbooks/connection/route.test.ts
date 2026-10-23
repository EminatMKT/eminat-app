import { afterEach,describe,expect,it,vi } from 'vitest'
import { NativeSalesAuthError } from '@/server/sales-native/auth'

vi.mock('@/server/sales-native/auth',() => {
  class NativeSalesAuthError extends Error {
    constructor(readonly status:number,readonly code:string) { super(code) }
  }
  return { NativeSalesAuthError,
    nativeSalesErrorResponse:(error:unknown) => {
      const known = error instanceof NativeSalesAuthError ? error :
        new NativeSalesAuthError(503,'SALES_UNAVAILABLE')
      return Response.json({ code:known.code },{ status:known.status })
    },
  }
})

const { qboManager,readConnectedQboCompany } = vi.hoisted(() => ({
  qboManager:vi.fn(async () => 'authorized-manager'),
  readConnectedQboCompany:vi.fn(async () => ({
    realmId:'123456789',companyName:'Eminat Medical Center LLC',legalName:null,
  })),
}))
vi.mock('@/server/sales-native/quickbooks/connection',() => ({
  qboManager,readConnectedQboCompany,
}))
import { POST } from './route'

const request = () => new Request(
  'https://app.stratixsolutions.us/api/sales-native/quickbooks/connection',
  { method:'POST' })

describe('controlled QBO refresh probe',() => {
  afterEach(() => vi.clearAllMocks())

  it('authorizes before forcing refresh and returns company identity without tokens',async () => {
    const response = await POST(request())
    expect(response.status).toBe(200)
    expect(qboManager).toHaveBeenCalledOnce()
    expect(readConnectedQboCompany).toHaveBeenCalledExactlyOnceWith(true)
    expect(qboManager.mock.invocationCallOrder[0]).toBeLessThan(
      readConnectedQboCompany.mock.invocationCallOrder[0])
    const body = await response.json()
    expect(body).toEqual({ connected:true,refreshed:true,company:{
      realmId:'123456789',companyName:'Eminat Medical Center LLC',legalName:null,
    } })
    expect(JSON.stringify(body)).not.toMatch(/accessToken|refreshToken|ciphertext/)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })

  it('does not touch the token vault when the caller lacks manager access',async () => {
    qboManager.mockRejectedValueOnce(new NativeSalesAuthError(403,'QBO_CONNECTION_FORBIDDEN'))
    const response = await POST(request())
    expect(response.status).toBe(403)
    expect(readConnectedQboCompany).not.toHaveBeenCalled()
  })
})
