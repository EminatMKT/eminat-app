import { NativeSalesAuthError } from '@/server/sales-native/auth'
import { DEFAULT_META_RETURN_PATH, KNOWN_META_RETURN_PATHS } from '@/server/sales-native/social/connection-policy'
import { nativeSalesEnabled } from '@/server/sales-native/release-gate'
import { exchangeMetaConnection, metaCallbackContext, metaDeployment } from '@/server/sales-native/social/meta-connection'
import ssrClient from '@/shared/db/requireAccess/ssrClient'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
function back(origin:string, path:string, reason?:string, state?:string) {
 const url=new URL(path,origin)
 // Validate against the same allowlist metaReturnPath()/resolveMetaEntryPath() use, not a
 // single hardcoded path — otherwise a connection started from Settings 400s on return
 // instead of landing back there (PR #209 review finding #2 regression, caught in review).
 if(url.origin!==origin || !KNOWN_META_RETURN_PATHS.includes(url.pathname))
  return new Response(null,{status:400,headers:{'Cache-Control':'no-store'}})
 if(reason)url.searchParams.set('metaError',reason)
 if(state)url.searchParams.set('metaState',state)
 return new Response(null,{status:303,headers:{Location:url.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
}
export async function GET(request:Request) {
 let origin:string
 try{origin=metaDeployment(request).origin}catch{
  return Response.json({error:'META_DEPLOYMENT_ISOLATION_REQUIRED'},{status:503,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}})
 }
 const fallback=DEFAULT_META_RETURN_PATH
 if(!nativeSalesEnabled())return back(origin,fallback,'META_NOT_ACTIVE')
 const params=new URL(request.url).searchParams
 const state=params.get('state') ?? ''
 const {data:{session}}=await ssrClient().auth.getSession()
 if(!session?.access_token)return back(origin,fallback,'AUTHENTICATION_REQUIRED')
 let path=fallback
 try{
  path=await metaCallbackContext(state,session.access_token)
  const code=params.get('code')
  if(!code || params.has('error'))return back(origin,path,'META_AUTHORIZATION_DENIED')
  const result=await exchangeMetaConnection(state,code,session.access_token)
  return back(origin,result.returnPath,undefined,state)
 }catch(cause){
  // Only the provider-reported permission outcome is specific enough to be worth telling
  // apart from a generic failure (PR #209 review finding #5) — everything else still
  // collapses to the one generic reason the client already renders a message for.
  const reason=cause instanceof NativeSalesAuthError && cause.code==='META_PERMISSION_UNAVAILABLE'
   ? cause.code : 'META_CONNECTION_UNAVAILABLE'
  return back(origin,path,reason)
 }
}
