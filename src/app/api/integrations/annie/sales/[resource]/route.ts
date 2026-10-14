import { isSalesResource, salesRead } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { resource: string } }) {
  if (!isSalesResource(params.resource)) return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  return salesRead(request, params.resource)
}
