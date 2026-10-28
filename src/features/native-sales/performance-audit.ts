/** Preview-only aggregate diagnostics. Never log records, query values or headers. */
export function auditSalesInitialRequest(path: string, response: Response, result: unknown, started: number) {
  if (process.env.NEXT_PUBLIC_SALES_PERFORMANCE_AUDIT !== '1' ||
      !['access', 'directory', 'reports/summary', 'bootstrap'].includes(path.split('?')[0])) return
  console.info('[sales-initial-load]', JSON.stringify({
    path: path.split('?')[0], status: response.status,
    durationMs: Math.round((performance.now() - started) * 100) / 100,
    payloadBytes: new TextEncoder().encode(JSON.stringify(result) ?? '').byteLength,
    serverTiming: response.headers.get('Server-Timing'),
  }))
}
