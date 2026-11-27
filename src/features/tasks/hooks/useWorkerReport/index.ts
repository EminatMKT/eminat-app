import { useState } from 'react'
import { localMonth } from '@/shared/utils'
import type { Usuario } from '@/shared/context/loadAppData'
import useFetchState from './use-fetch-state'
import printWorkerTasks from './print-tasks'
import type { Translate } from './types'

function buildPrintContext(month: string, intlLocale: string, t: Translate) {
  return { mes: month, intlLocale, t }
}

function buildHandlePrint(
  tasks: Parameters<typeof printWorkerTasks>[0],
  usuario: Usuario | null,
  ctx: Parameters<typeof printWorkerTasks>[2],
) {
  return () => printWorkerTasks(tasks, usuario, ctx)
}

export default function useWorkerReport(
  usuario: Usuario | null,
  intlLocale: string,
  t: Translate,
) {
  const [month, setMonth] = useState(localMonth)
  const fetchState = useFetchState(usuario?.id, month)
  const ctx = buildPrintContext(month, intlLocale, t)
  const handlePrint = buildHandlePrint(fetchState.tasks, usuario, ctx)
  const period = { month, setMonth }

  return { period, report: fetchState, handlePrint }
}

// Loads the signed-in worker's own report rows for the selected month and builds the print
// handler for them; `useFetchState` owns the fetch effect, `printWorkerTasks` the print call.
