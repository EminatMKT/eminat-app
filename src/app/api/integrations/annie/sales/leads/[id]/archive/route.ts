import { salesLeadWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return salesLeadWrite(request, 'archive', params.id)
}
