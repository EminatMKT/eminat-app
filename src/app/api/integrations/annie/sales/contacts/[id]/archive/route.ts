import { salesContactWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function POST(request: Request, { params }: { params: { id: string } }) {
  return salesContactWrite(request, 'archive', params.id)
}
