import 'server-only'

export type SalesStageObserver = (stage: string, milliseconds: number) => void

/** Request-local measurements only. No identities, records, tokens, or cache. */
export async function measureSalesStage<T>(observer: SalesStageObserver | undefined,
  stage: string, operation: () => PromiseLike<T>): Promise<T> {
  if (!observer) return operation()
  const started = performance.now()
  try { return await operation() }
  finally { observer(stage, performance.now() - started) }
}

/** Opt-in protected Preview diagnostics; Production responses stay unchanged. */
export function salesPerformanceAudit() {
  const enabled = process.env.VERCEL_ENV === 'preview' && process.env.SALES_PERFORMANCE_AUDIT === '1'
  const started = performance.now()
  const stages: { stage: string; milliseconds: number }[] = []
  const observe: SalesStageObserver | undefined = enabled
    ? (stage, milliseconds) => { stages.push({ stage, milliseconds }) } : undefined
  return {
    observe,
    headers(): Record<string, string> {
      return { 'Cache-Control': 'no-store', ...(enabled ? {
        'Server-Timing': [...stages, { stage: 'server_total', milliseconds: performance.now() - started }]
          .map(row => `${row.stage};dur=${row.milliseconds.toFixed(2)}`).join(', '),
      } : {}) }
    },
  }
}
