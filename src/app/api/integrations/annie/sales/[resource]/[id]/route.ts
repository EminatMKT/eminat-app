import { isSalesResource, salesAccountWrite, salesContactWrite, salesLeadWrite, salesOpportunityWrite, salesRead } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request, { params }: { params: { resource: string; id: string } }) {
  if (!isSalesResource(params.resource) || params.resource === 'dashboard') return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  return salesRead(request, params.resource, params.id)
}
export async function PATCH(request: Request, { params }: { params: { resource: string; id: string } }) {
  if (params.resource === 'opportunities') return salesOpportunityWrite(request, 'edit', params.id)
  if (params.resource === 'accounts') return salesAccountWrite(request, 'edit', params.id)
  if (params.resource === 'contacts') return salesContactWrite(request, 'edit', params.id)
  if (params.resource !== 'leads') return Response.json({ code: 'NOT_FOUND' }, { status: 404 })
  return salesLeadWrite(request, 'edit', params.id)
}
