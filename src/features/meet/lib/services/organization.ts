import { classifyServiceError, type ServiceResult } from '@/features/meet/lib/services/errors'
import { getTaskAssignees, getTaskCatalogs } from '@/features/meet/lib/services/task-api'
import type { TaskOrganization } from '@/features/meet/lib/types'

export async function getTaskOrganization(): Promise<ServiceResult<TaskOrganization>> {
  try {
    const [catalogs, assigneeResponse] = await Promise.all([
      getTaskCatalogs(),
      getTaskAssignees(),
    ])
    const assignees = assigneeResponse.assignees.map((item) => ({
      id: item.id,
      nombre_display: item.nombre,
      nombre: null,
      apellido: null,
      activo: true as const,
      equipo_id: item.equipo?.id ?? null,
      equipo: item.equipo
        ? { ...item.equipo, departamento_id: item.departamento?.id ?? '' , activo: true }
        : null,
      departamento: item.departamento,
    }))
    return {
      ok: true,
      data: {
        companies: catalogs.companies,
        departments: catalogs.departments,
        teams: catalogs.teams,
        users: assignees,
        assignees,
      },
    }
  } catch (error) {
    return { ok: false, error: classifyServiceError(error) }
  }
}
