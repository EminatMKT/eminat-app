import { salesExtendedRead } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: { params: { parts: string[] } }) {
  return salesExtendedRead(request, params.parts)
}
