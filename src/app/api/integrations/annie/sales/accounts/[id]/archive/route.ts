import { salesAccountWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return salesAccountWrite(request, 'archive', params.id)
}
