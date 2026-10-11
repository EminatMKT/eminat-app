import type { TaskUpdateInput } from '@/features/meet/lib/types'

export function toTaskUpdateInput(input: Record<string, unknown>, expectedUpdatedAt: string) {
  const titulo = typeof input.titulo === 'string' ? input.titulo.trim() : ''
  if (!titulo) return { ok: false as const, error: 'El título es obligatorio.' }
  const value: TaskUpdateInput = {
    expected_updated_at: expectedUpdatedAt,
    titulo,
    descripcion: typeof input.descripcion === 'string' && input.descripcion.trim() ? input.descripcion.trim() : null,
    responsable_id: String(input.responsable_id || ''),
    fecha_entrega: typeof input.fecha_entrega === 'string' && input.fecha_entrega ? input.fecha_entrega : null,
    empresa: typeof input.empresa === 'string' ? input.empresa.trim() : '',
  }
  if (!value.responsable_id) return { ok: false as const, error: 'El responsable es obligatorio.' }
  if (!value.empresa) return { ok: false as const, error: 'La empresa es obligatoria.' }
  return { ok: true as const, value }
}
