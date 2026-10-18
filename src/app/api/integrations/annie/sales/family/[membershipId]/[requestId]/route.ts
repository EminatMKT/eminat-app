import { salesFamilyMemberRequest } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function PATCH(request: Request, { params }: {
  params: { membershipId: string; requestId: string }
}) {
  return salesFamilyMemberRequest(request, params.membershipId, params.requestId)
}
