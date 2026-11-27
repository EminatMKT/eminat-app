import printWorkerReport from '@/features/tasks/components/reporte/WorkerReport/print'
import type { Usuario } from '@/shared/context/loadAppData'
import type { ReportRows, ReportContext } from './types'
import { NAME_FALLBACK } from '../constants'

export default function printWorkerTasks(
  tasks: ReportRows,
  usuario: Usuario | null | undefined,
  ctx: ReportContext,
): void {
  if (!usuario?.id) return
  const author = { id: usuario.id, nombre: usuario.nombre || NAME_FALLBACK }

  printWorkerReport(tasks, author, ctx)
}

// Prints just the signed-in worker's own rows; no-ops without a signed-in user id, mirroring
// the self-scoped boundary fetch-tasks enforces on the same report.
