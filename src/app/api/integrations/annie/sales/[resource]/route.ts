import { isSalesResource, salesContactWrite, salesLeadWrite, salesRead } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { resource: string } }) {
  if (!isSalesResource(params.resource)) return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  return salesRead(request, params.resource)
}
export async function POST(request: Request, { params }: { params: { resource: string } }) {
  if (params.resource === 'contacts') return salesContactWrite(request, 'create')
  if (params.resource !== 'leads') return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  return salesLeadWrite(request, 'create')
}
