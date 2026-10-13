import { salesRead } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return salesRead(request, 'pipeline') }
