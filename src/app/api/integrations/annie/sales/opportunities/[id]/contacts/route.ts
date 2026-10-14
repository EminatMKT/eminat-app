import { salesOpportunityRelated } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return salesOpportunityRelated(request, params.id, 'contacts')
}
