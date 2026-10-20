import { salesContactHistory } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { id: string } }) {
  return salesContactHistory(request, params.id)
}
