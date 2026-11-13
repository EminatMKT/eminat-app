import { ESTADO } from '@/shared/constants/domain'
import { esResponsable } from '@/features/tasks/utils/responsables'
import type { WorkItem } from '../types'

export default function inProgressCount(work: WorkItem[], userId: string): number {
  const isOwnInProgress = (item: WorkItem) =>
    esResponsable(item, userId) && item.estado === ESTADO.EN_PROCESO

  return work.filter(isOwnInProgress).length
}

// How many activities a roster member is responsible for that are in progress: the workload
// figure the card footer shows. Responsibility follows the tasks module's esResponsable.
