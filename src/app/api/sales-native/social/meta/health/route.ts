import { nativeSalesErrorResponse,resolveSalesActor } from '@/server/sales-native/auth'
import { checkMetaConnectionHealth } from '@/server/sales-native/social/meta-connection'
import { readMetaInput } from '@/server/sales-native/social/input'
export const dynamic='force-dynamic'
export const runtime='nodejs'
export async function POST(request:Request){
 try{
  const actor=await resolveSalesActor(request)
  const data=await checkMetaConnectionHealth(actor,await readMetaInput(request))
  return Response.json({data},{headers:{'Cache-Control':'no-store'}})
 }catch(error){return nativeSalesErrorResponse(error)}
}
