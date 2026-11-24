import {timingSafeEqual} from 'node:crypto'
import {complimentaryEnabled,complimentaryResponse as respond} from '@/server/sales-native/complimentary'
import {processComplimentaryNotifications} from '@/server/sales-native/complimentary-notifications'
export const dynamic='force-dynamic'
export async function POST(request:Request){
 const secret=process.env.LILLY_COMPLIMENTARY_WORKER_SECRET??'',expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(request.headers.get('authorization')??'')
 if(!complimentaryEnabled())return respond({code:'NOT_FOUND'},404)
 if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return respond({code:'UNAUTHORIZED'},401)
 try{return respond(await processComplimentaryNotifications())}catch{return respond({code:'COMPLIMENTARY_UNAVAILABLE'},503)}
}
