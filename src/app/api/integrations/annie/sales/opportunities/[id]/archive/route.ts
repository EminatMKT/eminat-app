import { salesOpportunityWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return salesOpportunityWrite(request, 'archive', params.id)
}
