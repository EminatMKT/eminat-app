import { salesContactAccountLinks } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return salesContactAccountLinks(request, params.id)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return salesContactAccountLinks(request, params.id)
}
