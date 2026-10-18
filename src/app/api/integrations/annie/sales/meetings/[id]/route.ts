import { salesMeetingWrite } from '@/server/integrations/annie/sales'
export const dynamic = 'force-dynamic'
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  return salesMeetingWrite(request, 'edit', params.id)
}
