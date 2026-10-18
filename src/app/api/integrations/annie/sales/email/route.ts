import { salesIndividualEmail } from '@/server/integrations/annie/sales'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) { return salesIndividualEmail(request, 'list') }
export async function POST(request: Request) { return salesIndividualEmail(request, 'create') }
