import { salesRecordInteractions } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'
type Context = { params: { resource: string; id: string } }
export async function GET(request: Request, { params }: Context) {
  return salesRecordInteractions(request, params.resource, params.id)
}
export async function POST(request: Request, { params }: Context) {
  return salesRecordInteractions(request, params.resource, params.id)
}
