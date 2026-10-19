import { timingSafeEqual } from 'node:crypto'
import { processNativeSalesReports } from '@/server/sales-native/report-delivery'

export const dynamic='force-dynamic'

export async function GET(request:Request) {
  const configured=process.env.CRON_SECRET ?? ''
  const authorization=request.headers.get('authorization') ?? ''
  const token=authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const expected=Buffer.from(configured),actual=Buffer.from(token)
  if (!configured || expected.length!==actual.length || !timingSafeEqual(expected,actual))
    return Response.json({code:'NOT_FOUND'},{status:404})
  try {
    const result=await processNativeSalesReports()
    return Response.json(result,{headers:{'Cache-Control':'no-store'}})
  } catch {
    return Response.json({code:'REPORT_PROCESSING_UNAVAILABLE'},{status:503})
  }
}
