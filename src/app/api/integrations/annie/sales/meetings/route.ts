import { salesMeetingWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) { return salesMeetingWrite(request, 'create') }
