import { salesFamilyMemberRequest } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { membershipId: string } }) {
  return salesFamilyMemberRequest(request, params.membershipId)
}

export async function POST(request: Request, { params }: { params: { membershipId: string } }) {
  return salesFamilyMemberRequest(request, params.membershipId)
}
