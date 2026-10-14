import { salesDirectory } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return salesDirectory(request) }
