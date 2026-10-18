import { salesDemoMembershipCreate } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  return salesDemoMembershipCreate(request)
}
