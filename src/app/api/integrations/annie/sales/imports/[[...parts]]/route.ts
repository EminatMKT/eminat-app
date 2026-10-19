import { salesImportRequest } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

type Context = { params: { parts?: string[] } }
export async function GET(request: Request, { params }: Context) {
  return salesImportRequest(request, params.parts ?? [])
}
export async function POST(request: Request, { params }: Context) {
  return salesImportRequest(request, params.parts ?? [])
}
