import { supabase } from '@/shared/db/supabase'
import type { CanonicalTaskList, CanonicalTaskRecord, TaskCreateInput, TaskUpdateInput } from '@/features/meet/lib/types'

const TASK_API = '/api/integrations/meet'

export class TaskApiError extends Error {
  constructor(message: string, public status: number, public code: string, public current?: CanonicalTaskRecord) {
    super(message)
    this.name = 'TaskApiError'
  }
}

export function isTaskConflict(error: unknown): error is TaskApiError & { current: CanonicalTaskRecord } {
  return error instanceof TaskApiError &&
    error.status === 409 &&
    error.code === 'TASK_CONFLICT' &&
    Boolean(error.current)
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new TaskApiError('La sesión expiró.', 401, 'NO_SESSION')
  const response = await fetch(`${TASK_API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  })
  const body = await response.json().catch(() => ({}))
  if (response.ok === false) throw new TaskApiError(body.error?.message ?? 'Error de TASK.', response.status, body.error?.code ?? 'TASK_API_ERROR', body.error?.current)
  return body as T
}

export const getTask = async (id: string) => (await request<{ task: CanonicalTaskRecord }>(`/tasks/${id}`)).task
export const getTasks = (ids: string[]) => Promise.all(Array.from(new Set(ids)).map(getTask))
export const listTasks = () => request<CanonicalTaskList>('/tasks')
export const createTask = async (input: TaskCreateInput) => (await request<{ task: CanonicalTaskRecord; idempotent: boolean }>('/tasks', { method: 'POST', body: JSON.stringify(input) })).task
export const updateTask = async (id: string, input: TaskUpdateInput) => (await request<{ task: CanonicalTaskRecord }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) })).task

export async function getTaskAssignees() {
  return request<{ assignees: { id: string; nombre: string; equipo: CanonicalTaskRecord['equipo']; departamento: CanonicalTaskRecord['departamento'] }[] }>('/task-assignees')
}

export async function getTaskCatalogs() {
  return request<{
    companies: { id: string; codigo: string; nombre: string }[]
    departments: { id: string; codigo: string; nombre: string }[]
    teams: { id: string; codigo: string; nombre: string; departamento_id: string; activo: boolean }[]
    states: string[]
  }>('/task-catalogs')
}
