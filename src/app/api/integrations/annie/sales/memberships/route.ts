import { salesPaidMembershipCreate } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return salesPaidMembershipCreate(request)
}
