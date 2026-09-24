import { NextResponse } from 'next/server'

const ALLOWED_ORIGIN = 'https://meet.stratixsolutions.us'
export function withMeetCors(response: NextResponse, request?: Request): NextResponse {
  const origin = request?.headers.get('origin')
  if (!origin || origin === ALLOWED_ORIGIN) {
    response.headers.set('Access-Control-Allow-Origin', origin || ALLOWED_ORIGIN)
    response.headers.set('Vary', 'Origin')
  }
  response.headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS')
  return response
}
export const apiJson = (request: Request, body: unknown, status = 200) => withMeetCors(NextResponse.json(body, { status }), request)
export const apiError = (request: Request, status: number, code: string, message: string, extra?: object) => apiJson(request, { error: { code, message, ...extra } }, status)
export const optionsResponse = (request: Request) => withMeetCors(new NextResponse(null, { status: 204 }), request)
