import { supabase } from '@/shared/db/supabase'
import { auditSalesInitialRequest } from './performance-audit'

/** Shared "get session -> Authorization (+ optional org) header -> fetch -> parse ->
 * throw on !ok" primitive for callers that don't need If-Match/Idempotency-Key.
 * `NativeSalesModule.tsx` keeps its own copy: it also needs those two headers and a
 * slightly different response/error shape its own callers already depend on, so
 * converging it here was judged riskier than the duplication it would remove
 * (PR #209 review finding #9). */
export async function sessionFetch(path: string, options: { method?: 'GET' | 'POST' | 'PATCH';
  payload?: Record<string, unknown>; organizationId?: string } = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('AUTHENTICATION_REQUIRED')
  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}` }
  if (options.organizationId) headers['X-Sales-Organization-Id'] = options.organizationId
  if (options.payload) headers['Content-Type'] = 'application/json'
  const started = performance.now()
  const response = await fetch(`/api/sales-native/${path}`, { cache: 'no-store', method: options.method ?? 'GET',
    headers, body: options.payload ? JSON.stringify(options.payload) : undefined })
  const body = await response.json().catch(() => null) as Record<string, unknown> | null
  auditSalesInitialRequest(path, response, body, started)
  if (!response.ok) throw new Error((body?.code as string | undefined) || 'META_CONNECTION_UNAVAILABLE')
  return body ?? {}
}
