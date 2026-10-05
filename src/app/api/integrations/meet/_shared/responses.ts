import { NextResponse } from 'next/server'
import MEET_ERRORS from './errors'
import type { MeetError } from './errors/types'
import type { AuthResult } from './auth'

const ALLOWED_ORIGIN = 'https://meet.stratixsolutions.us'
const HEADER = {
  origin: 'origin',
  allowOrigin: 'Access-Control-Allow-Origin',
  allowHeaders: 'Access-Control-Allow-Headers',
  allowMethods: 'Access-Control-Allow-Methods',
  vary: 'Vary',
} as const
const VARY_BY_ORIGIN = 'Origin'
const ALLOWED_HEADERS = 'Authorization, Content-Type'
const ALLOWED_METHODS = 'GET, POST, PATCH, OPTIONS'
const NO_CONTENT = { status: 204 }

export function withMeetCors(response: NextResponse, request?: Request): NextResponse {
  const origin = request?.headers.get(HEADER.origin)
  if (!origin || origin === ALLOWED_ORIGIN) {
    response.headers.set(HEADER.allowOrigin, origin || ALLOWED_ORIGIN)
    response.headers.set(HEADER.vary, VARY_BY_ORIGIN)
  }
  response.headers.set(HEADER.allowHeaders, ALLOWED_HEADERS)
  response.headers.set(HEADER.allowMethods, ALLOWED_METHODS)
  return response
}
export const apiJson = (request: Request, body: unknown, status = 200) => withMeetCors(NextResponse.json(body, { status }), request)
export const apiError = (request: Request, status: number, code: string, message: string, extra?: object) => apiJson(request, { error: { code, message, ...extra } }, status)
/** Answers a failure, filling whatever it lacks from `fallback` (a generic task error by default). */
export const apiFailure = (request: Request, failure: Partial<MeetError>, fallback: MeetError = MEET_ERRORS.taskError, extra?: object) =>
  apiError(request, failure.status ?? fallback.status, failure.code ?? fallback.code, failure.message ?? fallback.message, extra)
/** Answers a failed `requireMeetTaskActor`, defaulting to 401 unauthenticated. */
export const apiAuthFailure = (request: Request, { status, error }: AuthResult) => {
  const failure: Partial<MeetError> = { status, message: error }
  return apiFailure(request, failure, MEET_ERRORS.unauthenticated)
}
/** Answers a rejected body with the first validation issue, defaulting to a generic invalid payload. */
export const apiInvalidPayload = (request: Request, issueMessage?: string) => {
  const failure: Partial<MeetError> = { message: issueMessage }
  return apiFailure(request, failure, MEET_ERRORS.invalidPayload)
}
export const optionsResponse = (request: Request) => withMeetCors(new NextResponse(null, NO_CONTENT), request)
