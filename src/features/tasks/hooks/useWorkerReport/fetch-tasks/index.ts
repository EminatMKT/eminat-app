import type { Row } from '@/features/tasks/components/reporte/WorkerReport/types'
import { FETCH_FAILED_MESSAGE, REPORT_ENDPOINT_BASE } from '../constants'

function buildReportUrl(month: string): string {
  const url = `${REPORT_ENDPOINT_BASE}?month=${encodeURIComponent(month)}`

  return url
}

async function reportErrorFrom(response: Response): Promise<string> {
  const body = await response.json()

  return body.error || FETCH_FAILED_MESSAGE
}

async function throwIfFailed(response: Response): Promise<void> {
  if (response.ok) return
  const message = await reportErrorFrom(response)

  throw new Error(message)
}

async function fetchReportBody(month: string, signal: AbortSignal) {
  const requestInit: RequestInit = { signal }
  const response = await fetch(buildReportUrl(month), requestInit)

  await throwIfFailed(response)

  return response.json()
}

export default async function fetchWorkerTasks(
  month: string,
  signal: AbortSignal,
): Promise<Row[]> {
  const body = await fetchReportBody(month, signal)

  return body.tasks
}

// Fetches this worker's own report rows for the given month, raising the server's error
// message (or the fallback) on failure; the caller's effect owns the AbortController.
