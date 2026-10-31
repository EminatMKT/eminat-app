import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { exchangeMetaConnection, metaCallbackContext } from '@/server/sales-native/social/meta-connection'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const origin='https://app.stratixsolutions.us'
function back(path:string, reason?:string, state?:string) {
 const url=new URL(path,origin)
 if(reason)url.searchParams.set('metaError',reason)
 if(state)url.searchParams.set('metaState',state)
 return new Response(null,{status:303,headers:{Location:url.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
}
export async function GET(request:Request) {
 const fallback='/sales-native/integrations/meta'
 if(!nativeSalesEnabled())return back(fallback,'META_NOT_ACTIVE')
 const params=new URL(request.url).searchParams
 const state=params.get('state') ?? ''
 const {data:{session}}=await ssrClient().auth.getSession()
 if(!session?.access_token)return back(fallback,'AUTHENTICATION_REQUIRED')
 let path=fallback
 try{
  path=await metaCallbackContext(state,session.access_token)
  const code=params.get('code')
  if(!code || params.has('error'))return back(path,'META_AUTHORIZATION_DENIED')
  const result=await exchangeMetaConnection(state,code,session.access_token)
  return back(result.returnPath,undefined,state)
 }catch{return back(path,'META_CONNECTION_UNAVAILABLE')}
}
