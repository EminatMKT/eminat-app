'use client'
import { useT } from '@/shared/i18n'
import { estadoLabel } from '@/shared/constants/domain'
import { NAME_FALLBACK } from '@/features/tasks/hooks/useWorkerReport/constants'
import type { Row } from '../WorkerReport/types'
import s from './index.module.css'

type Props = {
  task: Row
}

/** One row of the worker's own report table: title, company, translated status, deadline. */
export default function WorkerTableRow({ task }: Props) {
  const { t } = useT()

  return <tr>
    <td className={s.cell}>{task.titulo}</td>
    <td className={s.cell}>{task.empresa}</td>
    <td className={s.cell}>{estadoLabel(task.estado, t)}</td>
    <td className={s.cell}>{task.fecha_entrega || NAME_FALLBACK}</td>
  </tr>
}

// Worker report table row: four read-only cells per task, no hours or payment data — pulled
// out of WorkerReport's inline `.map()` so the row has its own file and its own test.
