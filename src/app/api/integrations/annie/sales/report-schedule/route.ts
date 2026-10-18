import { salesReportScheduleConfig } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) { return salesReportScheduleConfig(request) }
export async function PATCH(request: Request) { return salesReportScheduleConfig(request) }
