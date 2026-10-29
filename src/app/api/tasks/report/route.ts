import { NextRequest, NextResponse } from 'next/server'
import { readProductionReport } from '@/server/tasks/reports/read'

export async function GET(req: NextRequest) {
  const result = await readProductionReport(req)
  return NextResponse.json(result.error ? { error: result.error } : result.data,
    { status: result.status, headers: { 'Cache-Control': 'private, no-store' } })
}
