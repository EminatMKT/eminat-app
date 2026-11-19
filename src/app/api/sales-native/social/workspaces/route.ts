import { nativeSalesErrorResponse, resolveSalesOrganizations } from '@/server/sales-native/auth'
import { metaAdministrationOrganizations } from '@/features/native-sales/meta-navigation'
export const dynamic = 'force-dynamic'
/** Identity-scoped discovery only; each connection request independently resolves its actor. */
export async function GET(request:Request) {
  try {
    const organizations=metaAdministrationOrganizations(await resolveSalesOrganizations(request))
    return Response.json({data:organizations.map(({organizationId,name})=>({organizationId,name}))},
      {headers:{'Cache-Control':'no-store'}})
  } catch(error){return nativeSalesErrorResponse(error)}
}
